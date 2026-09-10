import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Param, Patch, Post } from '@nestjs/common';
import { IsArray, IsEnum, IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';
import { PrismaService } from './prisma.service';
import { CertificatesService } from './certificates.service';
import { PaymentsService } from './payments.service';
import { NotificationsService } from './notifications.service';
import { IntegrationsService } from './integrations.service';
import { CurrentUser } from './tenant.decorator';
import { AuthUser } from './auth.types';
import { Roles } from './roles.decorator';
import { ACTIVE_STATUSES, INSTRUMENT_CATEGORY_CODES } from './instrument-categories';

function applicationScope(user: AuthUser) {
  const roles = new Set(user.roles.map((role) => role.toUpperCase()));
  if (roles.has('CENTRAL_ADMIN')) return {};
  if (['STATE_ADMIN', 'LMO', 'GATC'].some((role) => roles.has(role))) return { applicant: { stateCode: user.stateCode } };
  return { applicant: { email: user.email } };
}

class PaymentDto { @IsString() idempotencyKey!: string; }

class CreateApplicationDto {
  @IsString() applicantId!: string;
  @IsIn(INSTRUMENT_CATEGORY_CODES) category!: string;
  @IsString() @Length(3, 100) serialNo!: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsObject() specs?: Record<string, unknown>;
}
class StatusDto { @IsEnum(['SUBMITTED','UNDER_REVIEW','SCHEDULED','REJECTED']) status!: any; }
class ScheduleDto { @IsString() officerId!: string; @IsString() scheduledAt!: string; }
class VerifyDto { @IsString() officerId!: string; @IsEnum(['PASS','FAIL']) result!: any; @IsObject() observations!: Record<string, unknown>; @IsOptional() @IsArray() photos?: string[]; @IsOptional() @IsString() signatureObjectKey?: string; }

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly prisma: PrismaService, private readonly certificates: CertificatesService, private readonly payments: PaymentsService, private readonly notifications: NotificationsService, private readonly integrations: IntegrationsService) {}

  @Post()
  async create(@Body() dto: CreateApplicationDto) {
    const applicant = await this.prisma.stakeholder.findUnique({ where: { id: dto.applicantId } });
    if (!applicant) throw new BadRequestException('Unknown applicant');
    if (!['CONSUMER', 'BUSINESS'].includes(applicant.role)) throw new BadRequestException('Only business or consumer stakeholders can submit applications');
    if (applicant.kycStatus !== 'VERIFIED') throw new BadRequestException('Applicant KYC must be verified before submitting an application');

    const instrument = await this.prisma.instrument.upsert({
      where: { ownerId_serialNo: { ownerId: dto.applicantId, serialNo: dto.serialNo } },
      update: { category: dto.category, model: dto.model, specs: dto.specs as any },
      create: { ownerId: dto.applicantId, category: dto.category, serialNo: dto.serialNo, model: dto.model, specs: dto.specs as any },
    });

    const existingActive = await this.prisma.application.findFirst({ where: { instrumentId: instrument.id, status: { in: ACTIVE_STATUSES as any } } });
    if (existingActive) throw new ConflictException('An active application already exists for this instrument');

    const feeAmount = await this.payments.getFee(dto.category);
    return this.prisma.application.create({ data: { applicantId: dto.applicantId, instrumentId: instrument.id, feeAmount, status: 'SUBMITTED', submittedAt: new Date() }, include: { instrument: true } });
  }

  @Get()
  list(@CurrentUser() user: AuthUser) { return this.prisma.application.findMany({ where: applicationScope(user), include: { instrument: true, applicant: true, verifications: true, payments: true }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const application = await this.prisma.application.findUniqueOrThrow({ where: { id }, include: { instrument: true, applicant: true, verifications: { include: { certificate: true } }, payments: true } });
    const roles = new Set(user.roles.map((role) => role.toUpperCase()));
    if (!roles.has('CENTRAL_ADMIN')) {
      const inState = ['STATE_ADMIN', 'LMO', 'GATC'].some((role) => roles.has(role)) && application.applicant.stateCode === user.stateCode;
      const isOwner = application.applicant.email === user.email;
      if (!inState && !isOwner) throw new ForbiddenException('Application is outside your access scope');
    }
    return application;
  }
  @Patch(':id/status')
  status(@Param('id') id: string, @Body() dto: StatusDto) { return this.prisma.application.update({ where: { id }, data: { status: dto.status } }); }

  @Post(':id/schedule')
  @Roles('STATE_ADMIN', 'CENTRAL_ADMIN')
  async schedule(@Param('id') id: string, @Body() dto: ScheduleDto, @CurrentUser() user: AuthUser) {
    const scheduledAt = new Date(dto.scheduledAt);
    const application = await this.prisma.application.update({ where: { id }, data: { status: 'SCHEDULED', assignedOfficerId: dto.officerId, scheduledAt }, include: { applicant: true } });

    await this.prisma.auditLog.create({
      data: { actorId: user.sub, action: 'APPLICATION_SCHEDULED', entityType: 'application', entityId: id, metadata: { officerId: dto.officerId, scheduledAt: scheduledAt.toISOString() } },
    });

    const recipient = application.applicant.email ?? application.applicant.phone;
    if (recipient) {
      await this.notifications.queue({
        templateId: 'APPOINTMENT_SCHEDULED',
        channel: application.applicant.email ? 'EMAIL' : 'SMS',
        recipient,
        params: { applicationId: id, scheduledAt: scheduledAt.toISOString() },
        stakeholderId: application.applicant.id,
        applicationId: id,
      });
    }

    return application;
  }

  @Post(':id/verify')
  @Roles('LMO', 'GATC')
  async verify(@Param('id') id: string, @Body() dto: VerifyDto) {
    const application = await this.prisma.application.findUniqueOrThrow({ where: { id }, include: { applicant: true } });
    const result = await this.prisma.verificationRecord.create({
      data: {
        applicationId: id,
        officerId: dto.officerId,
        result: dto.result,
        observations: dto.observations as any,
        photos: dto.photos ?? [],
        signatureObjectKey: dto.signatureObjectKey,
        signedAt: dto.signatureObjectKey ? new Date() : undefined,
      },
    });
    await this.prisma.application.update({ where: { id }, data: { status: dto.result === 'PASS' ? 'VERIFICATION_PASSED' : 'VERIFICATION_FAILED' } });
    await this.prisma.auditLog.create({
      data: { actorId: dto.officerId, action: 'VERIFICATION_RECORDED', entityType: 'verification', entityId: result.id, metadata: { applicationId: id, result: dto.result, signed: Boolean(dto.signatureObjectKey) } },
    });
    const recipient = application.applicant.email ?? application.applicant.phone;
    if (dto.result === 'PASS') {
      const certificate = await this.certificates.issue(result.id, id, dto.officerId);
      await this.prisma.application.update({ where: { id }, data: { status: 'CERTIFICATE_ISSUED' } });
      if (recipient) {
        await this.notifications.queue({
          templateId: 'CERTIFICATE_ISSUED',
          channel: application.applicant.email ? 'EMAIL' : 'SMS',
          recipient,
          params: { certNo: certificate.certNo, validUntil: certificate.validUntil.toDateString() },
          stakeholderId: application.applicant.id,
          applicationId: id,
        });
      }
      await this.integrations.queue('DIGILOCKER', 'certificate', certificate.id, `digilocker-${certificate.id}`, { certNo: certificate.certNo, validUntil: certificate.validUntil.toISOString() });
      await this.integrations.queue('UMANG', 'application', id, `umang-${id}`, { status: 'CERTIFICATE_ISSUED', certNo: certificate.certNo });
      return { verification: result, certificate };
    }
    if (recipient) {
      await this.notifications.queue({
        templateId: 'VERIFICATION_FAILED',
        channel: application.applicant.email ? 'EMAIL' : 'SMS',
        recipient,
        params: { applicationId: id, reason: Object.values(dto.observations ?? {}).join(', ') || 'See inspection report' },
        stakeholderId: application.applicant.id,
        applicationId: id,
      });
    }
    return { verification: result };
  }

  @Post(':id/payment')
  payment(@Param('id') id: string, @Body() dto: PaymentDto) { return this.payments.charge(id, dto.idempotencyKey); }

  @Post(':id/payment/order')
  paymentOrder(@Param('id') id: string, @Body() dto: PaymentDto) { return this.payments.createOrder(id, dto.idempotencyKey); }

  @Get(':id/verification-history')
  async verificationHistory(@Param('id') id: string) {
    const verifications = await this.prisma.verificationRecord.findMany({ where: { applicationId: id }, orderBy: { verifiedAt: 'asc' } });
    const auditLogs = await this.prisma.auditLog.findMany({ where: { entityType: 'verification', entityId: { in: verifications.map((v) => v.id) } }, orderBy: { createdAt: 'asc' } });
    return { verifications, auditLogs };
  }
}

import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

const ALLOWED_DOCUMENT_TYPES = ['KYC_ID', 'KYC_ADDRESS', 'GSTIN_CERTIFICATE', 'UDYAM_CERTIFICATE', 'INSTRUMENT_PHOTO', 'SIGNATURE'];
const ALLOWED_FILE_EXTENSION_PATTERN = /\.(pdf|jpe?g|png)$/i;
import { PrismaService } from './prisma.service';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { CurrentUser } from './tenant.decorator';
import { AuthUser } from './auth.types';
import { assertStateAccess, stateScope } from './tenant.util';
import { GstUdyamProvider } from './gst-udyam-provider.interface';
import { GST_UDYAM_PROVIDER } from './gst-udyam.tokens';
import { AadhaarProvider } from './aadhaar-provider.interface';
import { AADHAAR_PROVIDER } from './aadhaar.tokens';

class CreateStakeholderDto {
  @IsEnum(['CONSUMER','BUSINESS','LMO','GATC','STATE_ADMIN','CENTRAL_ADMIN']) role!: any;
  @IsString() @Length(2, 100) name!: string;
  @IsString() @Length(2, 5) stateCode!: string;
  @IsOptional() @IsString() districtCode?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() gstin?: string;
}
class UpdateProfileDto {
  @IsOptional() @IsString() @Length(2, 100) name?: string;
  @IsOptional() @IsString() @Length(2, 5) stateCode?: string;
  @IsOptional() @IsString() districtCode?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() gstin?: string;
}
class DocumentDto {
  @IsIn(ALLOWED_DOCUMENT_TYPES) documentType!: string;
  @IsString() @MaxLength(255) @Matches(ALLOWED_FILE_EXTENSION_PATTERN, { message: 'Only PDF, JPG, and PNG files are allowed' }) fileName!: string;
  @IsString() objectKey!: string;
}
class NotificationPreferencesDto {
  @IsOptional() @IsBoolean() EMAIL?: boolean;
  @IsOptional() @IsBoolean() SMS?: boolean;
  @IsOptional() @IsBoolean() WHATSAPP?: boolean;
  @IsOptional() @IsBoolean() PUSH?: boolean;
}
class VerifyGstinDto { @IsString() gstin!: string; }
class VerifyUdyamDto { @IsString() udyamNumber!: string; }
class AadhaarOtpDto { @IsString() aadhaarLast4!: string; @IsBoolean() consent!: boolean; }
class AadhaarVerifyDto { @IsString() requestId!: string; @IsString() otp!: string; }

@Controller('stakeholders')
export class StakeholdersController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(GST_UDYAM_PROVIDER) private readonly gstUdyam: GstUdyamProvider,
    @Inject(AADHAAR_PROVIDER) private readonly aadhaar: AadhaarProvider,
  ) {}
  @Post()
  @Public()
  create(@Body() dto: CreateStakeholderDto) { return this.prisma.stakeholder.create({ data: { ...dto, kycStatus: 'PENDING' } }); }
  @Get()
  @Roles('STATE_ADMIN', 'CENTRAL_ADMIN')
  list(@CurrentUser() user: AuthUser) { return this.prisma.stakeholder.findMany({ where: stateScope(user), orderBy: { createdAt: 'desc' }, take: 100 }); }
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const stakeholder = user.email ? await this.prisma.stakeholder.findFirst({ where: { email: user.email }, include: { documents: true } }) : null;
    return stakeholder ?? { id: user.sub, name: user.name ?? '', email: user.email, roles: user.roles, stateCode: user.stateCode, districtCode: user.districtCode, kycStatus: 'PENDING', documents: [] };
  }
  @Patch('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    if (!user.email) return { ...dto, id: user.sub, email: user.email };
    const stakeholder = await this.prisma.stakeholder.findFirst({ where: { email: user.email } });
    if (!stakeholder) return this.prisma.stakeholder.create({ data: { role: 'BUSINESS', email: user.email, name: dto.name ?? user.name ?? 'Registered stakeholder', stateCode: dto.stateCode ?? user.stateCode ?? 'DL', districtCode: dto.districtCode, address: dto.address, phone: dto.phone, gstin: dto.gstin } });
    return this.prisma.stakeholder.update({ where: { id: stakeholder.id }, data: dto });
  }
  @Get('me/notification-preferences')
  async getPreferences(@CurrentUser() user: AuthUser) {
    const stakeholder = user.email ? await this.prisma.stakeholder.findFirst({ where: { email: user.email } }) : null;
    return stakeholder?.notificationPreferences ?? { EMAIL: true, SMS: true, WHATSAPP: true, PUSH: true };
  }
  @Patch('me/notification-preferences')
  async setPreferences(@CurrentUser() user: AuthUser, @Body() dto: NotificationPreferencesDto) {
    if (!user.email) return dto;
    const stakeholder = await this.prisma.stakeholder.findFirst({ where: { email: user.email } });
    if (!stakeholder) return dto;
    const merged = { ...(stakeholder.notificationPreferences as Record<string, boolean> | null), ...dto };
    await this.prisma.stakeholder.update({ where: { id: stakeholder.id }, data: { notificationPreferences: merged } });
    return merged;
  }
  @Post('me/verify-gstin')
  async verifyGstin(@CurrentUser() user: AuthUser, @Body() dto: VerifyGstinDto) {
    const result = await this.gstUdyam.verifyGstin(dto.gstin);
    const stakeholder = user.email ? await this.prisma.stakeholder.findFirst({ where: { email: user.email } }) : null;
    if (stakeholder) {
      await this.prisma.auditLog.create({ data: { actorId: stakeholder.id, action: 'GSTIN_VERIFIED', entityType: 'stakeholder', entityId: stakeholder.id, metadata: { gstin: dto.gstin, ...result } } });
    }
    return result;
  }
  @Post('me/verify-udyam')
  async verifyUdyam(@CurrentUser() user: AuthUser, @Body() dto: VerifyUdyamDto) {
    const result = await this.gstUdyam.verifyUdyam(dto.udyamNumber);
    const stakeholder = user.email ? await this.prisma.stakeholder.findFirst({ where: { email: user.email } }) : null;
    if (stakeholder) {
      await this.prisma.auditLog.create({ data: { actorId: stakeholder.id, action: 'UDYAM_VERIFIED', entityType: 'stakeholder', entityId: stakeholder.id, metadata: { udyamNumber: dto.udyamNumber, ...result } } });
    }
    return result;
  }
  @Post('me/aadhaar/otp')
  aadhaarOtp(@Body() dto: AadhaarOtpDto) { return this.aadhaar.initiateOtp(dto.aadhaarLast4, dto.consent); }

  @Post('me/aadhaar/verify')
  async aadhaarVerify(@CurrentUser() user: AuthUser, @Body() dto: AadhaarVerifyDto) {
    const result = await this.aadhaar.verifyOtp(dto.requestId, dto.otp);
    const stakeholder = user.email ? await this.prisma.stakeholder.findFirst({ where: { email: user.email } }) : null;
    if (stakeholder) {
      await this.prisma.auditLog.create({
        data: { actorId: stakeholder.id, action: 'AADHAAR_EKYC_VERIFIED', entityType: 'stakeholder', entityId: stakeholder.id, metadata: { nameMasked: result.nameMasked, dobYear: result.dobYear, addressMasked: result.addressMasked } },
      });
    }
    return result;
  }

  @Post('me/documents')
  async addDocument(@CurrentUser() user: AuthUser, @Body() dto: DocumentDto) {
    const stakeholder = user.email ? await this.prisma.stakeholder.findFirst({ where: { email: user.email } }) : null;
    if (!stakeholder) return { status: 'PENDING', message: 'Complete your profile before uploading documents.' };
    return this.prisma.stakeholderDocument.create({ data: { stakeholderId: stakeholder.id, ...dto } });
  }
  @Post(':id/approve')
  @Roles('STATE_ADMIN', 'CENTRAL_ADMIN')
  async approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const target = await this.prisma.stakeholder.findUniqueOrThrow({ where: { id } });
    assertStateAccess(user, target.stateCode);
    return this.prisma.stakeholder.update({ where: { id }, data: { kycStatus: 'VERIFIED' } });
  }
  @Post(':id/reject')
  @Roles('STATE_ADMIN', 'CENTRAL_ADMIN')
  async reject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const target = await this.prisma.stakeholder.findUniqueOrThrow({ where: { id } });
    assertStateAccess(user, target.stateCode);
    return this.prisma.stakeholder.update({ where: { id }, data: { kycStatus: 'REJECTED' } });
  }
}

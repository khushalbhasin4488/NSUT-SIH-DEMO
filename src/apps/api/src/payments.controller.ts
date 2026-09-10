import { Body, Controller, ForbiddenException, Get, Param, Post, Query } from '@nestjs/common';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from './prisma.service';
import { PaymentsService } from './payments.service';
import { Roles } from './roles.decorator';
import { Public } from './public.decorator';
import { signMockWebhookPayload } from './mock-payment-gateway.provider';
import { CurrentUser } from './tenant.decorator';
import { AuthUser } from './auth.types';

function canAccessApplication(user: AuthUser, applicant: { email: string | null; stateCode: string }) {
  if (user.roles.includes('CENTRAL_ADMIN')) return true;
  if (user.roles.some((role) => ['STATE_ADMIN', 'LMO', 'GATC'].includes(role)) && applicant.stateCode === user.stateCode) return true;
  return Boolean(user.email && applicant.email === user.email);
}

class SetFeeDto {
  @IsString() category!: string;
  @IsOptional() @IsString() serviceType?: string;
  @IsNumber() amount!: number;
}
class WebhookDto { @IsString() orderId!: string; @IsString() paymentId!: string; @IsEnum(['SUCCESS', 'FAILED']) status!: 'SUCCESS' | 'FAILED'; @IsString() signature!: string; }
class SimulateWebhookDto { @IsEnum(['SUCCESS', 'FAILED']) status!: 'SUCCESS' | 'FAILED'; }

@Controller('payments')
export class PaymentsController {
  constructor(private readonly prisma: PrismaService, private readonly payments: PaymentsService) {}

  @Get('fee-config')
  listFees() { return this.prisma.feeConfig.findMany({ orderBy: { category: 'asc' } }); }

  @Post('fee-config')
  setFee(@Body() dto: SetFeeDto) { return this.payments.setFee(dto.category, dto.serviceType ?? 'VERIFICATION', dto.amount); }

  @Get(':id/receipt')
  async receipt(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id }, include: { application: { include: { instrument: true, applicant: true } } } });
    if (!canAccessApplication(user, payment.application.applicant)) throw new ForbiddenException('Payment is outside your access scope');
    return payment;
  }

  @Get(':id/audit-trail')
  @Roles('STATE_ADMIN', 'CENTRAL_ADMIN')
  auditTrail(@Param('id') id: string) { return this.prisma.auditLog.findMany({ where: { entityType: 'payment', entityId: id }, orderBy: { createdAt: 'asc' } }); }

  @Get('reconciliation')
  @Roles('STATE_ADMIN', 'CENTRAL_ADMIN')
  reconcile(@Query('from') from?: string, @Query('to') to?: string) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.payments.reconcile(fromDate, toDate);
  }

  /** Called by the real payment gateway; must not require our own bearer auth (the gateway can't hold one). */
  @Post('webhook')
  @Public()
  webhook(@Body() dto: WebhookDto) { return this.payments.handleWebhook({ orderId: dto.orderId, paymentId: dto.paymentId, status: dto.status }, dto.signature); }

  /** Demo-only: stands in for the gateway calling /payments/webhook, since there is no real gateway in this environment. */
  @Post(':orderId/simulate-webhook')
  simulateWebhook(@Param('orderId') orderId: string, @Body() dto: SimulateWebhookDto) {
    const payload = { orderId, paymentId: `pay_${orderId.slice(6)}`, status: dto.status };
    return this.payments.handleWebhook(payload, signMockWebhookPayload(payload));
  }
}

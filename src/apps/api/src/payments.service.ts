import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PaymentProvider } from './payment-provider.interface';
import { PaymentGatewayProvider, PaymentWebhookPayload } from './payment-gateway-provider.interface';
import { PAYMENT_GATEWAY_PROVIDER, PAYMENT_PROVIDER } from './payments.tokens';
import { NotificationsService } from './notifications.service';

const DEFAULT_FEE = 500;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @Inject(PAYMENT_GATEWAY_PROVIDER) private readonly gateway: PaymentGatewayProvider,
    private readonly notifications: NotificationsService,
  ) {}

  private async notifyOutcome(applicationId: string, status: 'SUCCESS' | 'FAILED', amount: number, receiptNo: string | null) {
    const application = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId }, include: { applicant: true } });
    const recipient = application.applicant.email ?? application.applicant.phone;
    if (!recipient) return;
    await this.notifications.queue({
      templateId: status === 'SUCCESS' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
      channel: application.applicant.email ? 'EMAIL' : 'SMS',
      recipient,
      params: { amount, applicationId, receiptNo: receiptNo ?? '' },
      stakeholderId: application.applicant.id,
      applicationId,
    });
  }

  async getFee(category: string, serviceType = 'VERIFICATION') {
    const config = await this.prisma.feeConfig.findUnique({ where: { category_serviceType: { category, serviceType } } });
    return config ? Number(config.amount) : DEFAULT_FEE;
  }

  async setFee(category: string, serviceType: string, amount: number) {
    return this.prisma.feeConfig.upsert({
      where: { category_serviceType: { category, serviceType } },
      update: { amount },
      create: { category, serviceType, amount },
    });
  }

  async charge(applicationId: string, idempotencyKey: string) {
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.applicationId !== applicationId) throw new ConflictException('Idempotency key already used for a different application');
      return existing;
    }

    const application = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId }, include: { instrument: true, applicant: true } });
    const amount = application.feeAmount ? Number(application.feeAmount) : await this.getFee(application.instrument.category);
    const result = await this.provider.charge(amount, idempotencyKey);
    const receiptNo = result.status === 'SUCCESS' ? `RCPT-${new Date().getFullYear()}-${idempotencyKey.slice(0, 8).toUpperCase()}` : null;

    const payment = await this.prisma.payment.create({
      data: {
        applicationId,
        idempotencyKey,
        amount,
        status: result.status,
        providerReference: result.providerReference,
        receiptNo,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: application.applicant.id,
        action: result.status === 'SUCCESS' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
        entityType: 'payment',
        entityId: payment.id,
        metadata: { applicationId, amount, providerReference: result.providerReference },
      },
    });

    const recipient = application.applicant.email ?? application.applicant.phone;
    if (recipient) {
      await this.notifications.queue({
        templateId: result.status === 'SUCCESS' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
        channel: application.applicant.email ? 'EMAIL' : 'SMS',
        recipient,
        params: { amount, applicationId, receiptNo: receiptNo ?? '' },
        stakeholderId: application.applicant.id,
        applicationId,
      });
    }

    return payment;
  }

  /** Order + webhook flow modeling a real hosted-checkout gateway. */
  async createOrder(applicationId: string, idempotencyKey: string) {
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.applicationId !== applicationId) throw new ConflictException('Idempotency key already used for a different application');
      return existing;
    }
    const application = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId }, include: { instrument: true } });
    const amount = application.feeAmount ? Number(application.feeAmount) : await this.getFee(application.instrument.category);
    const order = await this.gateway.createOrder(amount, idempotencyKey);
    return this.prisma.payment.create({
      data: { applicationId, idempotencyKey, amount, status: 'PENDING', providerReference: order.orderId },
    });
  }

  async handleWebhook(payload: PaymentWebhookPayload, signature: string) {
    if (!this.gateway.verifyWebhookSignature(payload, signature)) throw new UnauthorizedException('Invalid webhook signature');
    const payment = await this.prisma.payment.findFirst({ where: { providerReference: payload.orderId } });
    if (!payment) throw new NotFoundException('No payment found for this order');
    if (payment.status !== 'PENDING') return payment; // already processed; webhook delivery is not guaranteed exactly-once

    const receiptNo = payload.status === 'SUCCESS' ? `RCPT-${new Date().getFullYear()}-${payload.orderId.slice(-8).toUpperCase()}` : null;
    const updated = await this.prisma.payment.update({ where: { id: payment.id }, data: { status: payload.status, receiptNo } });

    await this.prisma.auditLog.create({
      data: { action: payload.status === 'SUCCESS' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED', entityType: 'payment', entityId: payment.id, metadata: { source: 'webhook', orderId: payload.orderId, paymentId: payload.paymentId } },
    });
    await this.notifyOutcome(payment.applicationId, payload.status, Number(payment.amount), receiptNo);
    return updated;
  }

  async reconcile(from: Date, to: Date) {
    const payments = await this.prisma.payment.findMany({ where: { createdAt: { gte: from, lte: to } } });
    const totalsByStatus: Record<string, { count: number; amount: number }> = {};
    for (const payment of payments) {
      const bucket = totalsByStatus[payment.status] ?? { count: 0, amount: 0 };
      bucket.count += 1;
      bucket.amount += Number(payment.amount);
      totalsByStatus[payment.status] = bucket;
    }
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totalPayments: payments.length,
      totalsByStatus,
      failedPayments: payments.filter((p) => p.status !== 'SUCCESS').map((p) => ({ id: p.id, applicationId: p.applicationId, amount: p.amount, status: p.status, createdAt: p.createdAt })),
    };
  }
}

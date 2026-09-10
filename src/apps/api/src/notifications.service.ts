import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { NotificationTemplateId, renderTemplate } from './notification-templates';
import { EmailProvider, PushProvider, SmsProvider, WhatsAppProvider } from './notification-providers';

type Channel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';

const EXPIRY_REMINDER_DAYS = [60, 30, 7];

@Injectable()
export class NotificationsService {
  private readonly providers: Record<Channel, { send: (recipient: string, subject: string, body: string) => Promise<{ status: 'SENT' | 'FAILED'; providerReference?: string; failureReason?: string }> }>;

  constructor(
    private readonly prisma: PrismaService,
    email: EmailProvider,
    sms: SmsProvider,
    whatsapp: WhatsAppProvider,
    push: PushProvider,
  ) {
    this.providers = { EMAIL: email, SMS: sms, WHATSAPP: whatsapp, PUSH: push };
  }

  private isChannelEnabled(preferences: Record<string, unknown> | null | undefined, channel: Channel) {
    if (!preferences) return true;
    const value = preferences[channel];
    return value !== false;
  }

  async queue(params: {
    templateId: NotificationTemplateId;
    channel: Channel;
    recipient: string;
    params: Record<string, string | number>;
    stakeholderId?: string;
    applicationId?: string;
  }) {
    if (params.stakeholderId) {
      const stakeholder = await this.prisma.stakeholder.findUnique({ where: { id: params.stakeholderId } });
      if (stakeholder && !this.isChannelEnabled(stakeholder.notificationPreferences as Record<string, unknown> | null, params.channel)) {
        return null;
      }
    }
    const { subject, body } = renderTemplate(params.templateId, params.params);
    return this.prisma.alert.create({
      data: {
        channel: params.channel,
        template: params.templateId,
        recipient: params.recipient,
        payload: { subject, body, ...params.params } as any,
        stakeholderId: params.stakeholderId,
        applicationId: params.applicationId,
      },
    });
  }

  async dispatchQueued(limit = 100) {
    const queued = await this.prisma.alert.findMany({ where: { status: 'QUEUED' }, take: limit });
    let sent = 0;
    let failed = 0;
    for (const alert of queued) {
      const payload = alert.payload as { subject?: string; body?: string };
      const provider = this.providers[alert.channel as Channel];
      const result = await provider.send(alert.recipient, payload.subject ?? alert.template, payload.body ?? '');
      const attempts = alert.attempts + 1;
      if (result.status === 'SENT') {
        await this.prisma.alert.update({ where: { id: alert.id }, data: { status: 'SENT', sentAt: new Date(), attempts, providerReference: result.providerReference } });
        sent++;
      } else {
        const exhausted = attempts >= alert.maxAttempts;
        await this.prisma.alert.update({ where: { id: alert.id }, data: { status: exhausted ? 'FAILED' : 'QUEUED', attempts, failureReason: result.failureReason } });
        failed++;
      }
    }
    return { dispatched: queued.length, sent, failed };
  }

  /**
   * Called by an SMS/WhatsApp provider's delivery-status callback (Twilio,
   * Gupshup, MSG91-style webhooks all follow this shape: a provider
   * reference plus a terminal delivery status).
   */
  async handleDeliveryWebhook(providerReference: string, status: 'DELIVERED' | 'FAILED', reason?: string) {
    const alert = await this.prisma.alert.findFirst({ where: { providerReference } });
    if (!alert) return null;
    return this.prisma.alert.update({
      where: { id: alert.id },
      data: status === 'DELIVERED' ? { deliveredAt: new Date() } : { status: 'FAILED', failureReason: reason ?? 'Provider reported delivery failure' },
    });
  }

  async queueAppointmentReminders() {
    const windowStart = new Date();
    const windowEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const applications = await this.prisma.application.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { gte: windowStart, lte: windowEnd } },
      include: { applicant: true },
    });
    let queued = 0;
    for (const application of applications) {
      if (!application.applicant.phone && !application.applicant.email) continue;
      const created = await this.queue({
        templateId: 'APPOINTMENT_REMINDER',
        channel: application.applicant.phone ? 'SMS' : 'EMAIL',
        recipient: application.applicant.phone ?? application.applicant.email ?? '',
        params: { scheduledAt: application.scheduledAt?.toISOString() ?? '', location: application.applicant.stateCode, applicationId: application.id },
        stakeholderId: application.applicant.id,
        applicationId: application.id,
      });
      if (created) queued++;
    }
    return { queued };
  }

  async queueExpiryReminders() {
    let queued = 0;
    for (const days of EXPIRY_REMINDER_DAYS) {
      const target = new Date();
      target.setDate(target.getDate() + days);
      const dayStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const certificates = await this.prisma.certificate.findMany({
        where: { status: 'ACTIVE', validUntil: { gte: dayStart, lt: dayEnd } },
        include: { verification: { include: { application: { include: { applicant: true } } } } },
      });
      for (const certificate of certificates) {
        const applicant = certificate.verification.application.applicant;
        if (!applicant.email && !applicant.phone) continue;
        const created = await this.queue({
          templateId: 'EXPIRY_REMINDER',
          channel: applicant.email ? 'EMAIL' : 'SMS',
          recipient: applicant.email ?? applicant.phone ?? '',
          params: { certNo: certificate.certNo, validUntil: certificate.validUntil.toDateString(), daysRemaining: days },
          stakeholderId: applicant.id,
          applicationId: certificate.verification.application.id,
        });
        if (created) queued++;
      }
    }
    return { queued };
  }
}

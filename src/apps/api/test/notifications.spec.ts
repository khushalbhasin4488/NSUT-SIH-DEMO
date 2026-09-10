import { renderTemplate } from '../src/notification-templates';
import { NotificationsService } from '../src/notifications.service';

describe('notification templates', () => {
  it('fills placeholders from params', () => {
    const { subject, body } = renderTemplate('PAYMENT_SUCCESS', { amount: 500, applicationId: 'app-1', receiptNo: 'RCPT-1' });
    expect(subject).toBe('Payment received');
    expect(body).toBe('We received your payment of 500 for application app-1. Receipt: RCPT-1.');
  });
});

function fakePrisma() {
  const alerts = new Map<string, any>();
  let seq = 0;
  return {
    stakeholder: { findUnique: async () => null },
    alert: {
      create: async ({ data }: any) => {
        const record = { id: `alert-${++seq}`, attempts: 0, maxAttempts: 3, status: 'QUEUED', ...data };
        alerts.set(record.id, record);
        return record;
      },
      findMany: async ({ where }: any) => [...alerts.values()].filter((a) => a.status === where.status),
      update: async ({ where, data }: any) => {
        const record = { ...alerts.get(where.id), ...data };
        alerts.set(where.id, record);
        return record;
      },
    },
  };
}

describe('NotificationsService dispatch', () => {
  it('marks a channel FAILED then exhausts retries to a terminal FAILED status', async () => {
    const prisma = fakePrisma();
    const failingProvider = { send: async () => ({ status: 'FAILED' as const, failureReason: 'down' }) };
    const service = new NotificationsService(prisma as any, failingProvider as any, failingProvider as any, failingProvider as any, failingProvider as any);

    const alert = await service.queue({ templateId: 'PAYMENT_SUCCESS', channel: 'EMAIL', recipient: 'x@example.com', params: { amount: 1, applicationId: 'a', receiptNo: 'r' } });
    expect(alert).not.toBeNull();

    await service.dispatchQueued();
    await service.dispatchQueued();
    const result = await service.dispatchQueued();

    expect(result.failed).toBe(1);
    const stored = await prisma.alert.findMany({ where: { status: 'FAILED' } });
    expect(stored[0].attempts).toBe(3);
  });
});

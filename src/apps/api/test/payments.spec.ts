import { PaymentsService } from '../src/payments.service';
import { MockPaymentProvider } from '../src/mock-payment.provider';
import { MockPaymentGatewayProvider } from '../src/mock-payment-gateway.provider';

function fakePrisma() {
  const feeConfigs = new Map<string, { category: string; serviceType: string; amount: number }>();
  const payments = new Map<string, any>();
  return {
    feeConfig: {
      findUnique: async ({ where: { category_serviceType } }: any) => feeConfigs.get(`${category_serviceType.category}:${category_serviceType.serviceType}`) ?? null,
      upsert: async ({ where: { category_serviceType }, create }: any) => {
        const record = { ...create };
        feeConfigs.set(`${category_serviceType.category}:${category_serviceType.serviceType}`, record);
        return record;
      },
    },
    payment: {
      findUnique: async ({ where: { idempotencyKey } }: any) => payments.get(idempotencyKey) ?? null,
      create: async ({ data }: any) => {
        const record = { id: `pay-${payments.size + 1}`, ...data };
        payments.set(data.idempotencyKey, record);
        return record;
      },
    },
    application: {
      findUniqueOrThrow: async () => ({ id: 'app-1', feeAmount: null, instrument: { category: 'WEIGHING_SCALE' }, applicant: { id: 'applicant-1', email: null, phone: null } }),
    },
    auditLog: {
      create: async ({ data }: any) => ({ id: 'audit-1', ...data }),
    },
  };
}

function fakeNotifications() {
  return { queue: async () => null };
}

describe('PaymentsService', () => {
  it('charges the configured fee and is idempotent for repeated requests', async () => {
    const prisma = fakePrisma();
    const service = new PaymentsService(prisma as any, new MockPaymentProvider(), new MockPaymentGatewayProvider(), fakeNotifications() as any);
    await service.setFee('WEIGHING_SCALE', 'VERIFICATION', 750);

    const first = await service.charge('app-1', 'idem-key-1');
    const second = await service.charge('app-1', 'idem-key-1');

    expect(first.amount).toBe(750);
    expect(first.status).toBe('SUCCESS');
    expect(second.id).toBe(first.id);
  });
});

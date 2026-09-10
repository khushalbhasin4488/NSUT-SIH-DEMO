import { Injectable } from '@nestjs/common';
import { PaymentChargeResult, PaymentProvider } from './payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  async charge(_amount: number, reference: string): Promise<PaymentChargeResult> {
    return { status: 'SUCCESS', providerReference: `MOCK-${reference}-${Date.now()}` };
  }
}

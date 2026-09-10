import { Injectable } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import { PaymentGatewayProvider, PaymentOrder, PaymentWebhookPayload } from './payment-gateway-provider.interface';

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET ?? 'mock-gateway-webhook-secret';

@Injectable()
export class MockPaymentGatewayProvider implements PaymentGatewayProvider {
  async createOrder(amount: number, receipt: string): Promise<PaymentOrder> {
    const orderId = `order_${createHash('sha256').update(`${receipt}:${amount}`).digest('hex').slice(0, 16)}`;
    return { orderId, checkoutUrl: `https://mock-gateway.example.com/checkout/${orderId}`, amount };
  }

  verifyWebhookSignature(payload: PaymentWebhookPayload, signature: string): boolean {
    const expected = createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(payload)).digest('hex');
    return expected === signature;
  }
}

export function signMockWebhookPayload(payload: PaymentWebhookPayload): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(payload)).digest('hex');
}

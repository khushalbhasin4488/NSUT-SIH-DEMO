export interface PaymentOrder {
  orderId: string;
  checkoutUrl: string;
  amount: number;
}

export interface PaymentWebhookPayload {
  orderId: string;
  paymentId: string;
  status: 'SUCCESS' | 'FAILED';
}

/**
 * Modeled on a real gateway's order+webhook flow (Razorpay/PayU/Bharatkosh
 * style): the server creates an order, the client is redirected to the
 * gateway's hosted checkout, and the gateway calls back asynchronously with
 * a signed webhook once payment completes. Swap MockPaymentGatewayProvider
 * for a real implementation once gateway credentials are available, by
 * rebinding PAYMENT_GATEWAY_PROVIDER in app.module.ts.
 */
export interface PaymentGatewayProvider {
  createOrder(amount: number, receipt: string): Promise<PaymentOrder>;
  verifyWebhookSignature(payload: PaymentWebhookPayload, signature: string): boolean;
}

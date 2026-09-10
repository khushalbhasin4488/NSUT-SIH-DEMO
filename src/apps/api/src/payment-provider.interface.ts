export interface PaymentChargeResult {
  status: 'SUCCESS' | 'FAILED';
  providerReference: string;
}

export interface PaymentProvider {
  charge(amount: number, reference: string): Promise<PaymentChargeResult>;
}

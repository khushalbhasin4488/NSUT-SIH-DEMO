export interface NotificationSendResult {
  status: 'SENT' | 'FAILED';
  providerReference?: string;
  failureReason?: string;
}

export interface NotificationProvider {
  send(recipient: string, subject: string, body: string): Promise<NotificationSendResult>;
}

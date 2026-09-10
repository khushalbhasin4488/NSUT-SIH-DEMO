export type NotificationTemplateId =
  | 'APPOINTMENT_SCHEDULED'
  | 'APPOINTMENT_REMINDER'
  | 'EXPIRY_REMINDER'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'VERIFICATION_FAILED'
  | 'CERTIFICATE_ISSUED';

export const NOTIFICATION_TEMPLATES: Record<NotificationTemplateId, { subject: string; body: string }> = {
  APPOINTMENT_SCHEDULED: {
    subject: 'Verification appointment scheduled',
    body: 'Your instrument verification for application {{applicationId}} has been scheduled for {{scheduledAt}}.',
  },
  APPOINTMENT_REMINDER: {
    subject: 'Upcoming verification appointment',
    body: 'Reminder: your instrument verification is scheduled for {{scheduledAt}} at {{location}}. Application {{applicationId}}.',
  },
  EXPIRY_REMINDER: {
    subject: 'Certificate expiring soon',
    body: 'Your certificate {{certNo}} expires on {{validUntil}} ({{daysRemaining}} days remaining). Please renew in time.',
  },
  PAYMENT_SUCCESS: {
    subject: 'Payment received',
    body: 'We received your payment of {{amount}} for application {{applicationId}}. Receipt: {{receiptNo}}.',
  },
  PAYMENT_FAILED: {
    subject: 'Payment failed',
    body: 'Your payment of {{amount}} for application {{applicationId}} could not be processed. Please retry.',
  },
  VERIFICATION_FAILED: {
    subject: 'Verification did not pass',
    body: 'Your instrument for application {{applicationId}} did not pass verification. Reason: {{reason}}.',
  },
  CERTIFICATE_ISSUED: {
    subject: 'Certificate issued',
    body: 'Certificate {{certNo}} has been issued and is valid until {{validUntil}}.',
  },
};

export function renderTemplate(templateId: NotificationTemplateId, params: Record<string, string | number>) {
  const template = NOTIFICATION_TEMPLATES[templateId];
  const fill = (text: string) => text.replace(/{{(\w+)}}/g, (_match, key) => String(params[key] ?? ''));
  return { subject: fill(template.subject), body: fill(template.body) };
}

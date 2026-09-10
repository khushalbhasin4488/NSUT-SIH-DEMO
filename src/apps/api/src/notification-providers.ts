import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, NotificationSendResult } from './notification-provider.interface';

abstract class DemoChannelProvider implements NotificationProvider {
  protected abstract readonly channel: string;
  private readonly logger = new Logger('NotificationDispatch');

  async send(recipient: string, subject: string, body: string): Promise<NotificationSendResult> {
    if (!recipient) return { status: 'FAILED', failureReason: 'Missing recipient address' };
    this.logger.log(`[${this.channel}] -> ${recipient}: ${subject} (${body.length} chars)`);
    return { status: 'SENT', providerReference: `${this.channel}-${Date.now()}` };
  }
}

@Injectable()
export class EmailProvider extends DemoChannelProvider { protected readonly channel = 'EMAIL'; }

@Injectable()
export class SmsProvider extends DemoChannelProvider { protected readonly channel = 'SMS'; }

@Injectable()
export class WhatsAppProvider extends DemoChannelProvider { protected readonly channel = 'WHATSAPP'; }

@Injectable()
export class PushProvider extends DemoChannelProvider { protected readonly channel = 'PUSH'; }

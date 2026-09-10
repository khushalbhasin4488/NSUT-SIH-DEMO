import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { PrismaService } from './prisma.service';
import { NotificationsService } from './notifications.service';
import { Public } from './public.decorator';

class AlertDto { @IsEnum(['SMS','WHATSAPP','EMAIL','PUSH']) channel!: any; @IsString() template!: string; @IsString() recipient!: string; @IsObject() payload!: Record<string, unknown>; @IsOptional() @IsString() stakeholderId?: string; @IsOptional() @IsString() applicationId?: string; }
class DeliveryWebhookDto { @IsString() providerReference!: string; @IsEnum(['DELIVERED', 'FAILED']) status!: 'DELIVERED' | 'FAILED'; @IsOptional() @IsString() reason?: string; }
@Controller('alerts')
export class AlertsController {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}
  @Post()
  async queue(@Body() dto: AlertDto) { return this.prisma.alert.create({ data: { channel: dto.channel, template: dto.template, recipient: dto.recipient, payload: dto.payload as any, stakeholderId: dto.stakeholderId, applicationId: dto.applicationId } }); }
  @Post('dispatch')
  dispatch() { return this.notifications.dispatchQueued(); }
  @Post('reminders/appointments')
  queueAppointmentReminders() { return this.notifications.queueAppointmentReminders(); }
  @Post('reminders/expiry')
  queueExpiryReminders() { return this.notifications.queueExpiryReminders(); }
  /** Called by the real SMS/WhatsApp provider; must not require our own bearer auth (the provider can't hold one). */
  @Post('webhook')
  @Public()
  webhook(@Body() dto: DeliveryWebhookDto) { return this.notifications.handleDeliveryWebhook(dto.providerReference, dto.status, dto.reason); }
  @Get()
  list() { return this.prisma.alert.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }); }
}

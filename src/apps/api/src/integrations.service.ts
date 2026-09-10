import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DigiLockerProvider } from './digilocker-provider.interface';
import { UmangProvider } from './umang-provider.interface';
import { DIGILOCKER_PROVIDER, UMANG_PROVIDER } from './integrations.tokens';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DIGILOCKER_PROVIDER) private readonly digilocker: DigiLockerProvider,
    @Inject(UMANG_PROVIDER) private readonly umang: UmangProvider,
  ) {}

  async queue(system: 'DIGILOCKER' | 'UMANG' | 'LEGACY_STATE', entityType: string, entityId: string, idempotencyKey: string, requestPayload: Record<string, unknown>) {
    const existing = await this.prisma.externalSync.findUnique({ where: { idempotencyKey } });
    if (existing) return { ...existing, replay: true };
    return this.prisma.externalSync.create({ data: { system, entityType, entityId, idempotencyKey, requestPayload: requestPayload as any } });
  }

  async dispatch(limit = 100) {
    const queued = await this.prisma.externalSync.findMany({ where: { status: 'QUEUED' }, take: limit });
    let delivered = 0;
    let failed = 0;
    for (const item of queued) {
      try {
        if (item.system === 'DIGILOCKER') {
          const result = await this.digilocker.pushIssuedDocument(item.entityType, item.entityId, item.requestPayload as Record<string, unknown>);
          await this.prisma.externalSync.update({ where: { id: item.id }, data: { status: result.status === 'DELIVERED' ? 'SENT' : 'FAILED', externalReference: result.externalReference, responsePayload: result as any, lastAttemptAt: new Date() } });
          result.status === 'DELIVERED' ? delivered++ : failed++;
        } else if (item.system === 'UMANG') {
          const result = await this.umang.pushServiceUpdate(item.entityType, item.entityId, item.requestPayload as Record<string, unknown>);
          await this.prisma.externalSync.update({ where: { id: item.id }, data: { status: result.status === 'ACCEPTED' ? 'SENT' : 'FAILED', externalReference: result.externalReference, responsePayload: result as any, lastAttemptAt: new Date() } });
          result.status === 'ACCEPTED' ? delivered++ : failed++;
        } else {
          await this.prisma.externalSync.update({ where: { id: item.id }, data: { status: 'SENT', externalReference: `${item.system}-${item.entityId}`, responsePayload: { adapter: 'legacy-demo-adapter', accepted: true }, lastAttemptAt: new Date() } });
          delivered++;
        }
      } catch (error) {
        await this.prisma.externalSync.update({ where: { id: item.id }, data: { status: 'FAILED', responsePayload: { error: (error as Error).message } as any, lastAttemptAt: new Date() } });
        failed++;
      }
    }
    return { dispatched: queued.length, delivered, failed, systems: [...new Set(queued.map((item) => item.system))] };
  }

  digilockerConsent(stakeholderId: string) {
    return this.digilocker.initiateConsent(stakeholderId);
  }

  digilockerDocuments(consentRequestId: string) {
    return this.digilocker.pullIssuedDocuments(consentRequestId);
  }
}

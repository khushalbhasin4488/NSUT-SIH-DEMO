import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { UmangProvider, UmangPushResult } from './umang-provider.interface';

@Injectable()
export class MockUmangProvider implements UmangProvider {
  async pushServiceUpdate(entityType: string, entityId: string, payload: Record<string, unknown>): Promise<UmangPushResult> {
    const seed = createHash('sha256').update(`${entityType}:${entityId}:${JSON.stringify(payload)}`).digest('hex');
    return { externalReference: `UMANG-LMD-${seed.slice(0, 10).toUpperCase()}`, status: 'ACCEPTED' };
  }
}

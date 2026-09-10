import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class LedgerService {
  hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  entryHash(payloadHash: string, previousHash: string | null, entityType: string, entityId: string) { return this.hash(`${payloadHash}:${previousHash ?? 'GENESIS'}:${entityType}:${entityId}`); }
}

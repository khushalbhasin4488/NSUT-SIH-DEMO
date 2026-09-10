import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsObject, IsString } from 'class-validator';
import { PrismaService } from './prisma.service';
import { LedgerService } from './ledger.service';

class AnchorDto { @IsString() entityType!: string; @IsString() entityId!: string; @IsObject() payload!: Record<string, unknown>; }
@Controller('ledger')
export class LedgerController {
  constructor(private readonly prisma: PrismaService, private readonly ledger: LedgerService) {}
  @Post('anchor')
  async anchor(@Body() dto: AnchorDto) {
    const payloadHash = this.ledger.hash(JSON.stringify(dto.payload));
    const previous = await this.prisma.ledgerEntry.findFirst({ orderBy: { anchoredAt: 'desc' } });
    const entryHash = this.ledger.entryHash(payloadHash, previous?.entryHash ?? null, dto.entityType, dto.entityId);
    return this.prisma.ledgerEntry.create({ data: { entityType: dto.entityType, entityId: dto.entityId, payloadHash, previousHash: previous?.entryHash, entryHash } });
  }
  @Get('verify')
  async verify() {
    const entries = await this.prisma.ledgerEntry.findMany({ orderBy: { anchoredAt: 'asc' } });
    let previous: string | null = null;
    const invalid: string[] = [];
    for (const entry of entries) { const expected = this.ledger.entryHash(entry.payloadHash, previous, entry.entityType, entry.entityId); if (expected !== entry.entryHash || entry.previousHash !== previous) invalid.push(entry.id); previous = entry.entryHash; }
    return { valid: invalid.length === 0, entries: entries.length, invalidEntryIds: invalid };
  }
  @Get(':entityType/:entityId') list(@Param('entityType') entityType: string, @Param('entityId') entityId: string) { return this.prisma.ledgerEntry.findMany({ where: { entityType, entityId }, orderBy: { anchoredAt: 'asc' } }); }
}

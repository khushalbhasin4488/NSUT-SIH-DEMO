import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const REQUIRED_FIELDS: Record<string, string[]> = {
  stakeholder: ['name', 'stateCode'],
  instrument: ['ownerId', 'category', 'serialNo'],
  application: ['applicantId', 'instrumentId'],
};

@Injectable()
export class LegacyImportService {
  constructor(private readonly prisma: PrismaService) {}

  setMapping(sourceSystem: string, targetEntityType: string, fieldMap: Record<string, string>) {
    return this.prisma.legacyStateMapping.upsert({
      where: { sourceSystem_targetEntityType: { sourceSystem, targetEntityType } },
      update: { fieldMap: fieldMap as any },
      create: { sourceSystem, targetEntityType, fieldMap: fieldMap as any },
    });
  }

  listMappings() {
    return this.prisma.legacyStateMapping.findMany({ orderBy: { sourceSystem: 'asc' } });
  }

  private applyMapping(record: Record<string, unknown>, fieldMap: Record<string, string> | null) {
    if (!fieldMap) return record;
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) mapped[fieldMap[key] ?? key] = value;
    return mapped;
  }

  private validate(targetEntityType: string, record: Record<string, unknown>): string[] {
    const required = REQUIRED_FIELDS[targetEntityType] ?? [];
    return required.filter((field) => record[field] === undefined || record[field] === null || record[field] === '');
  }

  async bulkImport(sourceSystem: string, targetEntityType: string, records: Array<{ sourceRecordId: string; payload: Record<string, unknown> }>) {
    const mapping = await this.prisma.legacyStateMapping.findUnique({ where: { sourceSystem_targetEntityType: { sourceSystem, targetEntityType } } });
    const fieldMap = (mapping?.fieldMap as Record<string, string> | undefined) ?? null;

    let imported = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ sourceRecordId: string; errors: string[] }> = [];

    for (const record of records) {
      const existing = await this.prisma.legacyImport.findUnique({ where: { sourceSystem_sourceRecordId: { sourceSystem, sourceRecordId: record.sourceRecordId } } });
      if (existing) { skipped++; continue; }

      const mapped = this.applyMapping(record.payload, fieldMap);
      const missing = this.validate(targetEntityType, mapped);
      if (missing.length) {
        await this.prisma.legacyImport.create({
          data: { sourceSystem, sourceRecordId: record.sourceRecordId, targetEntityType, payload: mapped as any, status: 'FAILED_VALIDATION', validationErrors: { missing } as any },
        });
        errors.push({ sourceRecordId: record.sourceRecordId, errors: missing.map((f) => `Missing required field: ${f}`) });
        failed++;
        continue;
      }

      await this.prisma.legacyImport.create({
        data: { sourceSystem, sourceRecordId: record.sourceRecordId, targetEntityType, payload: mapped as any, status: 'IMPORTED' },
      });
      imported++;
    }

    return { total: records.length, imported, failed, skipped, errors };
  }

  async rollback(id: string) {
    const record = await this.prisma.legacyImport.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Import record not found');
    return this.prisma.legacyImport.update({ where: { id }, data: { status: 'ROLLED_BACK' } });
  }

  reconciliationReport(sourceSystem?: string) {
    return this.prisma.legacyImport.groupBy({ by: ['sourceSystem', 'targetEntityType', 'status'], _count: { _all: true }, where: sourceSystem ? { sourceSystem } : undefined });
  }
}

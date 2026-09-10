import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsArray, IsEnum, IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from './prisma.service';
import { IntegrationsService } from './integrations.service';
import { LegacyImportService } from './legacy-import.service';
import { Roles } from './roles.decorator';

class ExternalSyncDto { @IsEnum(['DIGILOCKER','UMANG']) system!: any; @IsString() entityType!: string; @IsString() entityId!: string; @IsString() idempotencyKey!: string; @IsObject() requestPayload!: Record<string, unknown>; }
class LegacyImportDto { @IsString() sourceSystem!: string; @IsString() sourceRecordId!: string; @IsString() targetEntityType!: string; @IsObject() payload!: Record<string, unknown>; }
class ConsentDto { @IsString() stakeholderId!: string; }
class LegacyMappingDto { @IsString() sourceSystem!: string; @IsString() targetEntityType!: string; @IsObject() fieldMap!: Record<string, string>; }
class LegacyBulkRecordDto { @IsString() sourceRecordId!: string; @IsObject() payload!: Record<string, unknown>; }
class LegacyBulkImportDto {
  @IsString() sourceSystem!: string;
  @IsString() targetEntityType!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => LegacyBulkRecordDto) records!: LegacyBulkRecordDto[];
}

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly prisma: PrismaService, private readonly integrations: IntegrationsService, private readonly legacyImports: LegacyImportService) {}
  @Post('sync')
  queue(@Body() dto: ExternalSyncDto) { return this.integrations.queue(dto.system, dto.entityType, dto.entityId, dto.idempotencyKey, dto.requestPayload); }
  @Post('dispatch')
  dispatch() { return this.integrations.dispatch(); }
  @Get('sync') listSyncs() { return this.prisma.externalSync.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }); }

  @Post('digilocker/consent')
  digilockerConsent(@Body() dto: ConsentDto) { return this.integrations.digilockerConsent(dto.stakeholderId); }
  @Get('digilocker/documents/:consentRequestId')
  digilockerDocuments(@Param('consentRequestId') consentRequestId: string) { return this.integrations.digilockerDocuments(consentRequestId); }

  @Post('legacy/import')
  async importLegacy(@Body() dto: LegacyImportDto) {
    const existing = await this.prisma.legacyImport.findUnique({ where: { sourceSystem_sourceRecordId: { sourceSystem: dto.sourceSystem, sourceRecordId: dto.sourceRecordId } } });
    if (existing) return { ...existing, replay: true };
    return this.prisma.legacyImport.create({ data: { sourceSystem: dto.sourceSystem, sourceRecordId: dto.sourceRecordId, targetEntityType: dto.targetEntityType, payload: dto.payload as any } });
  }
  @Get('legacy/imports') listImports() { return this.prisma.legacyImport.findMany({ orderBy: { importedAt: 'desc' }, take: 100 }); }

  @Post('legacy/mapping')
  @Roles('STATE_ADMIN', 'CENTRAL_ADMIN')
  setMapping(@Body() dto: LegacyMappingDto) { return this.legacyImports.setMapping(dto.sourceSystem, dto.targetEntityType, dto.fieldMap); }
  @Get('legacy/mapping')
  listMappings() { return this.legacyImports.listMappings(); }

  @Post('legacy/bulk-import')
  @Roles('STATE_ADMIN', 'CENTRAL_ADMIN')
  bulkImport(@Body() dto: LegacyBulkImportDto) { return this.legacyImports.bulkImport(dto.sourceSystem, dto.targetEntityType, dto.records); }

  @Post('legacy/imports/:id/rollback')
  @Roles('STATE_ADMIN', 'CENTRAL_ADMIN')
  rollbackImport(@Param('id') id: string) { return this.legacyImports.rollback(id); }

  @Get('legacy/reconciliation')
  @Roles('STATE_ADMIN', 'CENTRAL_ADMIN')
  reconciliation(@Query('sourceSystem') sourceSystem?: string) { return this.legacyImports.reconciliationReport(sourceSystem); }
}

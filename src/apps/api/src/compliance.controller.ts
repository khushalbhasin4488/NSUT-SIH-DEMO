import { Body, Controller, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from './prisma.service';
import { ComplianceService } from './compliance.service';

const ESCALATION_THRESHOLD = 0.3;

class DocumentDto { @IsString() title!: string; @IsString() sectionRef!: string; @IsString() paragraph!: string; @IsOptional() @IsString() language?: string; }
class QueryDto { @IsString() question!: string; @IsOptional() @IsString() language?: string; }

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly prisma: PrismaService, private readonly compliance: ComplianceService) {}
  @Post('documents') createDocument(@Body() dto: DocumentDto) { return this.prisma.complianceDocument.create({ data: { ...dto, language: dto.language ?? 'en' } }); }
  @Post('query')
  async query(@Body() dto: QueryDto) {
    const documents = await this.prisma.complianceDocument.findMany({ where: { active: true, language: dto.language ?? 'en' } });
    const result = this.compliance.answer(dto.question, documents);
    const saved = await this.prisma.complianceQuery.create({ data: { question: dto.question, answer: result.answer, citations: result.citations, confidence: result.confidence } });
    const escalated = result.confidence < ESCALATION_THRESHOLD;
    if (escalated) {
      await this.prisma.auditLog.create({
        data: { action: 'COMPLIANCE_ESCALATED', entityType: 'compliance_query', entityId: saved.id, metadata: { question: dto.question, confidence: result.confidence } },
      });
    }
    return { ...saved, escalated };
  }
}

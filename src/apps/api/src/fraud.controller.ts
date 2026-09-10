import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrismaService } from './prisma.service';
import { FraudFeatures, FraudService } from './fraud.service';

class FraudDto implements FraudFeatures { @IsOptional() @IsNumber() @Min(0) @Max(1) officerPassRate?: number; @IsOptional() @IsNumber() @Min(0) @Max(1) gatcPassRate?: number; @IsOptional() @IsNumber() @Min(0) repeatFailures?: number; @IsOptional() @IsNumber() @Min(0) inspectionDurationMinutes?: number; @IsOptional() @IsNumber() @Min(0) duplicateSerialMatches?: number; }
class ScoreDto { @IsString() subjectType!: string; @IsString() subjectId!: string; features!: FraudDto; }

@Controller('fraud')
export class FraudController {
  constructor(private readonly fraud: FraudService, private readonly prisma: PrismaService) {}
  @Post('score')
  async score(@Body() dto: ScoreDto) { const result = this.fraud.score(dto.features); return this.prisma.fraudScore.create({ data: { subjectType: dto.subjectType, subjectId: dto.subjectId, score: result.score, riskLevel: result.riskLevel, reasons: result.reasons, modelVersion: result.modelVersion } }); }
  @Get('recent')
  recent() { return this.prisma.fraudScore.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }); }

  @Get(':subjectType/:subjectId')
  list(@Param('subjectType') subjectType: string, @Param('subjectId') subjectId: string) { return this.prisma.fraudScore.findMany({ where: { subjectType, subjectId }, orderBy: { createdAt: 'desc' }, take: 20 }); }
}

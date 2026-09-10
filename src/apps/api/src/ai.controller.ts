import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { AiService } from './ai.service';
import { CurrentUser } from './tenant.decorator';
import { AuthUser } from './auth.types';
import { Roles } from './roles.decorator';

class OcrDto { @IsString() objectKey!: string; @IsString() documentType!: string; @IsOptional() @IsString() stakeholderId?: string; }
class RecognitionDto { @IsString() objectKey!: string; @IsOptional() @IsString() instrumentId?: string; }
class ReviewDto {
  @IsEnum(['APPROVED', 'REJECTED']) status!: 'APPROVED' | 'REJECTED';
  @IsOptional() @IsObject() correctedResult?: Record<string, unknown>;
  @IsOptional() @IsString() note?: string;
}

/**
 * AI-assisted extraction/recognition is advisory only: results always land
 * here as PENDING_REVIEW and are never written back to Stakeholder,
 * StakeholderDocument, or Instrument records automatically. A human with
 * an officer/admin role must review and approve/reject; applying the
 * (possibly corrected) data still goes through the existing, already
 * audited stakeholder/instrument endpoints.
 */
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('ocr')
  ocr(@Body() dto: OcrDto) { return this.ai.runOcr(dto.objectKey, dto.documentType, dto.stakeholderId); }

  @Post('instrument-recognition')
  recognize(@Body() dto: RecognitionDto) { return this.ai.runInstrumentRecognition(dto.objectKey, dto.instrumentId); }

  @Post(':id/review')
  @Roles('LMO', 'GATC', 'STATE_ADMIN', 'CENTRAL_ADMIN')
  review(@Param('id') id: string, @Body() dto: ReviewDto, @CurrentUser() user: AuthUser) {
    return this.ai.review(id, user.sub, dto.status, dto.correctedResult, dto.note);
  }

  @Get('outputs')
  @Roles('LMO', 'GATC', 'STATE_ADMIN', 'CENTRAL_ADMIN')
  history(@Query('kind') kind?: string, @Query('status') status?: string) { return this.ai.history(kind, status); }
}

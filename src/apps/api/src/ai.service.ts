import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { OcrProvider } from './ocr-provider.interface';
import { InstrumentRecognitionProvider } from './instrument-recognition-provider.interface';
import { INSTRUMENT_RECOGNITION_PROVIDER, LOW_CONFIDENCE_THRESHOLD, OCR_PROVIDER } from './ai.tokens';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OCR_PROVIDER) private readonly ocr: OcrProvider,
    @Inject(INSTRUMENT_RECOGNITION_PROVIDER) private readonly recognition: InstrumentRecognitionProvider,
  ) {}

  async runOcr(objectKey: string, documentType: string, stakeholderId?: string) {
    const result = await this.ocr.extract(objectKey, documentType);
    const lowConfidence = result.confidence < LOW_CONFIDENCE_THRESHOLD;
    return this.prisma.aiOutput.create({
      data: {
        kind: 'OCR',
        stakeholderId,
        documentType,
        inputObjectKey: objectKey,
        result: result.fields as any,
        confidence: result.confidence,
        lowConfidence,
        status: 'PENDING_REVIEW',
      },
    });
  }

  async runInstrumentRecognition(objectKey: string, instrumentId?: string) {
    const result = await this.recognition.recognize(objectKey);
    const lowConfidence = result.confidence < LOW_CONFIDENCE_THRESHOLD;
    return this.prisma.aiOutput.create({
      data: {
        kind: 'INSTRUMENT_RECOGNITION',
        instrumentId,
        inputObjectKey: objectKey,
        result: result as any,
        confidence: result.confidence,
        lowConfidence,
        status: 'PENDING_REVIEW',
      },
    });
  }

  async review(id: string, reviewerId: string, decision: 'APPROVED' | 'REJECTED', correctedResult: Record<string, unknown> | undefined, note: string | undefined) {
    const output = await this.prisma.aiOutput.findUniqueOrThrow({ where: { id } });
    if (output.status !== 'PENDING_REVIEW') throw new BadRequestException('This AI output has already been reviewed');
    return this.prisma.aiOutput.update({
      where: { id },
      data: { status: decision, reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: note, correctedResult: correctedResult as any },
    });
  }

  history(kind?: string, status?: string) {
    return this.prisma.aiOutput.findMany({ where: { kind, status }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
}

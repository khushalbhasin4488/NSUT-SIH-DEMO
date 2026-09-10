import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { InstrumentRecognitionProvider, InstrumentRecognitionResult } from './instrument-recognition-provider.interface';
import { INSTRUMENT_CATEGORY_CODES } from './instrument-categories';

@Injectable()
export class MockInstrumentRecognitionProvider implements InstrumentRecognitionProvider {
  async recognize(objectKey: string): Promise<InstrumentRecognitionResult> {
    const seed = parseInt(createHash('sha256').update(objectKey).digest('hex').slice(0, 8), 16);
    const ordered = [...INSTRUMENT_CATEGORY_CODES].sort((a, b) => a.localeCompare(b));
    const topIndex = seed % ordered.length;
    const altIndex = (topIndex + 1) % ordered.length;
    const topConfidence = 0.65 + (seed % 30) / 100;
    return {
      predictedCategory: ordered[topIndex],
      confidence: Math.min(topConfidence, 0.96),
      alternatives: [{ category: ordered[altIndex], confidence: Math.max(0.05, 1 - topConfidence - 0.1) }],
    };
  }
}

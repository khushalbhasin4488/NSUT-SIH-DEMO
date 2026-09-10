export interface InstrumentRecognitionResult {
  predictedCategory: string;
  confidence: number;
  alternatives: Array<{ category: string; confidence: number }>;
}

/**
 * Swap MockInstrumentRecognitionProvider for a real computer-vision model
 * (e.g. a fine-tuned classifier or an LLM vision call) by binding the
 * INSTRUMENT_RECOGNITION_PROVIDER token in app.module.ts, gated behind an
 * env var such as VISION_API_KEY.
 */
export interface InstrumentRecognitionProvider {
  recognize(objectKey: string): Promise<InstrumentRecognitionResult>;
}

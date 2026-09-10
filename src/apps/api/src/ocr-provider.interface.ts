export interface OcrResult {
  fields: Record<string, string>;
  confidence: number;
}

/**
 * Swap MockOcrProvider (see mock-ocr.provider.ts) for a real implementation
 * (e.g. AWS Textract, Google Document AI, an LLM vision call) by binding the
 * OCR_PROVIDER token in app.module.ts to a class implementing this
 * interface, gated behind an env var such as OCR_API_KEY.
 */
export interface OcrProvider {
  extract(objectKey: string, documentType: string): Promise<OcrResult>;
}

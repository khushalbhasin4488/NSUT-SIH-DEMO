import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { OcrProvider, OcrResult } from './ocr-provider.interface';

const FIELD_TEMPLATES: Record<string, (seed: number) => Record<string, string>> = {
  KYC_ID: (seed) => ({ fullName: 'Ramesh Kumar', idType: 'Aadhaar', idNumber: `XXXX-XXXX-${1000 + (seed % 9000)}`, dateOfBirth: '1985-04-12' }),
  KYC_ADDRESS: (seed) => ({ addressLine1: `${100 + (seed % 900)} Industrial Area`, city: 'New Delhi', pincode: `1100${10 + (seed % 90)}` }),
  GSTIN_CERTIFICATE: (seed) => ({ gstin: `07AAAAA${1000 + (seed % 9000)}A1Z5`, legalName: 'Demo Business Pvt Ltd', registrationDate: '2019-07-01' }),
  UDYAM_CERTIFICATE: (seed) => ({ udyamNumber: `UDYAM-DL-01-00${(seed % 900000).toString().padStart(6, '0')}`, enterpriseName: 'Demo Business Pvt Ltd', category: 'Small' }),
};

@Injectable()
export class MockOcrProvider implements OcrProvider {
  async extract(objectKey: string, documentType: string): Promise<OcrResult> {
    const seed = parseInt(createHash('sha256').update(objectKey).digest('hex').slice(0, 8), 16);
    const template = FIELD_TEMPLATES[documentType] ?? (() => ({ note: 'No extraction template for this document type' }));
    const confidence = 0.7 + (seed % 25) / 100;
    return { fields: template(seed), confidence: Math.min(confidence, 0.97) };
  }
}

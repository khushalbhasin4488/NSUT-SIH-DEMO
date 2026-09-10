import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { GstinVerification, GstUdyamProvider, UdyamVerification } from './gst-udyam-provider.interface';

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z1-9][A-Z0-9]$/;
const UDYAM_PATTERN = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

@Injectable()
export class MockGstUdyamProvider implements GstUdyamProvider {
  async verifyGstin(gstin: string): Promise<GstinVerification> {
    if (!GSTIN_PATTERN.test(gstin)) return { valid: false, status: 'INVALID_FORMAT' };
    const seed = createHash('sha256').update(gstin).digest('hex');
    return { valid: true, legalName: 'Demo Business Private Limited', tradeName: 'Demo Business', status: 'Active', registrationDate: `20${(parseInt(seed.slice(0, 2), 16) % 10).toString().padStart(2, '0')}-04-01` };
  }

  async verifyUdyam(udyamNumber: string): Promise<UdyamVerification> {
    if (!UDYAM_PATTERN.test(udyamNumber)) return { valid: false, status: 'INVALID_FORMAT' };
    return { valid: true, enterpriseName: 'Demo Business Private Limited', category: 'Small', status: 'Active' };
  }
}

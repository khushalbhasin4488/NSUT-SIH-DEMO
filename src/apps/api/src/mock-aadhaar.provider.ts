import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID, createHash } from 'crypto';
import { AadhaarEkycResult, AadhaarOtpRequest, AadhaarProvider } from './aadhaar-provider.interface';

const MOCK_OTP = '123456'; // fixed demo OTP; a real UIDAI integration never exposes this

@Injectable()
export class MockAadhaarProvider implements AadhaarProvider {
  private readonly pending = new Map<string, { last4: string; createdAt: number }>();

  async initiateOtp(aadhaarLast4: string, consentGiven: boolean): Promise<AadhaarOtpRequest> {
    if (!consentGiven) throw new BadRequestException('Explicit consent is required before initiating Aadhaar eKYC');
    if (!/^\d{4}$/.test(aadhaarLast4)) throw new BadRequestException('Provide only the last 4 digits of the Aadhaar number');
    const requestId = randomUUID();
    this.pending.set(requestId, { last4: aadhaarLast4, createdAt: Date.now() });
    const seed = parseInt(createHash('sha256').update(aadhaarLast4).digest('hex').slice(0, 8), 16);
    const mobileDigits = String(seed % 10000).padStart(4, '0');
    return { requestId, maskedMobile: `XXXXXX${mobileDigits}` };
  }

  async verifyOtp(requestId: string, otp: string): Promise<AadhaarEkycResult> {
    const request = this.pending.get(requestId);
    if (!request) throw new BadRequestException('Unknown or expired OTP request');
    if (otp !== MOCK_OTP) throw new BadRequestException('Incorrect OTP');
    this.pending.delete(requestId);
    const seed = parseInt(createHash('sha256').update(request.last4).digest('hex').slice(0, 8), 16);
    return {
      verified: true,
      nameMasked: `R**** K*****`,
      dobYear: `19${(70 + (seed % 30)).toString().padStart(2, '0')}`,
      genderMasked: 'M',
      addressMasked: `House No. XX, ***** Nagar, New Delhi - 1100${(seed % 90).toString().padStart(2, '0')}`,
    };
  }
}

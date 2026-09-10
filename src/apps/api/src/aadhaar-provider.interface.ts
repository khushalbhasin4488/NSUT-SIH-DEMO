export interface AadhaarOtpRequest {
  requestId: string;
  maskedMobile: string;
}

export interface AadhaarEkycResult {
  verified: boolean;
  nameMasked: string;
  dobYear: string;
  genderMasked: string;
  addressMasked: string;
}

/**
 * Modeled on UIDAI's AUA/KUA eKYC OTP flow: initiate OTP against the last
 * 4 digits of an Aadhaar number, then verify the OTP to receive a masked
 * eKYC response. A REAL implementation requires UIDAI AUA/KUA licensing
 * and signed XML requests — this interface exists so that work is a
 * provider swap (AADHAAR_PROVIDER token in app.module.ts), not a rewrite.
 *
 * Constraint that holds even in mock form: the full Aadhaar number is
 * NEVER persisted or returned anywhere in this system — only the last 4
 * digits (for OTP addressing) and masked eKYC fields. Callers must obtain
 * explicit consent before calling initiateOtp.
 */
export interface AadhaarProvider {
  initiateOtp(aadhaarLast4: string, consentGiven: boolean): Promise<AadhaarOtpRequest>;
  verifyOtp(requestId: string, otp: string): Promise<AadhaarEkycResult>;
}

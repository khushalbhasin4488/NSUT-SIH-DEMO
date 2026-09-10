export interface GstinVerification {
  valid: boolean;
  legalName?: string;
  tradeName?: string;
  status?: string;
  registrationDate?: string;
}

export interface UdyamVerification {
  valid: boolean;
  enterpriseName?: string;
  category?: string;
  status?: string;
}

/**
 * Modeled on the GST public search API (GSTIN format + registry lookup) and
 * the Udyam Registration verification API. Swap MockGstUdyamProvider for a
 * real implementation once GST_API_KEY / UDYAM_API_KEY are available, by
 * rebinding GST_UDYAM_PROVIDER in app.module.ts.
 */
export interface GstUdyamProvider {
  verifyGstin(gstin: string): Promise<GstinVerification>;
  verifyUdyam(udyamNumber: string): Promise<UdyamVerification>;
}

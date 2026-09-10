export interface DigiLockerConsent {
  requestId: string;
  consentUrl: string;
}

export interface DigiLockerIssuedDocument {
  docType: string;
  issuer: string;
  uri: string;
  issuedDate: string;
}

export interface DigiLockerPushResult {
  externalReference: string;
  status: 'DELIVERED' | 'FAILED';
  issuedUri: string;
}

/**
 * Modeled on the real DigiLocker Partner API shape: an OAuth-style consent
 * step (GET .../oauth2/1/authorize), a document pull
 * (GET .../oauth2/2/files/issued), and an issued-document push
 * (POST .../oauth2/1/document/issue). Swap MockDigiLockerProvider for a
 * real implementation once partner credentials (DIGILOCKER_CLIENT_ID /
 * DIGILOCKER_CLIENT_SECRET) are available, by rebinding DIGILOCKER_PROVIDER
 * in app.module.ts.
 */
export interface DigiLockerProvider {
  initiateConsent(stakeholderId: string): Promise<DigiLockerConsent>;
  pullIssuedDocuments(consentRequestId: string): Promise<DigiLockerIssuedDocument[]>;
  pushIssuedDocument(entityType: string, entityId: string, payload: Record<string, unknown>): Promise<DigiLockerPushResult>;
}

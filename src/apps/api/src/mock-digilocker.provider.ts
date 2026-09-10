import { Injectable } from '@nestjs/common';
import { randomUUID, createHash } from 'crypto';
import { DigiLockerConsent, DigiLockerIssuedDocument, DigiLockerProvider, DigiLockerPushResult } from './digilocker-provider.interface';

@Injectable()
export class MockDigiLockerProvider implements DigiLockerProvider {
  async initiateConsent(stakeholderId: string): Promise<DigiLockerConsent> {
    const requestId = randomUUID();
    return { requestId, consentUrl: `https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize?mock=1&state=${requestId}&stakeholder=${stakeholderId}` };
  }

  async pullIssuedDocuments(consentRequestId: string): Promise<DigiLockerIssuedDocument[]> {
    const seed = createHash('sha256').update(consentRequestId).digest('hex');
    return [
      { docType: 'AADHAAR', issuer: 'UIDAI', uri: `in.gov.uidaigov-${seed.slice(0, 10)}`, issuedDate: '2019-03-12' },
      { docType: 'PAN', issuer: 'INCOMETAX', uri: `in.gov.incometax-${seed.slice(10, 20)}`, issuedDate: '2015-08-01' },
    ];
  }

  async pushIssuedDocument(entityType: string, entityId: string, payload: Record<string, unknown>): Promise<DigiLockerPushResult> {
    const seed = createHash('sha256').update(`${entityType}:${entityId}:${JSON.stringify(payload)}`).digest('hex');
    return { externalReference: `DL-${seed.slice(0, 12).toUpperCase()}`, status: 'DELIVERED', issuedUri: `in.gov.legalmetrology-${seed.slice(12, 24)}` };
  }
}

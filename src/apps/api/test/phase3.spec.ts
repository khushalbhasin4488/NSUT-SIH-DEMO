import { ComplianceService } from '../src/compliance.service';
import { LedgerService } from '../src/ledger.service';
import { CertificatesService } from '../src/certificates.service';

describe('Phase 3 services', () => {
  it('generates a deterministic, sequence-scoped certificate number', () => {
    const service = new CertificatesService(undefined as any, new LedgerService());
    const certNo = service.generateCertNo('11111111-2222-3333-4444-555555555555', 7);
    expect(certNo).toBe(`LM-${new Date().getFullYear()}-11111111-0007`);
  });

  it('returns cited compliance sources', () => {
    const result = new ComplianceService().answer('What is the verification validity period?', [{ id: '1', title: 'General Rules', sectionRef: 'Rule 27', paragraph: 'The instrument shall be verified before use and periodically thereafter.' }]);
    expect(result.citations[0].sectionRef).toBe('Rule 27');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('creates deterministic chained hashes', () => {
    const ledger = new LedgerService();
    const payload = ledger.hash('{"cert":"LM-1"}');
    expect(ledger.entryHash(payload, null, 'CERTIFICATE', 'LM-1')).toHaveLength(64);
    expect(ledger.entryHash(payload, null, 'CERTIFICATE', 'LM-1')).toBe(ledger.entryHash(payload, null, 'CERTIFICATE', 'LM-1'));
  });
});

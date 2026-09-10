import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { PrismaService } from './prisma.service';
import { LedgerService } from './ledger.service';

type CertificateWithDetails = {
  id: string;
  certNo: string;
  qrHash: string;
  validFrom: Date;
  validUntil: Date;
  digitalSignature: string | null;
  status: string;
  verification: {
    result: string;
    officerId: string;
    observations: unknown;
    application: {
      instrument: { category: string; serialNo: string; model: string | null };
      applicant: { name: string };
    };
  };
};

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: LedgerService) {}

  generateCertNo(applicationId: string, sequence: number) {
    const year = new Date().getFullYear();
    return `LM-${year}-${applicationId.slice(0, 8).toUpperCase()}-${String(sequence).padStart(4, '0')}`;
  }

  async issue(verificationId: string, applicationId: string, officerId: string) {
    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setFullYear(now.getFullYear() + 1);
    const sequence = (await this.prisma.certificate.count()) + 1;
    const certNo = this.generateCertNo(applicationId, sequence);
    const payload = { certNo, verificationId, applicationId, officerId, validFrom: now.toISOString(), validUntil: validUntil.toISOString() };
    const qrHash = this.ledger.hash(JSON.stringify(payload));

    const certificate = await this.prisma.certificate.create({
      data: {
        verificationId,
        certNo,
        qrHash,
        validFrom: now,
        validUntil,
        digitalSignature: `${officerId}:${qrHash.slice(0, 16)}`,
      },
    });

    const previous = await this.prisma.ledgerEntry.findFirst({ orderBy: { anchoredAt: 'desc' } });
    const entryHash = this.ledger.entryHash(qrHash, previous?.entryHash ?? null, 'certificate', certificate.id);
    await this.prisma.ledgerEntry.create({
      data: { entityType: 'certificate', entityId: certificate.id, payloadHash: qrHash, previousHash: previous?.entryHash, entryHash },
    });

    return certificate;
  }

  async revoke(certNo: string, actorId: string, reason: string) {
    const certificate = await this.prisma.certificate.findUniqueOrThrow({ where: { certNo } });
    if (certificate.status === 'REVOKED') return certificate;

    const updated = await this.prisma.certificate.update({ where: { certNo }, data: { status: 'REVOKED' } });

    await this.prisma.auditLog.create({
      data: { actorId, action: 'CERTIFICATE_REVOKED', entityType: 'certificate', entityId: certificate.id, metadata: { reason } },
    });

    const payloadHash = this.ledger.hash(JSON.stringify({ certNo, action: 'REVOKED', reason, actorId, at: new Date().toISOString() }));
    const previous = await this.prisma.ledgerEntry.findFirst({ orderBy: { anchoredAt: 'desc' } });
    const entryHash = this.ledger.entryHash(payloadHash, previous?.entryHash ?? null, 'certificate_revocation', certificate.id);
    await this.prisma.ledgerEntry.create({
      data: { entityType: 'certificate_revocation', entityId: certificate.id, payloadHash, previousHash: previous?.entryHash, entryHash },
    });

    return updated;
  }

  async history(certNo: string) {
    const certificate = await this.prisma.certificate.findUniqueOrThrow({ where: { certNo } });
    const [ledgerEntries, auditLogs] = await Promise.all([
      this.prisma.ledgerEntry.findMany({ where: { entityId: certificate.id }, orderBy: { anchoredAt: 'asc' } }),
      this.prisma.auditLog.findMany({ where: { entityType: 'certificate', entityId: certificate.id }, orderBy: { createdAt: 'asc' } }),
    ]);
    return { certificate, ledgerEntries, auditLogs };
  }

  async renderPdf(certNo: string): Promise<Buffer> {
    const certificate = (await this.prisma.certificate.findUniqueOrThrow({
      where: { certNo },
      include: { verification: { include: { application: { include: { instrument: true, applicant: true } } } } },
    })) as unknown as CertificateWithDetails;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Certificate of Verification', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11).text('Legal Metrology Department', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(12);
      doc.text(`Certificate No: ${certificate.certNo}`);
      doc.text(`Status: ${certificate.status}`);
      doc.moveDown();
      doc.text(`Applicant: ${certificate.verification.application.applicant.name}`);
      doc.text(`Instrument Category: ${certificate.verification.application.instrument.category}`);
      doc.text(`Serial No: ${certificate.verification.application.instrument.serialNo}`);
      if (certificate.verification.application.instrument.model) {
        doc.text(`Model: ${certificate.verification.application.instrument.model}`);
      }
      doc.moveDown();
      doc.text(`Verification Result: ${certificate.verification.result}`);
      doc.text(`Valid From: ${certificate.validFrom.toDateString()}`);
      doc.text(`Valid Until: ${certificate.validUntil.toDateString()}`);
      doc.moveDown();
      doc.text(`Digital Signature: ${certificate.digitalSignature ?? 'N/A'}`);
      doc.text(`Certificate Hash: ${certificate.qrHash}`);
      doc.moveDown(2);
      doc.fontSize(9).fillColor('gray').text('Verify this certificate at the public verification portal using the certificate number above.', { align: 'center' });

      doc.end();
    });
  }
}

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const entryHash = (payloadHash: string, previousHash: string | null, entityType: string, entityId: string) =>
  hash(`${payloadHash}:${previousHash ?? 'GENESIS'}:${entityType}:${entityId}`);

async function anchorLedger(entityType: string, entityId: string, payload: Record<string, unknown>) {
  const payloadHash = hash(JSON.stringify(payload));
  const previous = await prisma.ledgerEntry.findFirst({ orderBy: { anchoredAt: 'desc' } });
  const newEntryHash = entryHash(payloadHash, previous?.entryHash ?? null, entityType, entityId);
  return prisma.ledgerEntry.create({
    data: { entityType, entityId, payloadHash, previousHash: previous?.entryHash, entryHash: newEntryHash },
  });
}

async function issueCertificate(verificationId: string, applicationId: string, officerId: string, certNo: string, validFrom: Date, validUntil: Date) {
  const payload = { certNo, verificationId, applicationId, officerId, validFrom: validFrom.toISOString(), validUntil: validUntil.toISOString() };
  const qrHash = hash(JSON.stringify(payload));
  const certificate = await prisma.certificate.create({
    data: { verificationId, certNo, qrHash, validFrom, validUntil, digitalSignature: `${officerId}:${qrHash.slice(0, 16)}`, status: 'ACTIVE' },
  });
  await anchorLedger('certificate', certificate.id, { certNo, action: 'ISSUED' });
  return certificate;
}

const CATEGORIES: Array<[string, string]> = [
  ['WEIGHING_SCALE', 'Weighing scale'],
  ['WEIGHBRIDGE', 'Weighbridge'],
  ['FUEL_DISPENSER', 'Fuel dispenser'],
  ['WATER_METER', 'Water meter'],
  ['GAS_METER', 'Gas meter'],
  ['TAXI_METER', 'Taxi / auto meter'],
];

async function main() {
  // --- Lookup / compliance seed documents -------------------------------
  for (const [, label] of CATEGORIES) {
    const existing = await prisma.complianceDocument.findFirst({ where: { title: label, sectionRef: 'Lookup' } });
    if (!existing) await prisma.complianceDocument.create({ data: { title: label, sectionRef: 'Lookup', paragraph: `${label} is an instrument category supported by the Legal Metrology platform.` } });
  }
  const complianceDocs = [
    { title: 'Certificate validity', sectionRef: 'Rule 27', paragraph: 'A verification certificate issued under these rules is valid for a period of one year from the date of issue, unless suspended or revoked earlier.' },
    { title: 'Verification fee refunds', sectionRef: 'Rule 41', paragraph: 'Fees paid for verification are non-refundable once an appointment has been scheduled, except where the department cancels the appointment.' },
    { title: 'Calibration frequency for weighing instruments', sectionRef: 'Schedule III', paragraph: 'Commercial weighing scales in continuous use must be re-verified annually; weighbridges used for trade must be re-verified every six months.' },
  ];
  for (const doc of complianceDocs) {
    const existing = await prisma.complianceDocument.findFirst({ where: { title: doc.title, sectionRef: doc.sectionRef } });
    if (!existing) await prisma.complianceDocument.create({ data: doc });
  }

  // --- Fee configuration ---------------------------------------------------
  const fees: Array<[string, number]> = [
    ['WEIGHING_SCALE', 500],
    ['WEIGHBRIDGE', 2500],
    ['FUEL_DISPENSER', 750],
    ['WATER_METER', 300],
    ['GAS_METER', 350],
    ['TAXI_METER', 400],
  ];
  for (const [category, amount] of fees) {
    await prisma.feeConfig.upsert({
      where: { category_serviceType: { category, serviceType: 'VERIFICATION' } },
      update: { amount },
      create: { category, serviceType: 'VERIFICATION', amount },
    });
  }

  // --- Stakeholders (matching the Keycloak demo users by email) -----------
  const officer = await prisma.stakeholder.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { email: 'officer@example.gov.in', kycStatus: 'VERIFIED' },
    create: { id: '00000000-0000-0000-0000-000000000001', role: 'LMO', stateCode: 'DL', districtCode: 'Central', name: 'Demo Legal Metrology Officer', email: 'officer@example.gov.in', phone: '9810000001', kycStatus: 'VERIFIED', emailVerified: true, phoneVerified: true },
  });
  const business = await prisma.stakeholder.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: { email: 'business@example.com', kycStatus: 'VERIFIED' },
    create: { id: '00000000-0000-0000-0000-000000000002', role: 'BUSINESS', stateCode: 'DL', districtCode: 'Central', name: 'Demo Business Pvt Ltd', email: 'business@example.com', phone: '9810000002', gstin: '07AAAAA0000A1Z5', kycStatus: 'VERIFIED', emailVerified: true, phoneVerified: true },
  });
  const gatc = await prisma.stakeholder.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: { email: 'gatc@example.gov.in', kycStatus: 'VERIFIED' },
    create: { id: '00000000-0000-0000-0000-000000000003', role: 'GATC', stateCode: 'DL', districtCode: 'Central', name: 'Demo Approved Test Centre', email: 'gatc@example.gov.in', phone: '9810000003', kycStatus: 'VERIFIED', emailVerified: true, phoneVerified: true },
  });
  const stateAdmin = await prisma.stakeholder.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: { email: 'stateadmin@example.gov.in', kycStatus: 'VERIFIED' },
    create: { id: '00000000-0000-0000-0000-000000000004', role: 'STATE_ADMIN', stateCode: 'DL', districtCode: 'Central', name: 'Demo State Admin', email: 'stateadmin@example.gov.in', phone: '9810000004', kycStatus: 'VERIFIED', emailVerified: true, phoneVerified: true },
  });
  await prisma.stakeholder.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: { email: 'admin@example.gov.in', kycStatus: 'VERIFIED' },
    create: { id: '00000000-0000-0000-0000-000000000005', role: 'CENTRAL_ADMIN', stateCode: 'DL', name: 'Demo Central Admin', email: 'admin@example.gov.in', phone: '9810000005', kycStatus: 'VERIFIED', emailVerified: true, phoneVerified: true },
  });
  const secondBusiness = await prisma.stakeholder.upsert({
    where: { id: '00000000-0000-0000-0000-000000000006' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000006', role: 'BUSINESS', stateCode: 'MH', districtCode: 'Mumbai', name: 'Sunrise Traders', email: 'sunrise.traders@example.com', phone: '9820000006', kycStatus: 'PENDING', emailVerified: false, phoneVerified: true },
  });

  await prisma.stakeholderDocument.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000d1' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000d1', stakeholderId: business.id, documentType: 'KYC_ID', fileName: 'business-pan-card.pdf', objectKey: 'demo/business-pan-card.pdf', status: 'VERIFIED' },
  });
  await prisma.stakeholderDocument.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000d2' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000d2', stakeholderId: secondBusiness.id, documentType: 'GSTIN_CERTIFICATE', fileName: 'sunrise-gstin.pdf', objectKey: 'demo/sunrise-gstin.pdf', status: 'PENDING' },
  });

  // --- Instruments -----------------------------------------------------
  const instrument = async (ownerId: string, category: string, serialNo: string, model: string) =>
    prisma.instrument.upsert({
      where: { ownerId_serialNo: { ownerId, serialNo } },
      update: {},
      create: { ownerId, category, serialNo, model, specs: { capacityKg: category === 'WEIGHING_SCALE' ? 100 : undefined } },
    });

  const scale1 = await instrument(business.id, 'WEIGHING_SCALE', 'WS-DL-1001', 'Avery AV-200');
  const scale2 = await instrument(business.id, 'WEIGHING_SCALE', 'WS-DL-1002', 'Avery AV-200');
  const dispenser = await instrument(business.id, 'FUEL_DISPENSER', 'FD-DL-2001', 'Gilbarco Encore 700');
  const waterMeter = await instrument(business.id, 'WATER_METER', 'WM-DL-3001', 'Kent AquaMeter');
  const gasMeter = await instrument(business.id, 'GAS_METER', 'GM-DL-4001', 'Itron G4');
  const sunriseScale = await instrument(secondBusiness.id, 'WEIGHING_SCALE', 'WS-MH-5001', 'Essae DS-815');

  // --- Fixed mock intelligence records -----------------------------------
  // Every seeded document and instrument gets a repeatable AI record so the
  // evaluator can open the intelligence queue without first uploading files.
  const mockAiId = (key: string) => `${hash(`demo-ai:${key}`).slice(0, 8)}-${hash(`demo-ai:${key}`).slice(8, 12)}-4${hash(`demo-ai:${key}`).slice(13, 16)}-8${hash(`demo-ai:${key}`).slice(17, 20)}-${hash(`demo-ai:${key}`).slice(20, 32)}`;
  const seedAi = async (key: string, data: Parameters<typeof prisma.aiOutput.upsert>[0]['create']) => prisma.aiOutput.upsert({ where: { id: mockAiId(key) }, update: { result: data.result, confidence: data.confidence, lowConfidence: data.lowConfidence, status: data.status }, create: { ...data, id: mockAiId(key) } });
  const demoInstruments = [scale1, scale2, dispenser, waterMeter, gasMeter, sunriseScale];
  for (const item of demoInstruments) {
    await seedAi(`recognition:${item.id}`, {
      kind: 'INSTRUMENT_RECOGNITION', instrumentId: item.id, inputObjectKey: `demo/intelligence/${item.serialNo}.jpg`,
      result: { category: item.category, model: item.model ?? 'Demo evaluator model', serialNo: item.serialNo, capacity: '100 kg', sealDetected: true, alternatives: [{ category: item.category, confidence: 0.91 }] },
      confidence: 0.91, lowConfidence: false, status: 'PENDING_REVIEW',
    });
  }
  const demoDocuments = await prisma.stakeholderDocument.findMany({ where: { stakeholderId: { in: [business.id, secondBusiness.id] } } });
  for (const document of demoDocuments) {
    await seedAi(`ocr:${document.id}`, {
      kind: 'OCR', stakeholderId: document.stakeholderId, documentType: document.documentType, inputObjectKey: document.objectKey,
      result: { documentType: document.documentType, fullName: document.stakeholderId === business.id ? business.name : secondBusiness.name, idType: 'PAN', idNumber: 'ABCDE1234F', addressLine1: '14 Industrial Area', city: 'New Delhi', pincode: '110020', gstin: business.gstin ?? '07AAAAA0000A1Z5', legalName: 'Demo Business Pvt Ltd', registrationDate: '2019-07-01', udyamNumber: 'UDYAM-DL-01-000001', enterpriseName: 'Demo Business Pvt Ltd', category: 'Small' },
      confidence: 0.94, lowConfidence: false, status: 'PENDING_REVIEW',
    });
  }

  // --- Applications across the full status range ------------------------
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  await prisma.application.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000a1' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000a1', applicantId: business.id, instrumentId: gasMeter.id, status: 'DRAFT', feeAmount: 350 },
  });

  const appSubmitted = await prisma.application.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000a2' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000a2', applicantId: business.id, instrumentId: waterMeter.id, status: 'SUBMITTED', feeAmount: 300, submittedAt: daysAgo(1) },
  });

  await prisma.application.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000a3' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000a3', applicantId: secondBusiness.id, instrumentId: sunriseScale.id, status: 'UNDER_REVIEW', feeAmount: 500, submittedAt: daysAgo(3) },
  });

  const appScheduled = await prisma.application.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000a4' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000a4', applicantId: business.id, instrumentId: dispenser.id, status: 'SCHEDULED', feeAmount: 750, submittedAt: daysAgo(4), assignedOfficerId: officer.id, scheduledAt: daysFromNow(1) },
  });

  const appPassed = await prisma.application.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000a5' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000a5', applicantId: business.id, instrumentId: scale1.id, status: 'CERTIFICATE_ISSUED', feeAmount: 500, submittedAt: daysAgo(20), assignedOfficerId: officer.id, scheduledAt: daysAgo(15) },
  });

  const appExpiringSoon = await prisma.application.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000a6' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000a6', applicantId: secondBusiness.id, instrumentId: scale1.id, status: 'CERTIFICATE_ISSUED', feeAmount: 500, submittedAt: daysAgo(358), assignedOfficerId: officer.id, scheduledAt: daysAgo(353) },
  });

  const appFailed = await prisma.application.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000a7' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000a7', applicantId: business.id, instrumentId: scale2.id, status: 'VERIFICATION_FAILED', feeAmount: 500, submittedAt: daysAgo(10), assignedOfficerId: officer.id, scheduledAt: daysAgo(7) },
  });

  await prisma.application.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000a8' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000a8', applicantId: secondBusiness.id, instrumentId: sunriseScale.id, status: 'REJECTED', feeAmount: 500, submittedAt: daysAgo(30) },
  });

  // --- Demo week schedule --------------------------------------------------
  // Keep a full week of appointments available for evaluator walkthroughs.
  const demoWeek = [
    ['00000000-0000-0000-0000-000000000a10', 'WS-DEMO-WEEK-01', '2026-09-21', '09:00', 'WEIGHING_SCALE'],
    ['00000000-0000-0000-0000-000000000a11', 'WS-DEMO-WEEK-02', '2026-09-22', '10:30', 'WEIGHBRIDGE'],
    ['00000000-0000-0000-0000-000000000a12', 'WS-DEMO-WEEK-03', '2026-09-23', '11:00', 'FUEL_DISPENSER'],
    ['00000000-0000-0000-0000-000000000a13', 'WS-DEMO-WEEK-04', '2026-09-24', '09:30', 'WEIGHING_SCALE'],
    ['00000000-0000-0000-0000-000000000a14', 'WS-DEMO-WEEK-05', '2026-09-25', '13:00', 'WATER_METER'],
    ['00000000-0000-0000-0000-000000000a15', 'WS-DEMO-WEEK-06', '2026-09-26', '10:00', 'GAS_METER'],
    ['00000000-0000-0000-0000-000000000a16', 'WS-DEMO-WEEK-07', '2026-09-27', '14:30', 'WEIGHING_SCALE'],
  ] as const;
  for (const [id, serialNo, date, time, category] of demoWeek) {
    const demoInstrument = await instrument(business.id, category, serialNo, 'Demo evaluator model');
    await prisma.application.upsert({
      where: { id },
      update: { status: 'SCHEDULED', assignedOfficerId: officer.id, scheduledAt: new Date(`${date}T${time}:00+05:30`) },
      create: { id, applicantId: business.id, instrumentId: demoInstrument.id, status: 'SCHEDULED', feeAmount: 500, submittedAt: new Date(`${date}T07:30:00+05:30`), assignedOfficerId: officer.id, scheduledAt: new Date(`${date}T${time}:00+05:30`) },
    });
  }
  // Include the evaluator-week instruments in the same fixed intelligence set.
  const allDemoInstruments = await prisma.instrument.findMany({ where: { ownerId: { in: [business.id, secondBusiness.id] } } });
  for (const item of allDemoInstruments) {
    await seedAi(`recognition:${item.id}`, {
      kind: 'INSTRUMENT_RECOGNITION', instrumentId: item.id, inputObjectKey: `demo/intelligence/${item.serialNo}.jpg`,
      result: { category: item.category, model: item.model ?? 'Demo evaluator model', serialNo: item.serialNo, capacity: '100 kg', sealDetected: true, alternatives: [{ category: item.category, confidence: 0.91 }] },
      confidence: 0.91, lowConfidence: false, status: 'PENDING_REVIEW',
    });
  }

  // --- Payments ----------------------------------------------------------
  const payment = async (id: string, applicationId: string, amount: number, status: string, idempotencyKey: string, receiptNo?: string) =>
    prisma.payment.upsert({
      where: { id },
      update: {},
      create: { id, applicationId, amount, status, idempotencyKey, providerReference: status === 'SUCCESS' ? `MOCK-${idempotencyKey}` : null, receiptNo },
    });

  await payment('00000000-0000-0000-0000-0000000000b1', appScheduled.id, 750, 'SUCCESS', 'seed-pay-a4', 'RCPT-2026-SEEDA4');
  await payment('00000000-0000-0000-0000-0000000000b2', appPassed.id, 500, 'SUCCESS', 'seed-pay-a5', 'RCPT-2026-SEEDA5');
  await payment('00000000-0000-0000-0000-0000000000b3', appExpiringSoon.id, 500, 'SUCCESS', 'seed-pay-a6', 'RCPT-2026-SEEDA6');
  await payment('00000000-0000-0000-0000-0000000000b4', appFailed.id, 500, 'SUCCESS', 'seed-pay-a7', 'RCPT-2026-SEEDA7');
  await payment('00000000-0000-0000-0000-0000000000b5', appSubmitted.id, 300, 'FAILED', 'seed-pay-a2');
  await prisma.payment.update({ where: { id: '00000000-0000-0000-0000-0000000000b4' }, data: { status: 'REFUND_PENDING' } });

  // --- Verifications + certificates --------------------------------------
  const verificationPassed = await prisma.verificationRecord.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000c1' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000c1', applicationId: appPassed.id, officerId: officer.id, result: 'PASS', observations: { accuracyDeviationGrams: 2, sealIntact: true }, photos: ['demo/verification-a5-1.jpg'], signatureObjectKey: 'demo/signatures/officer-a5.png', signedAt: daysAgo(15), verifiedAt: daysAgo(15) },
  });
  const certPassedExisting = await prisma.certificate.findUnique({ where: { verificationId: verificationPassed.id } });
  if (!certPassedExisting) {
    await issueCertificate(verificationPassed.id, appPassed.id, officer.id, 'LM-2026-DEMOA5-0001', daysAgo(15), daysFromNow(350));
  }

  const verificationExpiring = await prisma.verificationRecord.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000c2' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000c2', applicationId: appExpiringSoon.id, officerId: officer.id, result: 'PASS', observations: { accuracyDeviationGrams: 1, sealIntact: true }, photos: ['demo/verification-a6-1.jpg'], signatureObjectKey: 'demo/signatures/officer-a6.png', signedAt: daysAgo(353), verifiedAt: daysAgo(353) },
  });
  const certExpiringExisting = await prisma.certificate.findUnique({ where: { verificationId: verificationExpiring.id } });
  if (!certExpiringExisting) {
    await issueCertificate(verificationExpiring.id, appExpiringSoon.id, officer.id, 'LM-2026-DEMOA6-0002', daysAgo(353), daysFromNow(7));
  }

  await prisma.verificationRecord.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000c3' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000c3', applicationId: appFailed.id, officerId: officer.id, result: 'FAIL', observations: { accuracyDeviationGrams: 45, sealIntact: false, remark: 'Tamper-evident seal broken; reading drifts beyond tolerance' }, photos: ['demo/verification-a7-1.jpg'], verifiedAt: daysAgo(7) },
  });

  // --- Fraud scores --------------------------------------------------------
  await prisma.fraudScore.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000e1' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000e1', subjectType: 'OFFICER', subjectId: officer.id, score: 18, riskLevel: 'LOW', reasons: ['Pass rate within expected range', 'No duplicate serial matches'], modelVersion: 'phase2-rules-v1' },
  });
  await prisma.fraudScore.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000e2' },
    update: {},
    create: { id: '00000000-0000-0000-0000-0000000000e2', subjectType: 'GATC', subjectId: gatc.id, score: 62, riskLevel: 'MEDIUM', reasons: ['Pass rate above 98% over last 30 verifications', 'One duplicate serial match flagged'], modelVersion: 'phase2-rules-v1' },
  });

  // --- Alerts (mixed delivery states) --------------------------------------
  const alert = async (id: string, channel: string, template: string, recipient: string, status: string, applicationId?: string, stakeholderId?: string) =>
    prisma.alert.upsert({
      where: { id },
      update: {},
      create: { id, channel: channel as any, template, recipient, payload: { subject: template, body: `Demo ${template.toLowerCase()} notification` }, status, sentAt: status === 'SENT' ? daysAgo(1) : null, applicationId, stakeholderId, attempts: status === 'FAILED' ? 3 : status === 'SENT' ? 1 : 0, failureReason: status === 'FAILED' ? 'Invalid recipient number' : null },
    });

  await alert('00000000-0000-0000-0000-0000000000f1', 'EMAIL', 'CERTIFICATE_ISSUED', business.email!, 'SENT', appPassed.id, business.id);
  await alert('00000000-0000-0000-0000-0000000000f2', 'EMAIL', 'APPOINTMENT_SCHEDULED', business.email!, 'SENT', appScheduled.id, business.id);
  await alert('00000000-0000-0000-0000-0000000000f3', 'SMS', 'VERIFICATION_FAILED', business.phone!, 'SENT', appFailed.id, business.id);
  await alert('00000000-0000-0000-0000-0000000000f4', 'SMS', 'PAYMENT_FAILED', '9999999999', 'FAILED', appSubmitted.id, business.id);
  await alert('00000000-0000-0000-0000-0000000000f5', 'EMAIL', 'EXPIRY_REMINDER', secondBusiness.email!, 'QUEUED', appExpiringSoon.id, secondBusiness.id);

  console.log('Seed complete.');
  console.log('Demo Keycloak logins (all password Demo@12345):');
  console.log('  business@example.com      -> BUSINESS');
  console.log('  officer@example.gov.in    -> LMO');
  console.log('  gatc@example.gov.in       -> GATC');
  console.log('  stateadmin@example.gov.in -> STATE_ADMIN');
  console.log('  admin@example.gov.in      -> CENTRAL_ADMIN');
  console.log(`Stakeholders: officer=${officer.id} business=${business.id} gatc=${gatc.id} stateAdmin=${stateAdmin.id}`);
}

main().finally(() => prisma.$disconnect());

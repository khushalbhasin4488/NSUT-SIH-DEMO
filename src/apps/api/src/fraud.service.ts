import { Injectable } from '@nestjs/common';

export type FraudFeatures = { officerPassRate?: number; gatcPassRate?: number; repeatFailures?: number; inspectionDurationMinutes?: number; duplicateSerialMatches?: number };

@Injectable()
export class FraudService {
  score(features: FraudFeatures) {
    const reasons: string[] = [];
    let score = 0;
    if ((features.officerPassRate ?? 0) > 0.98) { score += 25; reasons.push('Officer pass rate is unusually high'); }
    if ((features.gatcPassRate ?? 0) > 0.98) { score += 25; reasons.push('GATC pass rate is unusually high'); }
    if ((features.repeatFailures ?? 0) >= 3) { score += 20; reasons.push('Instrument has repeated failed verifications'); }
    if ((features.inspectionDurationMinutes ?? 999) < 5) { score += 15; reasons.push('Inspection duration is below the five-minute review threshold'); }
    if ((features.duplicateSerialMatches ?? 0) > 0) { score += 30; reasons.push('Serial number matches another instrument record'); }
    score = Math.min(score, 100);
    return { score, riskLevel: score >= 70 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW', reasons, modelVersion: 'phase2-rules-v1' };
  }
}

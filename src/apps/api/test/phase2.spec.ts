import { FraudService } from '../src/fraud.service';
import { ScheduleService } from '../src/schedule.service';

describe('Phase 2 services', () => {
  it('scores explainable high-risk patterns', () => {
    const result = new FraudService().score({ officerPassRate: 0.995, repeatFailures: 4, duplicateSerialMatches: 1 });
    expect(result.riskLevel).toBe('HIGH');
    expect(result.reasons.length).toBeGreaterThan(1);
  });

  it('respects route capacity and returns unscheduled visits', () => {
    const result = new ScheduleService().optimize([
      { id: 'a', latitude: 1, longitude: 1, durationMinutes: 200 },
      { id: 'b', latitude: 2, longitude: 2, durationMinutes: 200 },
      { id: 'c', latitude: 3, longitude: 3, durationMinutes: 200 },
    ], { latitude: 0, longitude: 0 }, 480);
    expect(result.route.length).toBe(2);
    expect(result.unscheduled.length).toBe(1);
  });
});

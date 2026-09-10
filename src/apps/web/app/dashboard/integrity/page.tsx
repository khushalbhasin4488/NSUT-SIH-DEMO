'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader, Status } from '../../components/ui';
import { getToken } from '../../auth';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
type FraudScore = { id: string; subjectType: string; subjectId: string; score: number; riskLevel: string; reasons: string[]; createdAt: string };
const tone = (riskLevel: string) => (riskLevel === 'HIGH' ? 'red' : riskLevel === 'MEDIUM' ? 'amber' : 'green');
export default function Integrity() {
  const [signals, setSignals] = useState<FraudScore[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/fraud/recent`, { headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {} })
      .then((r) => (r.ok ? r.json() : []))
      .then(setSignals)
      .finally(() => setLoading(false));
  }, []);
  const high = signals.filter((s) => s.riskLevel === 'HIGH').length;
  const medium = signals.filter((s) => s.riskLevel === 'MEDIUM').length;
  return (
    <>
      <PageHeader eyebrow="INTELLIGENCE / INTEGRITY" title="Integrity signals" description="Explainable anomalies surfaced for human review. No decision is automated." />
      <div className="risk-banner">
        <div className="risk-score">{String(signals.length).padStart(2, '0')}</div>
        <div><b>Signals require attention</b><span>{high} high-risk signals · {medium} medium-risk signals · {loading ? 'Loading…' : `${signals.length} scored records`}</span></div>
        <button className="light-button">Export review pack</button>
      </div>
      {!loading && signals.length === 0 && <p className="muted">No fraud scores have been recorded yet. Scores appear here once POST /fraud/score is called for an officer or GATC.</p>}
      <div className="signal-list">
        {signals.map((s) => (
          <div className="signal-card" key={s.id}>
            <div className={`signal-icon ${tone(s.riskLevel) === 'red' ? 'red-bg' : 'amber-bg'}`}>!</div>
            <div className="signal-content">
              <div>
                <span className="eyebrow">{s.subjectType} · {s.subjectId.slice(0, 8)}</span>
                <h3>{s.reasons[0] ?? 'Anomaly detected'}</h3>
                <p>{s.reasons.slice(1).join(' · ') || `Score ${s.score}/100`}</p>
              </div>
              <Status tone={tone(s.riskLevel) as any}>{s.riskLevel} risk</Status>
            </div>
            <Link className="row-more" href="#">Review →</Link>
          </div>
        ))}
      </div>
    </>
  );
}

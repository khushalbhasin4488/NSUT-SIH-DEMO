'use client';
import { useEffect, useState } from 'react';
import { Icon } from '../../../components/icons';
import { getToken } from '../../../auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const headers = () => ({ 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) });

type SyncRow = { id: string; system: string; status: string; externalReference: string | null; entityId: string };

export default function DeliveryStatus({ certNo }: { certNo: string }) {
  const [rows, setRows] = useState<SyncRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const certRes = await fetch(`${API}/certificates/${encodeURIComponent(certNo)}`);
    if (!certRes.ok) { setLoading(false); return; }
    const cert = await certRes.json();
    const syncRes = await fetch(`${API}/integrations/sync`, { headers: headers() });
    const all: SyncRow[] = syncRes.ok ? await syncRes.json() : [];
    setRows(all.filter((r) => r.entityId === cert.id));
    setLoading(false);
  };
  useEffect(() => { load(); }, [certNo]);

  const dispatch = async () => {
    setBusy(true);
    await fetch(`${API}/integrations/dispatch`, { method: 'POST', headers: headers() });
    await load();
    setBusy(false);
  };

  return (
    <div className="section-card">
      <span className="eyebrow">EXTERNAL DELIVERY</span>
      <h2 className="side-heading">DigiLocker &amp; UMANG</h2>
      {loading && <p className="muted">Loading…</p>}
      {!loading && rows.length === 0 && <p className="muted">No delivery queued for this certificate yet.</p>}
      {rows.map((r) => (
        <div className="verification-item" key={r.id}>
          <span><Icon name={r.status === 'SENT' ? 'check' : 'clock'} size={11} /></span>
          <div>
            <b>{r.system}</b>
            <small>{r.status}{r.externalReference ? ` · ${r.externalReference}` : ''}</small>
          </div>
        </div>
      ))}
      {rows.some((r) => r.status === 'QUEUED') && (
        <div className="form-actions" style={{ marginTop: 10 }}>
          <button className="ghost-button small-button" disabled={busy} onClick={dispatch}>Dispatch now</button>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState } from 'react';
import { Icon } from '../../components/icons';
import { getToken } from '../../auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const headers = () => ({ 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) });

const SAMPLE_RECORDS = JSON.stringify(
  [
    { sourceRecordId: 'MH-REC-001', payload: { business_name: 'Old Traders Co', state: 'MH' } },
    { sourceRecordId: 'MH-REC-002', payload: { business_name: 'Riverside Depot', state: 'MH' } },
  ],
  null,
  2,
);

export default function LegacyImport() {
  const [sourceSystem, setSourceSystem] = useState('MH_LEGACY_LMD');
  const [mapFrom, setMapFrom] = useState('business_name');
  const [mapTo, setMapTo] = useState('name');
  const [mapFrom2, setMapFrom2] = useState('state');
  const [mapTo2, setMapTo2] = useState('stateCode');
  const [records, setRecords] = useState(SAMPLE_RECORDS);
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const saveMapping = async () => {
    setBusy(true);
    await fetch(`${API}/integrations/legacy/mapping`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ sourceSystem, targetEntityType: 'stakeholder', fieldMap: { [mapFrom]: mapTo, [mapFrom2]: mapTo2 } }),
    });
    setBusy(false);
  };

  const runImport = async () => {
    setError('');
    setBusy(true);
    try {
      const parsed = JSON.parse(records);
      const res = await fetch(`${API}/integrations/legacy/bulk-import`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ sourceSystem, targetEntityType: 'stakeholder', records: parsed }),
      });
      setReport(await res.json());
    } catch {
      setError('Records must be valid JSON: an array of {sourceRecordId, payload}.');
    }
    setBusy(false);
  };

  return (
    <div className="section-card" style={{ marginTop: 22 }}>
      <div className="section-title"><h2>Legacy state system import</h2></div>
      <p className="form-note">Map each state's legacy field names to Maanak's schema, then bulk-import records. Already-imported records are skipped automatically.</p>
      <div className="form-grid">
        <label>Source system<input value={sourceSystem} onChange={(e) => setSourceSystem(e.target.value)} /></label>
      </div>
      <div className="form-grid">
        <label>Legacy field<input value={mapFrom} onChange={(e) => setMapFrom(e.target.value)} /></label>
        <label>Maps to<input value={mapTo} onChange={(e) => setMapTo(e.target.value)} /></label>
      </div>
      <div className="form-grid">
        <label>Legacy field<input value={mapFrom2} onChange={(e) => setMapFrom2(e.target.value)} /></label>
        <label>Maps to<input value={mapTo2} onChange={(e) => setMapTo2(e.target.value)} /></label>
      </div>
      <div className="form-actions"><button className="ghost-button small-button" disabled={busy} onClick={saveMapping}>Save mapping</button></div>

      <label style={{ marginTop: 18 }}>Records (JSON array)
        <textarea value={records} onChange={(e) => setRecords(e.target.value)} style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 11 }} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="form-actions"><button className="button" disabled={busy} onClick={runImport}>Run bulk import <Icon name="arrowRight" size={13} /></button></div>

      {report && (
        <div className={report.failed > 0 ? 'error-callout' : 'success-callout'} style={{ marginTop: 14 }}>
          <b>{report.imported}</b> imported · <b>{report.skipped}</b> skipped (duplicate) · <b>{report.failed}</b> failed validation
          {report.errors?.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {report.errors.map((e: any) => <li key={e.sourceRecordId}>{e.sourceRecordId}: {e.errors.join(', ')}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

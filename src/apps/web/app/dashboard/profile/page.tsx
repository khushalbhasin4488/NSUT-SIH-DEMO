'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '../../components/icons';
import { getToken } from '../../auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const headers = () => ({ 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) });

function GstinUdyamCard() {
  const [gstin, setGstin] = useState('07AAAAA0000A1Z5');
  const [udyam, setUdyam] = useState('UDYAM-DL-01-0012345');
  const [gstResult, setGstResult] = useState<any>(null);
  const [udyamResult, setUdyamResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const verifyGstin = async () => {
    setBusy(true);
    const res = await fetch(`${API}/stakeholders/me/verify-gstin`, { method: 'POST', headers: headers(), body: JSON.stringify({ gstin }) });
    setGstResult(await res.json());
    setBusy(false);
  };
  const verifyUdyam = async () => {
    setBusy(true);
    const res = await fetch(`${API}/stakeholders/me/verify-udyam`, { method: 'POST', headers: headers(), body: JSON.stringify({ udyamNumber: udyam }) });
    setUdyamResult(await res.json());
    setBusy(false);
  };

  return (
    <div className="section-card">
      <span className="eyebrow">BUSINESS VERIFICATION</span>
      <h2 className="side-heading">GST &amp; Udyam</h2>
      <label>GSTIN
        <input value={gstin} onChange={(e) => setGstin(e.target.value)} />
      </label>
      <div className="form-actions" style={{ marginTop: 8 }}><button className="ghost-button small-button" disabled={busy} onClick={verifyGstin}>Verify GSTIN</button></div>
      {gstResult && (
        gstResult.valid
          ? <div className="success-callout"><Icon name="check" size={11} /> {gstResult.legalName} · {gstResult.status}</div>
          : <div className="error-callout">GSTIN could not be verified ({gstResult.status})</div>
      )}
      <label style={{ marginTop: 16 }}>Udyam registration number
        <input value={udyam} onChange={(e) => setUdyam(e.target.value)} />
      </label>
      <div className="form-actions" style={{ marginTop: 8 }}><button className="ghost-button small-button" disabled={busy} onClick={verifyUdyam}>Verify Udyam</button></div>
      {udyamResult && (
        udyamResult.valid
          ? <div className="success-callout"><Icon name="check" size={11} /> {udyamResult.enterpriseName} · {udyamResult.category}</div>
          : <div className="error-callout">Udyam number could not be verified ({udyamResult.status})</div>
      )}
    </div>
  );
}

function AadhaarCard() {
  const [step, setStep] = useState<'idle' | 'otp' | 'done'>('idle');
  const [last4, setLast4] = useState('1234');
  const [consent, setConsent] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [otp, setOtp] = useState('123456');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const initiate = async () => {
    setError('');
    setBusy(true);
    const res = await fetch(`${API}/stakeholders/me/aadhaar/otp`, { method: 'POST', headers: headers(), body: JSON.stringify({ aadhaarLast4: last4, consent }) });
    setBusy(false);
    if (!res.ok) { setError((await res.json()).error?.message ?? 'Could not initiate OTP'); return; }
    const data = await res.json();
    setRequestId(data.requestId);
    setMaskedMobile(data.maskedMobile);
    setStep('otp');
  };
  const verify = async () => {
    setError('');
    setBusy(true);
    const res = await fetch(`${API}/stakeholders/me/aadhaar/verify`, { method: 'POST', headers: headers(), body: JSON.stringify({ requestId, otp }) });
    setBusy(false);
    if (!res.ok) { setError((await res.json()).error?.message ?? 'Incorrect OTP'); return; }
    setResult(await res.json());
    setStep('done');
  };

  return (
    <div className="section-card">
      <span className="eyebrow">AADHAAR eKYC · MOCK</span>
      <h2 className="side-heading">Identity verification</h2>
      {step === 'idle' && (
        <>
          <label>Aadhaar — last 4 digits only
            <input value={last4} onChange={(e) => setLast4(e.target.value)} maxLength={4} />
          </label>
          <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I consent to Aadhaar eKYC verification for this application.</label>
          {error && <p className="error">{error}</p>}
          <div className="form-actions" style={{ marginTop: 8 }}><button className="ghost-button small-button" disabled={busy} onClick={initiate}>Send OTP</button></div>
        </>
      )}
      {step === 'otp' && (
        <>
          <p className="side-copy">OTP sent to {maskedMobile}. (Demo OTP: 123456)</p>
          <label>Enter OTP
            <input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="form-actions" style={{ marginTop: 8 }}><button className="ghost-button small-button" disabled={busy} onClick={verify}>Verify OTP</button></div>
        </>
      )}
      {step === 'done' && result && (
        <div className="success-callout">
          <Icon name="check" size={11} /> Verified: {result.nameMasked} · DOB year {result.dobYear}<br />
          <span className="muted" style={{ fontSize: 10 }}>{result.addressMasked}</span>
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const [saved, setSaved] = useState(false);
  return (
    <>
      <div className="back-link"><Link href="/dashboard">← Overview</Link></div>
      <div className="page-header">
        <div><span className="eyebrow">ACCOUNT / PROFILE</span><h1>Your profile</h1><p>Keep your stakeholder and contact information up to date.</p></div>
        <span className="status green"><Icon name="check" size={11} /> KYC verified</span>
      </div>
      <div className="profile-layout">
        <div className="form-card">
          <h2>Basic information</h2>
          <p className="form-note">This information appears on applications and certificates.</p>
          <div className="profile-avatar">AS</div>
          <div className="form-grid">
            <label>Full name<input defaultValue="Ananya Sharma" /></label>
            <label>Account role<input defaultValue="State administrator" disabled /></label>
          </div>
          <label>Email address<input defaultValue="ananya.sharma@gov.in" /></label>
          <label>Mobile number<input defaultValue="+91 98765 43210" /></label>
          <div className="form-grid">
            <label>State<select defaultValue="Delhi"><option>Delhi</option><option>Maharashtra</option><option>Karnataka</option></select></label>
            <label>District<select defaultValue="South Delhi"><option>South Delhi</option><option>East Delhi</option><option>Gurugram</option></select></label>
          </div>
          <label>Office / correspondence address<textarea defaultValue="Legal Metrology Department, Civil Lines, Delhi" /></label>
          <div className="form-actions"><button className="button" onClick={() => setSaved(true)}>Save changes</button></div>
          {saved && <div className="success-callout">Profile changes saved successfully.</div>}
        </div>
        <div className="side-stack">
          <div className="section-card">
            <span className="eyebrow">VERIFICATION STATUS</span>
            <h2 className="side-heading">Your account is verified</h2>
            <div className="verification-item"><span><Icon name="check" size={11} /></span><div><b>Email verified</b><small>ananya.sharma@gov.in</small></div></div>
            <div className="verification-item"><span><Icon name="check" size={11} /></span><div><b>Phone verified</b><small>+91 98765 43210</small></div></div>
            <div className="verification-item"><span><Icon name="check" size={11} /></span><div><b>Identity approved</b><small>Approved 12 Aug 2026</small></div></div>
          </div>
          <div className="section-card">
            <span className="eyebrow">DOCUMENTS</span>
            <h2 className="side-heading">KYC documents</h2>
            <div className="document-row"><span className="file-icon">PDF</span><div><b>Appointment order.pdf</b><small>Verified · 12 Aug 2026</small></div><Icon name="arrowUpRight" size={13} /></div>
            <button className="ghost-button full-button"><Icon name="plus" size={12} /> Add document</button>
          </div>
          <GstinUdyamCard />
          <AadhaarCard />
        </div>
      </div>
    </>
  );
}

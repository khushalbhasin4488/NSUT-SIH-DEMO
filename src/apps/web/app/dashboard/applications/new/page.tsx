'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '../../../components/icons';
import { getToken } from '../../../auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const categories = [
  { value: 'WEIGHING_SCALE', label: 'Electronic weighing scale', fee: 500 },
  { value: 'WEIGHBRIDGE', label: 'Weighbridge', fee: 2500 },
  { value: 'FUEL_DISPENSER', label: 'Fuel dispenser', fee: 750 },
  { value: 'WATER_METER', label: 'Water meter', fee: 300 },
  { value: 'GAS_METER', label: 'Gas meter', fee: 350 },
  { value: 'TAXI_METER', label: 'Taxi / auto meter', fee: 400 },
];

type FormState = {
  applicantType: string;
  businessName: string;
  gstin: string;
  phone: string;
  category: string;
  model: string;
  serialNo: string;
  location: string;
  district: string;
  preferredDate: string;
  notes: string;
};

type Stakeholder = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  kycStatus?: string;
};

const initialForm: FormState = {
  applicantType: 'BUSINESS',
  businessName: '',
  gstin: '',
  phone: '',
  category: 'WEIGHING_SCALE',
  model: '',
  serialNo: '',
  location: '',
  district: 'South Delhi',
  preferredDate: '2026-09-24',
  notes: '',
};

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function NewApplication() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [stakeholder, setStakeholder] = useState<Stakeholder | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const [error, setError] = useState('');

  const selectedCategory = useMemo(
    () => categories.find((category) => category.value === form.category) ?? categories[0],
    [form.category],
  );

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!getToken()) {
        if (active) {
          setError('Please sign in before submitting an application.');
          setLoadingProfile(false);
        }
        return;
      }
      try {
        const response = await fetch(`${API}/stakeholders/me`, { headers: authHeaders() });
        if (!response.ok) throw new Error('Unable to load your stakeholder profile.');
        const profile = await response.json() as Stakeholder;
        if (!active) return;
        setStakeholder(profile);
        setForm((current) => ({
          ...current,
          businessName: profile.name ?? current.businessName,
          gstin: profile.gstin ?? current.gstin,
          phone: profile.phone ?? current.phone,
        }));
      } catch (profileError) {
        if (active) setError(profileError instanceof Error ? profileError.message : 'Unable to load your profile.');
      } finally {
        if (active) setLoadingProfile(false);
      }
    }
    loadProfile();
    return () => { active = false; };
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function validateStep() {
    if (step === 1 && (!form.businessName.trim() || !form.phone.trim())) {
      setError('Enter the applicant name and contact phone to continue.');
      return false;
    }
    if (step === 2 && (!form.serialNo.trim() || form.serialNo.trim().length < 3)) {
      setError('Enter a serial number with at least 3 characters.');
      return false;
    }
    if (step === 3 && (!form.preferredDate || !form.district)) {
      setError('Choose a preferred district and date.');
      return false;
    }
    setError('');
    return true;
  }

  function nextStep() {
    if (validateStep()) setStep((current) => Math.min(current + 1, 4));
  }

  async function submitApplication() {
    if (!validateStep() || !confirmed) {
      if (!confirmed) setError('Confirm that the application information is accurate before submitting.');
      return;
    }
    if (!stakeholder?.id) {
      setError('Your stakeholder profile could not be identified. Please sign in again.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API}/applications`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          applicantId: stakeholder.id,
          category: form.category,
          serialNo: form.serialNo.trim(),
          model: form.model.trim() || undefined,
          specs: {
            location: form.location.trim() || undefined,
            preferredDistrict: form.district,
            preferredDate: form.preferredDate,
            notes: form.notes.trim() || undefined,
            applicantType: form.applicantType,
            gstin: form.gstin.trim() || undefined,
          },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(payload?.message) ? payload.message.join(' ') : payload?.message;
        throw new Error(message || 'Application submission failed. Please try again.');
      }
      setSubmittedId(payload.id);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Application submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedId) {
    return (
      <>
        <div className="back-link"><Link href="/dashboard/applications">← Applications</Link></div>
        <div className="form-card success-panel">
          <div className="success-mark">✓</div>
          <h2>Application submitted</h2>
          <p>Your verification request has been submitted successfully.</p>
          <p><strong>Application ID: {submittedId}</strong></p>
          <div className="form-actions">
            <Link className="ghost-button" href="/dashboard/applications">View applications</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="back-link"><Link href="/dashboard/applications">← Applications</Link></div>
      <div className="page-header">
        <div><span className="eyebrow">NEW APPLICATION</span><h1>Request verification</h1><p>Complete the form to submit an instrument for verification.</p></div>
      </div>
      <div className="wizard">
        <div className="wizard-steps">{['Applicant', 'Instrument', 'Visit details', 'Review'].map((label, index) => <div className={step === index + 1 ? 'wizard-step active' : step > index + 1 ? 'wizard-step done' : 'wizard-step'} key={label}><span>{step > index + 1 ? '✓' : index + 1}</span>{label}</div>)}</div>
        <div className="form-card">
          {loadingProfile && <p className="form-note">Loading your registered stakeholder profile…</p>}
          {step === 1 && <>
            <h2>Who is applying?</h2><p className="form-note">Use the registered stakeholder details for this application.</p>
            <label>Applicant type<select value={form.applicantType} onChange={(event) => update('applicantType', event.target.value)}><option value="BUSINESS">Business / instrument owner</option><option value="CONSUMER">Consumer</option></select></label>
            <div className="form-grid"><label>Business name<input value={form.businessName} onChange={(event) => update('businessName', event.target.value)} placeholder="e.g. Shree Om Retail Pvt Ltd" /></label><label>GSTIN <span className="optional">Optional</span><input value={form.gstin} onChange={(event) => update('gstin', event.target.value)} placeholder="22AAAAA0000A1Z5" /></label></div>
            <label>Contact phone<input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+91 98765 43210" /></label>
          </>}
          {step === 2 && <>
            <h2>Instrument details</h2><p className="form-note">Tell us about the instrument you want verified.</p>
            <label>Instrument category<select value={form.category} onChange={(event) => update('category', event.target.value)}>{categories.map((category) => <option value={category.value} key={category.value}>{category.label}</option>)}</select></label>
            <div className="form-grid"><label>Make / model<input value={form.model} onChange={(event) => update('model', event.target.value)} placeholder="e.g. Essae Dura 30" /></label><label>Serial number<input value={form.serialNo} onChange={(event) => update('serialNo', event.target.value)} placeholder="e.g. SCALE-88412" /></label></div>
            <label>Instrument location<input value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="Full address of the instrument" /></label>
            <div className="upload-box"><span><Icon name="plus" size={13} /></span><b>Upload supporting documents</b><small>PDF, JPG or PNG · up to 10 MB</small></div>
          </>}
          {step === 3 && <>
            <h2>Preferred verification visit</h2><p className="form-note">We will confirm the final slot after reviewing your application.</p>
            <div className="form-grid"><label>Preferred district<select value={form.district} onChange={(event) => update('district', event.target.value)}><option>South Delhi</option><option>East Delhi</option><option>Gurugram</option></select></label><label>Preferred date<input type="date" value={form.preferredDate} onChange={(event) => update('preferredDate', event.target.value)} /></label></div>
            <label>Notes for the officer <span className="optional">Optional</span><textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Anything the verification team should know?" /></label>
          </>}
          {step === 4 && <>
            <h2>Review and submit</h2><p className="form-note">Check the details before sending this application.</p>
            <div className="review-box"><div><span>Applicant</span><b>{form.businessName}</b></div><div><span>Instrument</span><b>{selectedCategory.label} · {form.serialNo}</b></div><div><span>Visit preference</span><b>{form.district} · {new Date(`${form.preferredDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b></div><div><span>Verification fee</span><b>₹ {selectedCategory.fee.toLocaleString('en-IN')}</b></div></div>
            <label className="check"><input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setError(''); }} /> I confirm that the information provided is accurate.</label>
          </>}
          {error && <div className="error-callout" role="alert">{error}</div>}
          <div className="form-actions">{step > 1 && <button type="button" className="ghost-button" onClick={() => { setError(''); setStep((current) => current - 1); }}>Back</button>}{step < 4 ? <button type="button" className="button" onClick={nextStep}>Continue <span>→</span></button> : <button type="button" className="button" disabled={submitting} onClick={submitApplication}>{submitting ? 'Submitting…' : 'Submit application'} <span>→</span></button>}</div>
        </div>
      </div>
    </>
  );
}

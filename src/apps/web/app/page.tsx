import Link from 'next/link';
import { Icon } from './components/icons';

const FEATURES: Array<{ icon: 'checkCircle' | 'document' | 'shield' | 'sparkle'; title: string; body: string }> = [
  { icon: 'checkCircle', title: 'End-to-end verification', body: 'Register instruments, schedule inspections, and track every application from submission to certificate.' },
  { icon: 'document', title: 'Tamper-evident certificates', body: 'Every certificate is hash-chained on issuance and publicly verifiable by QR code — no login required.' },
  { icon: 'shield', title: 'Explainable integrity signals', body: 'Anomaly detection surfaces risk for human review. No decision is ever automated.' },
  { icon: 'sparkle', title: 'AI-assisted, human-approved', body: 'OCR and compliance answers are advisory only — an officer or admin approves every legally significant action.' },
];

export default function Landing() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link href="/" className="public-brand"><span className="brand-mark">M</span><b>maanak</b></Link>
        <div className="landing-nav-actions">
          <Link href="/verify" className="ghost-button">Verify a certificate</Link>
          <Link href="/login" className="button">Sign in <Icon name="arrowRight" size={13} /></Link>
        </div>
      </header>

      <section className="landing-hero">
        <span className="eyebrow">GOVERNMENT OF NCT OF DELHI · LEGAL METROLOGY DEPARTMENT</span>
        <h1>Digital verification for weights and measures</h1>
        <p>Maanak is the department's platform for instrument registration, inspection scheduling, and publicly verifiable digital certificates — built for stakeholders, officers, and administrators alike.</p>
        <div className="landing-hero-actions">
          <Link href="/register" className="button full-button">Register as a stakeholder <Icon name="arrowRight" size={13} /></Link>
          <Link href="/login" className="ghost-button full-button">Officer / admin sign in</Link>
        </div>
      </section>

      <section className="landing-features">
        {FEATURES.map((f) => (
          <div className="landing-feature-card" key={f.title}>
            <div className="landing-feature-icon"><Icon name={f.icon} size={20} /></div>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="landing-footer">
        <span>Trusted digital verification for weights and measures</span>
        <div><Link href="/verify">Verify a certificate</Link><Link href="/login">Officer login</Link><Link href="/register">Register</Link></div>
      </footer>
    </main>
  );
}

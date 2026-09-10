'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { getToken, logout } from '../auth';
import { Icon } from './icons';

const nav = [
  { label: 'Overview', href: '/dashboard', icon: 'home' as const },
  { label: 'Applications', href: '/dashboard/applications', icon: 'grid' as const },
  { label: 'Instruments', href: '/dashboard/instruments', icon: 'gauge' as const },
  { label: 'Payments', href: '/dashboard/payments', icon: 'rupee' as const },
  { label: 'Schedule', href: '/dashboard/schedule', icon: 'clock' as const },
  { label: 'Verification queue', href: '/dashboard/verification', icon: 'checkCircle' as const },
  { label: 'Certificates', href: '/dashboard/certificates', icon: 'document' as const },
];
const tools = [
  { label: 'Compliance assistant', href: '/dashboard/compliance', icon: 'sparkle' as const },
  { label: 'Integrity signals', href: '/dashboard/integrity', icon: 'shield' as const },
  { label: 'AI review', href: '/dashboard/ai-review', icon: 'cpu' as const },
  { label: 'Reports', href: '/dashboard/reports', icon: 'bars' as const },
];
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
type Profile = { name?: string; email?: string; role?: string; roles?: string[]; stateCode?: string; districtCode?: string };

function roleLabel(profile: Profile | null) {
  const rawRole = profile?.role || profile?.roles?.[0] || '';
  const role = rawRole.toUpperCase().replace(/[^A-Z]/g, '');
  const labels: Record<string, string> = {
    BUSINESS: 'Business owner',
    BUSINESSOWNER: 'Business owner',
    LMO: 'Legal Metrology Officer (LMO)',
    LEGALMETROLOGYOFFICER: 'Legal Metrology Officer (LMO)',
    GATC: 'Government approved test center (GATC)',
    GOVERNMENTAPPROVEDTESTCENTER: 'Government approved test center (GATC)',
    STATEADMIN: 'State administrator',
    STATEADMINISTRATOR: 'State administrator',
    CENTRALADMIN: 'Central administrator',
    CENTRALADMINISTRATOR: 'Central administrator',
  };
  if (labels[role]) return labels[role];
  const email = (profile?.email || '').toLowerCase();
  if (email.includes('business')) return 'Business owner';
  if (email.includes('officer') || email.includes('lmo')) return 'Legal Metrology Officer (LMO)';
  if (email.includes('gatc')) return 'Government approved test center (GATC)';
  if (email.includes('stateadmin')) return 'State administrator';
  if (email.includes('admin')) return 'Central administrator';
  return 'Workspace user';
}
function canManageVisits(profile: Profile | null) {
  if (!profile) return true;
  const role = (profile.role || profile.roles?.[0] || '').toUpperCase().replace(/[^A-Z]/g, '');
  return ['STATEADMIN', 'STATEADMINISTRATOR', 'CENTRALADMIN', 'CENTRALADMINISTRATOR'].includes(role);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API}/stakeholders/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data && setProfile(data))
      .catch(() => undefined);
  }, []);
  if (['/', '/verify', '/register', '/login', '/unauthorized', '/forbidden'].includes(pathname)) return <>{children}</>;
  const displayName = profile?.name || profile?.email || 'Demo user';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'DU';
  const location = profile?.districtCode || profile?.stateCode;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand"><span className="brand-mark">M</span><span><b>maanak</b><small>LEGAL METROLOGY</small></span></Link>
        <div className="side-label">WORKSPACE</div>
        <nav>{nav.filter((item) => item.href !== '/dashboard/schedule' || canManageVisits(profile)).map((item) => (
          <Link className={pathname === item.href ? 'nav-item active' : 'nav-item'} href={item.href} key={item.href}>
            <i><Icon name={item.icon} /></i>{item.label}
          </Link>
        ))}</nav>
        <div className="side-label">INTELLIGENCE</div>
        <nav>{tools.map((item) => (
          <Link className={pathname === item.href ? 'nav-item active' : 'nav-item'} href={item.href} key={item.href}>
            <i><Icon name={item.icon} /></i>{item.label}
          </Link>
        ))}</nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span>Need help?</span>
            <p>Ask the compliance assistant about the Rules.</p>
            <Link href="/dashboard/compliance">Open assistant <Icon name="arrowRight" size={12} /></Link>
          </div>
          <div className="user-mini">
            <span className="avatar">{initials}</span>
            <span><b>{displayName}</b><small>{roleLabel(profile)}{location ? ` · ${location}` : ''}</small></span>
            <button className="logout-mini" onClick={logout} aria-label="Log out"><Icon name="logout" size={16} /></button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="crumb">Delhi state office <span>·</span> FY 2026–27</div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications"><Icon name="bell" size={18} /><em>3</em></button>
            <button className="icon-button" aria-label="Search"><Icon name="search" size={18} /></button>
            <Link href="/register" className="top-link">Register stakeholder</Link>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}

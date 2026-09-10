'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function DashboardRouter() {
  const router = useRouter();
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    const token = getToken();
    if (!token) { setPreview(true); return; }
    fetch(`${API}/stakeholders/me`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : null).then((profile) => {
      const role = (profile?.role || profile?.roles?.[0] || '').toUpperCase().replace(/[^A-Z]/g, '');
      const destinations: Record<string, string> = {
        BUSINESS: '/dashboard/role/stakeholder',
        BUSINESSOWNER: '/dashboard/role/stakeholder',
        LMO: '/dashboard/role/officer',
        LEGALMETROLOGYOFFICER: '/dashboard/role/officer',
        GATC: '/dashboard/role/gatc',
        GOVERNMENTAPPROVEDTESTCENTER: '/dashboard/role/gatc',
        STATEADMIN: '/dashboard/role/state-admin',
        STATEADMINISTRATOR: '/dashboard/role/state-admin',
        CENTRALADMIN: '/dashboard/role/central-admin',
        CENTRALADMINISTRATOR: '/dashboard/role/central-admin',
      };
      router.replace(destinations[role] || '/dashboard/role/state-admin');
    }).catch(() => router.replace('/dashboard/role/state-admin'));
  }, [router]);
  if (!preview) return <div className="dashboard-loading">Loading your role workspace…</div>;
  return <div className="dashboard-loading"><b>Preview workspace</b><span>Sign in with a demo account to open the role-specific dashboard.</span></div>;
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Section, Status } from '../../components/ui';
import { Icon } from '../../components/icons';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fallback = [
  { id: 'APP-2026-01482', time: '09:30', owner: 'Shree Om Retail', type: 'Electronic weighing scale', location: 'Lajpat Nagar, South Delhi', officer: 'R. Mehta', status: 'Ready', tone: 'blue', date: '2026-09-24' },
  { id: 'APP-2026-01479', time: '11:00', owner: 'Arjun Fuel Station', type: 'Fuel dispenser', location: 'MG Road, Gurugram', officer: 'R. Mehta', status: 'Documents pending', tone: 'amber', date: '2026-09-24' },
  { id: 'APP-2026-01471', time: '14:30', owner: 'Metro Weighbridge', type: 'Weighbridge', location: 'Nehru Place, East Delhi', officer: 'K. Singh', status: 'Ready', tone: 'green', date: '2026-09-24' },
  { id: 'DEMO-WEEK-01', time: '09:00', owner: 'Bharat Mart', type: 'Electronic weighing scale', location: 'Karol Bagh, Central Delhi', officer: 'Demo Legal Metrology Officer', status: 'Ready', tone: 'green', date: '2026-09-21' },
  { id: 'DEMO-WEEK-02', time: '10:30', owner: 'Metro Logistics', type: 'Weighbridge', location: 'Okhla, South Delhi', officer: 'Demo Legal Metrology Officer', status: 'Ready', tone: 'green', date: '2026-09-22' },
  { id: 'DEMO-WEEK-03', time: '11:00', owner: 'Arjun Fuel Station', type: 'Fuel dispenser', location: 'MG Road, Gurugram', officer: 'Demo Legal Metrology Officer', status: 'Documents pending', tone: 'amber', date: '2026-09-23' },
  { id: 'DEMO-WEEK-04', time: '13:00', owner: 'Neelam Traders', type: 'Water meter', location: 'Dwarka, West Delhi', officer: 'Demo Legal Metrology Officer', status: 'Ready', tone: 'green', date: '2026-09-25' },
  { id: 'DEMO-WEEK-05', time: '10:00', owner: 'Sagar Logistics', type: 'Gas meter', location: 'Faridabad', officer: 'Demo Legal Metrology Officer', status: 'Ready', tone: 'green', date: '2026-09-26' },
  { id: 'DEMO-WEEK-06', time: '14:30', owner: 'Sunrise Traders', type: 'Electronic weighing scale', location: 'Mumbai', officer: 'Demo Legal Metrology Officer', status: 'Ready', tone: 'green', date: '2026-09-27' },
];
const demoOfficer = { id: '00000000-0000-0000-0000-000000000001', name: 'Demo Legal Metrology Officer', email: 'officer@example.gov.in', role: 'LMO' };
const label = (value: string) => ({ WEIGHING_SCALE: 'Electronic weighing scale', FUEL_DISPENSER: 'Fuel dispenser', WEIGHBRIDGE: 'Weighbridge', PLATFORM_SCALE: 'Platform scale' } as Record<string, string>)[value] || value?.replaceAll('_', ' ') || 'Instrument';
const key = (date: Date) => date.toISOString().slice(0, 10);
const longDate = (date: Date) => date.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const shortDate = (date: Date) => date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
const mapVisit = (application: any) => { const scheduled = new Date(application.scheduledAt); const status = application.status === 'UNDER_REVIEW' ? 'Documents pending' : 'Ready'; return { id: application.id, time: scheduled.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), owner: application.applicant?.name || 'Applicant', type: label(application.instrument?.category), location: application.applicant?.districtCode || application.applicant?.stateCode || 'Location pending', officer: application.assignedOfficerId || 'Unassigned', status, tone: status === 'Ready' ? 'green' : 'amber', date: key(scheduled), application }; };

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date('2026-09-24T00:00:00'));
  const [view, setView] = useState<'day' | 'week'>('day');
  const [applications, setApplications] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([demoOfficer]);
  const [assigning, setAssigning] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [scheduledAt, setScheduledAt] = useState('2026-09-24T09:00');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(true);
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('metrology_access_token') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const load = () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetch(`${API}/applications`, { headers }).then((response) => response.ok ? response.json() : Promise.reject()),
      fetch(`${API}/stakeholders`, { headers }).then((response) => response.ok ? response.json() : []),
    ]).then(([apps, people]) => {
      setApplications(apps);
      const available = people.filter((person: any) => ['LMO', 'GATC'].includes((person.role || '').toUpperCase()));
      setOfficers(available.length ? available : [demoOfficer]);
      setSelectedOfficer((current) => current || (available[0]?.id || demoOfficer.id));
    }).catch(() => setNotice('Live schedule could not be loaded. Showing the demo schedule.')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!token) return; fetch(`${API}/stakeholders/me`, { headers }).then((response) => response.ok ? response.json() : null).then((profile) => { const role = (profile?.role || profile?.roles?.[0] || '').toUpperCase().replace(/[^A-Z]/g, ''); setCanManage(['STATEADMIN', 'STATEADMINISTRATOR', 'CENTRALADMIN', 'CENTRALADMINISTRATOR'].includes(role)); }).catch(() => undefined); }, []);

  const liveVisits = applications.filter((application) => application.scheduledAt).map(mapVisit);
  const allVisits = token && applications.length ? liveVisits : fallback;
  const dayVisits = allVisits.filter((visit) => visit.date === key(selectedDate));
  const unassigned = applications.filter((application) => !application.scheduledAt && ['SUBMITTED', 'UNDER_REVIEW'].includes(application.status));
  const visibleVisits = useMemo(() => {
    if (view === 'day') return dayVisits;
    const start = new Date(selectedDate); start.setDate(start.getDate() - start.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return allVisits.filter((visit) => { const date = new Date(`${visit.date}T00:00:00`); return date >= start && date <= end; });
  }, [allVisits, dayVisits, selectedDate, view]);
  const capacity = Math.min(100, Math.round((dayVisits.length / 5) * 100));
  const rows = view === 'week' ? Array.from(new Set(visibleVisits.map((visit) => visit.date))).sort().map((date) => ({ date, visits: visibleVisits.filter((visit) => visit.date === date) })) : [{ date: key(selectedDate), visits: visibleVisits }];

  const moveDate = (amount: number) => setSelectedDate((current) => { const next = new Date(current); next.setDate(next.getDate() + amount); return next; });
  const openAssignment = () => { if (!canManage) { setNotice('Only state or central administrators can assign verification visits.'); return; } setSelectedApplication(unassigned[0]?.id || ''); setScheduledAt(`${key(selectedDate)}T09:00`); setAssigning(true); setNotice(unassigned.length ? '' : 'There are no unassigned applications to allocate.'); };
  const assignVisit = async () => {
    if (!selectedApplication) { setNotice('Select an application first.'); return; }
    if (!selectedOfficer && token) { setNotice('Select an officer first.'); return; }
    if (!token) { setNotice('Preview mode: sign in with Keycloak to save assignments.'); return; }
    const response = await fetch(`${API}/applications/${selectedApplication}/schedule`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ officerId: selectedOfficer, scheduledAt: new Date(scheduledAt).toISOString() }) });
    if (!response.ok) { setNotice('The appointment could not be saved.'); return; }
    setNotice('Visit assigned and saved successfully.'); setAssigning(false); load();
  };
  const optimize = async () => {
    if (!canManage) { setNotice('Only state or central administrators can optimize verification routes.'); return; }
    const visits = dayVisits.map((visit: any, index) => ({ id: visit.id, latitude: 28.55 + index * 0.01, longitude: 77.20 + index * 0.01, priority: visit.status === 'Documents pending' ? 2 : 1, durationMinutes: 60 }));
    if (!visits.length) { setNotice('No visits are scheduled for this date.'); return; }
    if (!token) { setNotice(`Preview route optimized for ${visits.length} visits.`); return; }
    const response = await fetch(`${API}/schedule/optimize`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ visits, start: { latitude: 28.6139, longitude: 77.209 }, capacityMinutes: 480 }) });
    if (!response.ok) { setNotice('Route optimization failed.'); return; }
    const result = await response.json(); setNotice(`Route optimized: ${result.route.length} visits scheduled, ${result.unscheduled.length} remaining.`);
  };
  const review = () => { const target: any = allVisits.find((visit: any) => visit.application?.id); if (target) window.location.href = `/dashboard/applications/${target.application.id}`; else setNotice('No live appointment detail is available in the demo schedule.'); };
  const officerName = (id: string) => officers.find((officer) => officer.id === id)?.name || id;

  return <>
    <PageHeader eyebrow="OPERATIONS / SCHEDULE" title="Verification schedule" description="Allocate visits, balance workloads, and keep officers moving." action={canManage ? 'Optimize route' : undefined} onAction={optimize} />
    <div className="schedule-toolbar"><div className="date-nav"><button type="button" aria-label="Previous date" onClick={() => moveDate(-1)}>‹</button><b>{longDate(selectedDate)}</b><button type="button" aria-label="Next date" onClick={() => moveDate(1)}>›</button></div><div><button type="button" className={view === 'day' ? 'toggle active' : 'toggle'} onClick={() => setView('day')}>Day</button><button type="button" className={view === 'week' ? 'toggle active' : 'toggle'} onClick={() => setView('week')}>Week</button></div></div>
    {notice && <div className="success-callout schedule-notice">{notice}</div>}
    <div className="schedule-layout"><Section title={view === 'day' ? `${shortDate(selectedDate)} · ${dayVisits.length} visits` : 'Week overview'}>{loading ? <p className="muted">Loading live schedule…</p> : <div className="calendar-list">{rows.map((group) => <div key={group.date} className="schedule-day-group">{view === 'week' && <h3>{shortDate(new Date(`${group.date}T00:00:00`))}</h3>}{group.visits.length ? group.visits.map((visit: any, index: number) => <div className="calendar-row" key={visit.id}><div className="time-col">{visit.time}<small>{index === 0 ? '45 min' : '60 min'}</small></div><div className={`event-card event-${visit.tone}`}><div><b>{visit.owner}</b><span>{visit.type}</span><small><Icon name="pin" size={11} /> {visit.location}</small></div><div className="event-side"><Status tone={visit.tone as any}>{visit.status}</Status><span>Officer · {officerName(visit.officer)}</span></div></div></div>) : <p className="muted">No visits scheduled for this date.</p>}</div>)}</div>}</Section><div className="side-stack"><div className="capacity-card"><span className="eyebrow">TODAY'S CAPACITY</span><strong>{capacity}%</strong><div className="progress"><i style={{ width: `${capacity}%` }} /></div><p>{dayVisits.length} of 5 available slots allocated</p></div><Section title="Unassigned"><div className="unassigned"><div><b>{unassigned.length} applications</b><span>Need an officer allocation</span></div><button type="button" className="small-button" onClick={openAssignment} disabled={!canManage} title={canManage ? 'Assign a verification visit' : 'Administrator access required'}>Assign</button></div><div className="unassigned"><div><b>Scheduled visits</b><span>Review appointment details</span></div><button type="button" className="small-button" onClick={review}>Review</button></div></Section></div></div>
    {assigning && <div className="section-card assignment-panel"><div className="section-title"><h2>Assign verification visit</h2><button type="button" className="ghost-button" onClick={() => setAssigning(false)}>Close</button></div><div className="form-grid"><label>Application<select value={selectedApplication} onChange={(event) => setSelectedApplication(event.target.value)}><option value="">Select application</option>{unassigned.map((application) => <option key={application.id} value={application.id}>{application.id} · {application.applicant?.name}</option>)}</select></label><label>Officer<select value={selectedOfficer} onChange={(event) => setSelectedOfficer(event.target.value)}><option value="">Select officer</option>{officers.map((officer) => <option key={officer.id} value={officer.id}>{officer.name} · {officer.role}</option>)}</select></label><label>Appointment<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label></div><button type="button" className="button" onClick={assignVisit}>Save assignment →</button></div>}
  </>;
}

/* Vacancies popup → Referrals Received: every Employee Referral Form
 * submission, for HR.
 *
 * Shown only to people a superadmin has granted "Review referrals" in the
 * Admin Console, and to superadmins (the server checks; see
 * referrals/views.py). The list on
 * the left, the full form on the right exactly as the employee filled it in,
 * and below it the "For HR Use Only" section - the one part HR can change.
 * What the employee wrote is shown read-only and the server refuses to
 * change it even if asked. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Inbox, Loader2, Search, Send, UserCheck } from 'lucide-react';
import { apiFetch } from './session';
import { apiBase } from '../../apiBase';

const API = `${apiBase()}/api/referrals/admin`;

interface Referral {
  id: number; created_at: string; updated_at: string;
  candidate_name: string; position_applied_for: string; candidate_department: string; candidate_employee_id: string;
  candidate_contact: string; candidate_email: string;
  referrer_name: string; referrer_employee_id: string; referrer_designation: string; referrer_department: string;
  referrer_contact: string; referrer_email: string;
  relationship: string; relationship_other: string; association_duration: string;
  previous_organization: string; candidate_previous_designation: string; employment_from: string; employment_to: string;
  reporting_to: string;
  technical_skills: string; strengths: string; areas_of_improvement: string; overall_performance: string;
  recommendation: string; recommendation_label: string; disciplinary_issues: boolean; disciplinary_details: string;
  referrer_signature: string; declaration_date: string;
  verified_by: string; verification_date: string; hr_remarks: string; status: string;
  submitted_by: { name: string; email: string } | null;
}

const STATUS_TONE: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-800', Shortlisted: 'bg-sky-100 text-sky-800',
  Interviewing: 'bg-violet-100 text-violet-800', Hired: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-rose-100 text-rose-700',
};
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const day = (d: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export function ReferralsTab({ onToast }: { onToast: (t: { t: string; ok: boolean }) => void }) {
  const [rows, setRows] = useState<Referral[] | null>(null);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch(`${API}/`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Referrals could not load (${r.status}).`);
      setRows(d.referrals); setStatuses(d.statuses); setError('');
      setOpenId(id => id ?? d.referrals[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Referrals could not load.');
    }
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const shown = useMemo(() => (rows ?? []).filter(r =>
    (filter === 'All' || r.status === filter)
    && (!q || `${r.candidate_name} ${r.referrer_name} ${r.position_applied_for} ${r.candidate_email}`.toLowerCase().includes(q.toLowerCase()))),
  [rows, filter, q]);
  const open = rows?.find(r => r.id === openId) ?? null;

  if (error) return <p className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>;
  if (!rows) return <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {['All', ...statuses].map(s => {
          const n = s === 'All' ? rows.length : rows.filter(r => r.status === s).length;
          return (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${filter === s
                ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {s} <span className="opacity-60">{n}</span>
            </button>
          );
        })}
        <div className="flex-1" />
        <label className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search candidate, referrer, position"
            className="w-60 text-xs font-semibold outline-none bg-transparent" />
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 py-16 text-center">
          <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="mt-2 text-sm font-black text-slate-600">No referrals yet</p>
          <p className="text-xs text-slate-400">Submissions from the Vacancies → Referral Form appear here.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[22rem_1fr] gap-4 items-start">
          <ul className="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {shown.length === 0 && <li className="px-4 py-6 text-xs text-slate-400 text-center">Nothing matches.</li>}
            {shown.map(r => (
              <li key={r.id}>
                <button type="button" onClick={() => setOpenId(r.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${r.id === openId ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 truncate text-sm font-black text-slate-800">{r.candidate_name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_TONE[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                  </div>
                  <p className="truncate text-xs font-semibold text-slate-500">{r.position_applied_for}</p>
                  <p className="text-[11px] text-slate-400">by {r.referrer_name} · {when(r.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
          {open && <ReferralDetail key={open.id} r={open} statuses={statuses} onToast={onToast}
            onSaved={u => setRows(rs => (rs ?? []).map(x => (x.id === u.id ? u : x)))} />}
        </div>
      )}
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4">
      <p className="flex items-center gap-2 text-[13px] font-black text-slate-800">
        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-[11px] flex items-center justify-center">{n}</span>{title}
      </p>
      <dl className="mt-3 grid sm:grid-cols-2 gap-x-5 gap-y-2.5">{children}</dl>
    </div>
  );
}

function Item({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-[11px] font-bold text-slate-400">{label}</dt>
      <dd className="text-[13px] font-semibold text-slate-800 whitespace-pre-wrap break-words">{value || <span className="text-slate-300">—</span>}</dd>
    </div>
  );
}

function ReferralDetail({ r, statuses, onToast, onSaved }: {
  r: Referral; statuses: string[]; onToast: (t: { t: string; ok: boolean }) => void; onSaved: (r: Referral) => void;
}) {
  const [hr, setHr] = useState({ verified_by: r.verified_by, verification_date: r.verification_date, hr_remarks: r.hr_remarks, status: r.status });
  const [saving, setSaving] = useState(false);
  const dirty = hr.verified_by !== r.verified_by || hr.verification_date !== r.verification_date
    || hr.hr_remarks !== r.hr_remarks || hr.status !== r.status;

  async function save() {
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/${r.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(hr) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `Could not save (${res.status}).`);
      onSaved(d);
      onToast({ t: `Saved — ${r.candidate_name} is now ${d.status}.`, ok: true });
    } catch (e) {
      onToast({ t: e instanceof Error ? e.message : 'Could not save.', ok: false });
    } finally {
      setSaving(false);
    }
  }

  const relationship = r.relationship === 'Other' && r.relationship_other ? `Other — ${r.relationship_other}` : r.relationship;
  const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-800 outline-none focus:border-amber-400';

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black text-slate-900">{r.candidate_name}</p>
          <p className="text-xs font-semibold text-slate-500">{r.position_applied_for}</p>
        </div>
        <div className="text-right text-[11px] text-slate-400">
          <p>Submitted {when(r.created_at)}</p>
          <p className="inline-flex items-center gap-1">
            <Send className="w-3 h-3" />
            {r.submitted_by ? <>sent from {r.submitted_by.name || r.submitted_by.email}’s account</> : 'sent without signing in'}
          </p>
        </div>
      </div>

      <Section n={1} title="Candidate details">
        <Item label="Full name" value={r.candidate_name} />
        <Item label="Position applied for" value={r.position_applied_for} />
        <Item label="Department" value={r.candidate_department} />
        <Item label="Employee ID (if applicable)" value={r.candidate_employee_id} />
        <Item label="Contact number" value={r.candidate_contact} />
        <Item label="Email" value={r.candidate_email} />
      </Section>
      <Section n={2} title="Referrer details">
        <Item label="Name" value={r.referrer_name} />
        <Item label="Employee ID" value={r.referrer_employee_id} />
        <Item label="Designation" value={r.referrer_designation} />
        <Item label="Department" value={r.referrer_department} />
        <Item label="Contact number" value={r.referrer_contact} />
        <Item label="Official email" value={r.referrer_email} />
      </Section>
      <Section n={3} title="Relationship & previous employment">
        <Item label="Relationship with candidate" value={relationship} />
        <Item label="Duration of association" value={r.association_duration} />
        <Item label="Previous organisation" value={r.previous_organization} />
        <Item label="Candidate's designation there" value={r.candidate_previous_designation} />
        <Item label="Employed from" value={day(r.employment_from)} />
        <Item label="Employed to" value={day(r.employment_to)} />
        <Item label="Reporting to" value={r.reporting_to} />
      </Section>
      <Section n={4} title="Skills, performance & recommendation">
        <Item label="Technical skills" value={r.technical_skills} wide />
        <Item label="Strengths" value={r.strengths} wide />
        <Item label="Areas of improvement" value={r.areas_of_improvement} wide />
        <Item label="Overall performance" value={r.overall_performance} />
        <Item label="Recommendation" value={r.recommendation_label} />
        <Item label="Any disciplinary issues?" value={r.disciplinary_issues ? 'Yes' : 'No'} />
        {r.disciplinary_issues && <Item label="Details" value={r.disciplinary_details} wide />}
        <Item label="Referrer's signature" value={r.referrer_signature} />
        <Item label="Declaration date" value={day(r.declaration_date)} />
      </Section>

      <div className="rounded-2xl border-2 border-slate-900/80 p-4">
        <p className="flex items-center gap-2 text-[13px] font-black text-slate-900">
          <UserCheck className="w-4 h-4 text-amber-600" />For HR Use Only
        </p>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-bold text-slate-500">Verified by</span>
            <input className={input} value={hr.verified_by} placeholder="Enter name"
              onChange={e => setHr(h => ({ ...h, verified_by: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-500">Verification date</span>
            <input type="date" className={input} value={hr.verification_date}
              onChange={e => setHr(h => ({ ...h, verification_date: e.target.value }))} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-bold text-slate-500">Remarks</span>
            <textarea rows={3} className={input} value={hr.hr_remarks} placeholder="Enter remarks"
              onChange={e => setHr(h => ({ ...h, hr_remarks: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-500">Status</span>
            <select className={input} value={hr.status} onChange={e => setHr(h => ({ ...h, status: e.target.value }))}>
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <div className="flex items-end justify-end gap-2">
            {!dirty && r.updated_at !== r.created_at && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />Saved</span>
            )}
            <button type="button" onClick={() => void save()} disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2
                         text-[13px] font-black text-white shadow-sm hover:shadow-md disabled:opacity-40">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

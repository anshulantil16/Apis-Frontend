/* Admin view: the user directory, bulk import, and portal-wide figures. */
import { useState, useEffect } from 'react';
import {
  Trash2, CheckCircle, FileText, Receipt, Car, AlertCircle, RefreshCw, ChevronRight, Users, Shield, BarChart3, TrendingUp, Wallet, Activity,
} from 'lucide-react';
import { apiFetch } from '../portal/session';
import { API, fmt, HR_LABEL, type User } from './shared';
import { Count, PBar, Ring } from './components';
import { Detail, ReqCard } from './RequestDetail';

/* The closed list the allowance matrices are keyed on. M7 and above share
   one band, so M8/M9 are legitimate; the list stops where the policy's own
   table does and anything beyond it is typed in deliberately elsewhere. */
const LEVELS = ['M7', 'M6', 'M5', 'M4', 'M3', 'M2', 'M1', 'E4', 'E3', 'E2', 'E1'];

export const STATUS_LABELS: Record<string, string> = {
  submitted: 'Pending Manager', manager_approved: `Pending ${HR_LABEL}`, hr_approved: 'Pending Finance',
  finance_approved: 'Finance Approved', paid: 'Paid', manager_rejected: 'Rejected · Manager',
  hr_rejected: `Rejected · ${HR_LABEL}`, finance_rejected: 'Rejected · Finance',
};

export function AdminDashboard({ user }: { user: User }) {
  const [sub, setSub] = useState('overview');
  const [ov, setOv] = useState<any>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');
  const load = () => fetch(`${API}/admin/overview/`).then(r => r.json()).then(setOv);
  useEffect(() => { load(); }, []);

  /* The directory is the HRMS master, not a spreadsheet. These two calls
     change who approves what and what people are paid, so they carry the
     portal session: the server only accepts them from a super admin. */
  const [users, setUsers] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [uq, setUq] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(false);
  /* A failed call must not take the page down with it. Reading
     users.users off an error body ({detail: ...}) is what turned a 401
     into a blank screen. */
  const loadUsers = async () => {
    try {
      const r = await apiFetch(`${API}/users/`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !Array.isArray(d.users)) {
        setUsers({ users: [], total: 0, needs_level: 0, no_manager: 0 });
        setMsg(r.status === 401 || r.status === 403
          ? 'Sign in to the intranet as an administrator to manage the TA/DA directory.'
          : (d.error || 'Could not load the directory.'));
        return;
      }
      setUsers(d); setMsg('');
    } catch {
      setUsers({ users: [], total: 0, needs_level: 0, no_manager: 0 });
      setMsg('Could not reach the server.');
    }
  };
  useEffect(() => { if (sub === 'users') loadUsers(); }, [sub]);

  const syncUsers = async () => {
    setBusy(true);
    try {
      const r = await apiFetch(`${API}/users/sync/`, { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      setMsg(r.ok ? (d.message || 'Synced.')
                  : (d.error || 'Only an intranet administrator can sync the directory.'));
      if (r.ok) { await loadUsers(); load(); }
    } finally { setBusy(false); }
  };

  const saveUser = async (id: number, field: string, value: string) => {
    const r = await apiFetch(`${API}/users/${id}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.user) { setMsg(d.error || 'That change was not saved.'); return; }
    // Replace just the row that changed, so the table does not jump.
    setUsers((prev: any) => prev && {
      ...prev, users: prev.users.map((u: any) => (u.id === id ? d.user : u)),
    });
    setMsg('');
  };
  const reset = async (what: string) => {
    if (!confirm(what === 'all' ? 'Clear ALL requests AND users? This cannot be undone.' : 'Clear ALL travel requests? This cannot be undone.')) return;
    const r = await fetch(`${API}/admin/reset/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ what }) });
    const d = await r.json(); setMsg(d.message); load();
  };

  /* 716 rows is a directory, not a list: without a search this is a wall.
     `onlyGaps` is the one that gets used -- it is the work queue, the people
     who cannot be paid or whose request has nowhere to go. */
  const allRows = users?.users || [];
  const needle = uq.trim().toLowerCase();
  const rows = allRows.filter((u: any) =>
    (!needle || `${u.name} ${u.employee_id} ${u.email} ${u.department}`.toLowerCase().includes(needle))
    && (!onlyGaps || u.needs_level || !u.reporting_manager_id));

  if (sel) return <Detail id={sel} user={user} onBack={() => setSel(null)} />;
  const reqs = (ov?.requests || []).filter((r: any) => !filter || r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        {[{ k: 'overview', l: 'Overview', i: BarChart3 }, { k: 'requests', l: 'All Requests', i: FileText }, { k: 'users', l: 'Users', i: Users }, { k: 'danger', l: 'Danger Zone', i: Trash2 }].map(t => (
          <button key={t.k} onClick={() => setSub(t.k)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${sub === t.k ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md scale-105' : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-500'}`}><t.i className="w-4 h-4" />{t.l}</button>
        ))}
        <button onClick={load} className="ml-auto flex items-center gap-1 text-slate-400 hover:text-indigo-500 text-sm transition-colors active:rotate-180 duration-500"><RefreshCw className="w-4 h-4" />Refresh</button>
      </div>
      {msg && <p className="text-emerald-600 text-sm font-semibold bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{msg}</p>}

      {sub === 'overview' && ov && (() => {
        const processed = ov.approved + ov.paid + ov.rejected;
        const approvalRate = processed ? ((ov.approved + ov.paid) / processed) * 100 : 0;
        const pendingTotal = ov.pending_manager + ov.pending_hr + ov.pending_finance;
        const pipeline = [
          { l: 'Submitted', v: ov.by_status?.submitted || 0, c: '#f59e0b' },
          { l: 'Manager ✓', v: ov.by_status?.manager_approved || 0, c: '#3b82f6' },
          { l: `${HR_LABEL} ✓`, v: ov.by_status?.hr_approved || 0, c: '#8b5cf6' },
          { l: 'Finance ✓', v: ov.by_status?.finance_approved || 0, c: '#10b981' },
          { l: 'Paid', v: ov.by_status?.paid || 0, c: '#0d9488' },
        ];
        const typeMeta: any = {
          tour_sanction: { l: 'Tour Sanction', i: FileText, g: 'from-sky-400 to-blue-500' },
          travel_expense: { l: 'Travel Expenses', i: Receipt, g: 'from-violet-400 to-purple-500' },
          local_travel: { l: 'Local Travel', i: Car, g: 'from-amber-400 to-orange-500' },
        };
        return (
          <div className="space-y-4 stagger">
            {/* Hero */}
            <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-600 bg-[length:200%_200%] animate-gradient p-6 text-white shadow-xl relative overflow-hidden sheen">
              <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10 animate-float-slow" />
              <div className="absolute right-24 -bottom-8 w-28 h-28 rounded-full bg-white/5 animate-float" />
              <div className="relative flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-white/70 text-sm font-semibold flex items-center gap-1.5"><Activity className="w-4 h-4" />Total Travel Requests</p>
                  <p className="text-6xl font-black leading-none mt-1"><Count n={ov.total_requests} /></p>
                  <p className="text-white/80 text-sm mt-2">{ov.total_users} users · <span className="text-amber-200 font-bold">{pendingTotal} pending</span> · <span className="text-rose-200 font-bold">{ov.rejected} rejected</span></p>
                </div>
                <div className="flex gap-6 ml-auto items-center flex-wrap">
                  <div className="text-center"><p className="text-white/70 text-xs flex items-center gap-1 justify-center"><Wallet className="w-3 h-3" />Claimed</p><p className="text-2xl font-black"><Count n={ov.total_claimed} prefix="₹" /></p></div>
                  <div className="text-center"><p className="text-white/70 text-xs flex items-center gap-1 justify-center"><CheckCircle className="w-3 h-3" />Approved</p><p className="text-2xl font-black"><Count n={ov.total_approved} prefix="₹" /></p></div>
                  <div className="bg-white/15 rounded-2xl px-3 py-2 backdrop-blur"><Ring pct={approvalRate} label="Approval" /></div>
                </div>
              </div>
            </div>

            {/* Pipeline funnel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-500" />Approval Pipeline</h3>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {pipeline.map((p, i) => (
                  <div key={p.l} className="flex items-center gap-1 flex-1 min-w-[110px]">
                    <div className="hover-lift flex-1 rounded-2xl p-4 text-center text-white shadow-md" style={{ background: `linear-gradient(135deg, ${p.c}, ${p.c}bb)` }}>
                      <p className="text-3xl font-black leading-none"><Count n={p.v} /></p>
                      <p className="text-[11px] font-semibold text-white/90 mt-1">{p.l}</p>
                    </div>
                    {i < pipeline.length - 1 && <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 animate-pulse" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Type cards + Financial + Approval */}
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(typeMeta).map(([k, m]: any) => (
                <div key={k} className={`hover-lift rounded-2xl p-5 text-white bg-gradient-to-br ${m.g} shadow-md relative overflow-hidden`}>
                  <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 animate-float-slow" />
                  <m.i className="w-6 h-6 mb-3 opacity-90" />
                  <p className="text-4xl font-black"><Count n={ov.by_type?.[k] || 0} /></p>
                  <p className="text-sm text-white/85 font-semibold">{m.l}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Status distribution */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-violet-500" />Status Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(STATUS_LABELS).map(([s, l]) => { const v = ov.by_status?.[s] || 0; return (
                    <div key={s} className="flex items-center gap-3 text-sm">
                      <span className="w-32 text-slate-500 text-xs shrink-0">{l}</span>
                      <div className="flex-1"><PBar value={v} max={ov.total_requests} grad={s.includes('reject') ? 'from-rose-400 to-red-500' : s === 'paid' ? 'from-teal-500 to-emerald-600' : s.includes('approved') ? 'from-emerald-400 to-teal-500' : 'from-amber-400 to-orange-500'} /></div>
                      <span className="w-8 text-right font-black text-slate-700">{v}</span>
                    </div>
                  ); })}
                </div>
              </div>
              {/* Financial summary */}
              <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-2xl border-2 border-emerald-100 shadow-sm p-5">
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" />Financial Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">Total Claimed</span><span className="font-black text-amber-600 text-lg">₹{fmt(ov.total_claimed)}</span></div>
                  <PBar value={ov.total_claimed} max={ov.total_claimed || 1} grad="from-amber-400 to-orange-500" />
                  <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">Total Approved</span><span className="font-black text-emerald-600 text-lg">₹{fmt(ov.total_approved)}</span></div>
                  <PBar value={ov.total_approved} max={ov.total_claimed || 1} grad="from-emerald-400 to-teal-500" />
                  <div className="flex justify-between items-center pt-2 border-t-2 border-emerald-100"><span className="text-slate-600 font-bold text-sm">Overall Approval Rate</span><span className="font-black text-indigo-600 text-xl">{approvalRate.toFixed(1)}%</span></div>
                </div>
              </div>
            </div>

            {/* Dept + roles */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-pink-500" />Requests by Department</h3>
                <div className="space-y-2">
                  {Object.entries(ov.by_department || {}).slice(0, 8).map(([k, v]: any) => (
                    <div key={k} className="flex items-center gap-3 text-sm"><span className="w-28 text-slate-500 text-xs truncate shrink-0">{k}</span><div className="flex-1"><PBar value={v} max={ov.total_requests} grad="from-pink-400 to-rose-500" /></div><span className="w-8 text-right font-black text-slate-700">{v as number}</span></div>
                  ))}
                  {Object.keys(ov.by_department || {}).length === 0 && <span className="text-xs text-slate-300">No data</span>}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-500" />Users by Role</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['employee', 'manager', 'hr', 'finance', 'admin'].filter(r => ov.users_by_role?.[r]).map((k) => {
                    const grads: any = { employee: 'from-blue-500 to-indigo-600', manager: 'from-violet-500 to-purple-600', hr: 'from-pink-500 to-rose-600', finance: 'from-emerald-500 to-teal-600', admin: 'from-slate-600 to-slate-800' };
                    return <div key={k} className={`hover-lift bg-gradient-to-br ${grads[k]} rounded-2xl p-3 text-center text-white shadow-md`}><p className="text-2xl font-black"><Count n={ov.users_by_role[k]} /></p><p className="text-[11px] text-white/80 capitalize">{k}</p></div>;
                  })}
                  {Object.keys(ov.users_by_role || {}).length === 0 && <span className="text-xs text-slate-300 col-span-2">No users yet</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {sub === 'requests' && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filter} onChange={e => setFilter(e.target.value)} className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
              <option value="">All statuses ({ov?.requests?.length || 0})</option>
              {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s]} ({ov?.by_status?.[s] || 0})</option>)}
            </select>
            <span className="text-slate-400 text-sm">{reqs.length} shown</span>
          </div>
          <div className="space-y-2 stagger">
            {reqs.map((r: any) => <ReqCard key={r.id} r={r} onClick={() => setSel(r.id)} />)}
            {reqs.length === 0 && <p className="text-slate-300 text-center py-10">No requests.</p>}
          </div>
        </>
      )}

      {sub === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                User Directory ({users?.total ?? 0})
              </h3>
              <p className="text-slate-500 text-[13px] mt-0.5">
                Everyone comes from the HRMS master. Name, email, designation and
                department are maintained in Pocket HRMS; the role, level, HQ and
                approver are set here.
              </p>
            </div>
            <button onClick={syncUsers} disabled={busy}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600
                         text-white rounded-xl text-sm font-bold disabled:opacity-60">
              <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
              {busy ? 'Syncing…' : 'Sync from HRMS master'}
            </button>
          </div>

          {(users?.needs_level > 0 || users?.no_manager > 0) && (
            <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3">
              <p className="text-[13px] font-bold text-amber-800">
                Nobody can use TA/DA until these are filled in.
              </p>
              <ul className="mt-1 text-[12.5px] text-amber-700 font-semibold space-y-0.5">
                {users.needs_level > 0 && (
                  <li><b>{users.needs_level}</b> have no level — every allowance is worked
                      out from it, so theirs comes to zero.</li>
                )}
                {users.no_manager > 0 && (
                  <li><b>{users.no_manager}</b> have no approver — a request from them has
                      nobody to go to. The master is read for all four of reporting
                      manager, HOD, leave approver and leave recommender; these are the
                      people Pocket HRMS has none of them for.</li>
                )}
              </ul>
              <button onClick={() => { setOnlyGaps(true); setUq(''); }}
                className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[12px] font-black">
                Show only these
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input value={uq} onChange={e => setUq(e.target.value)}
              placeholder="Search a name, employee ID, email or department…"
              className="flex-1 min-w-[220px] px-3 py-2 rounded-xl ring-1 ring-slate-200
                         text-[13px] text-slate-700" />
            <button onClick={() => setOnlyGaps(v => !v)}
              className={`px-3 py-2 rounded-xl text-[12px] font-black ring-1 transition-colors
                ${onlyGaps ? 'bg-amber-500 text-white ring-amber-500'
                           : 'bg-white text-slate-500 ring-slate-200 hover:text-amber-600'}`}>
              Needs setting up
            </button>
            <span className="text-[12px] font-bold text-slate-400">
              {rows.length === allRows.length
                ? `${allRows.length} people`
                : `${rows.length} of ${allRows.length}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[1020px]">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  {['Employee', 'Department', 'Grade', 'Level', 'HQ city', 'Approver',
                    'HOD (HRMS)', 'Role'].map(h => (
                    <th key={h} className="px-2.5 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((u: any) => (
                  <tr key={u.id} className={`border-b border-slate-50 ${u.is_active ? '' : 'opacity-50'}`}>
                    <td className="px-2.5 py-2">
                      <p className="font-black text-slate-800">{u.name}</p>
                      <p className="text-slate-400 text-[11px]">{u.employee_id} · {u.email || 'no email'}</p>
                    </td>
                    <td className="px-2.5 py-2 text-slate-500">{u.department || '—'}</td>
                    <td className="px-2.5 py-2 text-slate-400 font-semibold">{u.grade || '—'}</td>
                    <td className="px-2.5 py-2">
                      <select value={u.level} onChange={e => saveUser(u.id, 'level', e.target.value)}
                        className={`w-[86px] px-2 py-1.5 rounded-lg ring-1 font-bold bg-white
                          ${u.needs_level ? 'ring-amber-300 bg-amber-50 text-amber-700'
                                          : 'ring-slate-200 text-slate-700'}`}>
                        <option value="">Set…</option>
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-2.5 py-2">
                      <input defaultValue={u.hq_city} placeholder="Base city"
                        onBlur={e => e.target.value.trim() !== u.hq_city
                          && saveUser(u.id, 'hq_city', e.target.value)}
                        className="w-32 px-2 py-1.5 rounded-lg ring-1 ring-slate-200 text-slate-700" />
                    </td>
                    <td className="px-2.5 py-2">
                      <input list="tada-approvers" defaultValue={u.reporting_manager_id}
                        placeholder="Search a name…"
                        onBlur={e => e.target.value.trim() !== u.reporting_manager_id
                          && saveUser(u.id, 'reporting_manager_id', e.target.value)}
                        className={`w-40 px-2 py-1.5 rounded-lg ring-1 text-slate-700
                          ${u.reporting_manager_id ? 'ring-slate-200' : 'ring-amber-300 bg-amber-50'}`} />
                      {(u.reporting_manager_name || u.approver_source) && (
                        <p className="text-slate-400 text-[11px] mt-0.5 truncate max-w-[160px]">
                          {u.reporting_manager_name}
                          {/* Where it came from. HRMS sends a reporting manager for
                              almost nobody, so most of these are routed through the
                              HOD or the leave chain — worth seeing before trusting it. */}
                          {u.approver_source && u.approver_source !== 'manager' && (
                            <span className="text-slate-300"> · via {u.approver_source}</span>
                          )}
                        </p>
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-[12px]">
                      {u.hod_name || u.hod_id
                        ? <><span className="text-slate-600 font-semibold">{u.hod_name || u.hod_id}</span>
                            {u.hod_name && u.hod_id && (
                              <span className="block text-slate-300 text-[11px]">{u.hod_id}</span>)}</>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-2.5 py-2">
                      <select value={u.role} onChange={e => saveUser(u.id, 'role', e.target.value)}
                        className="px-2 py-1 rounded-lg ring-1 ring-slate-200 font-bold text-slate-700 bg-white">
                        {['employee', 'manager', 'hr', 'finance', 'travel_desk', 'admin'].map(r => (
                          <option key={r} value={r}>{r === 'hr' ? HR_LABEL : r.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users && allRows.length === 0 && (
              <p className="text-slate-300 text-center py-10">
                Nobody here yet — press Sync from HRMS master.
              </p>
            )}
            {users && allRows.length > 0 && rows.length === 0 && (
              <p className="text-slate-300 text-center py-10">Nobody matches that.</p>
            )}
            {/* Every employee, so an approver can be picked by name rather
                than by remembering a code. */}
            <datalist id="tada-approvers">
              {allRows.map((u: any) => (
                <option key={u.id} value={u.employee_id}>{u.name} · {u.department}</option>
              ))}
            </datalist>
          </div>
        </div>
      )}

      {sub === 'danger' && (
        <div className="bg-rose-50 rounded-2xl border-2 border-rose-200 p-6 space-y-3">
          <h3 className="font-black text-rose-700 flex items-center gap-2"><AlertCircle className="w-5 h-5" />Danger Zone</h3>
          <p className="text-rose-600 text-sm">These actions permanently delete data. Use with care.</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => reset('requests')} className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-rose-300 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100"><Trash2 className="w-4 h-4" />Clear All Requests</button>
            <button onClick={() => reset('all')} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700"><Trash2 className="w-4 h-4" />Clear Requests + Users</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Portal shell ──────────────────────────────────────────────────────────────

/* Admin view: the user directory, bulk import, and portal-wide figures. */
import { useState, useEffect } from 'react';
import {
  Trash2, Upload, CheckCircle, FileText, Receipt, Car, AlertCircle, RefreshCw, ChevronRight, Users, Shield, BarChart3, TrendingUp, Wallet, Activity,
} from 'lucide-react';
import { API, fmt, HR_LABEL, type User } from './shared';
import { Count, PBar, Ring } from './components';
import { Detail, ReqCard } from './RequestDetail';

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

  const imp = async (e: any) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f);
    const r = await fetch(`${API}/users/import/`, { method: 'POST', body: fd });
    const d = await r.json(); setMsg(d.message || d.error); load(); e.target.value = '';
  };
  const reset = async (what: string) => {
    if (!confirm(what === 'all' ? 'Clear ALL requests AND users? This cannot be undone.' : 'Clear ALL travel requests? This cannot be undone.')) return;
    const r = await fetch(`${API}/admin/reset/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ what }) });
    const d = await r.json(); setMsg(d.message); load();
  };

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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
          <h3 className="font-black text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" />User Directory ({ov?.total_users ?? 0})</h3>
          <p className="text-slate-500 text-sm">Import users: Employee ID, Name, Email, Level (M1-M7/E1-E4), Role (employee/manager/hr/finance), Reporting Manager ID.</p>
          <div className="flex gap-2">
            <a href={`${API}/users/template/`} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold"><FileText className="w-4 h-4" />Download Template</a>
            <label className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-bold cursor-pointer"><Upload className="w-4 h-4" />Import Users<input type="file" accept=".xlsx" className="hidden" onChange={imp} /></label>
          </div>
          {ov?.users_by_role && <div className="flex gap-2 flex-wrap pt-2">{Object.entries(ov.users_by_role).map(([k, v]: any) => <span key={k} className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600 capitalize">{k}: {v as number}</span>)}</div>}
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

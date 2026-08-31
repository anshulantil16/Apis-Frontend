/* The superadmin's control room.
 *
 * Three things live here, because they are the three questions an
 * administrator actually has:
 *   People    — who can sign in, and which tools they may open
 *   HRMS      — what Pocket HRMS is sending us, verbatim, and when we last pulled it
 *   Sessions  — who is signed in right now, and how to end it
 *
 * The master data tab shows the raw feed rather than only the fields the
 * portal maps: a wrong department or a missing email needs to be traceable to
 * upstream, not guessed at.
 */
import { useEffect, useState } from 'react';
import {
  Users, RefreshCw, Database, Monitor, Search, ShieldCheck, X, Check, AlertCircle,
  Loader2, LogOut, Eye, Crown,
} from 'lucide-react';
import { portalFetch, type PortalUser } from './session';

type Tab = 'people' | 'hrms' | 'sessions';

export function AdminConsole({ me }: { me: PortalUser }) {
  const [tab, setTab] = useState<Tab>('people');
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const TABS: { k: Tab; label: string; icon: any }[] = [
    { k: 'people', label: 'People & Access', icon: Users },
    { k: 'hrms', label: 'HRMS Master Data', icon: Database },
    { k: 'sessions', label: 'Live Sessions', icon: Monitor },
  ];

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`ih-pop-in fixed top-5 right-5 z-50 px-4 py-3 rounded-xl border font-bold text-sm shadow-xl
          ${toast.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                     : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {toast.t}
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 text-white p-5 flex items-center gap-4 shadow-lg sheen">
        <div className="w-12 h-12 bg-amber-400/20 backdrop-blur rounded-xl flex items-center justify-center shrink-0">
          <Crown className="w-6 h-6 text-amber-300" />
        </div>
        <div className="min-w-0">
          <p className="text-white/70 text-sm font-semibold">Administrator console</p>
          <p className="text-xl font-black leading-tight truncate">{me.name}</p>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              tab === t.k ? 'bg-slate-900 text-white shadow-lg'
                          : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'people' && <PeopleTab onToast={setToast} />}
      {tab === 'hrms' && <HrmsTab onToast={setToast} />}
      {tab === 'sessions' && <SessionsTab onToast={setToast} />}
    </div>
  );
}

// ── People & access ──────────────────────────────────────────────────────────
type Facet = 'all' | 'active' | 'disabled' | 'admins' | 'no-access' | 'hrms' | 'manual' | 'never-signed-in';

const FACETS: { k: Facet; label: string }[] = [
  { k: 'all', label: 'Everyone' },
  { k: 'active', label: 'Can sign in' },
  { k: 'disabled', label: 'Disabled' },
  { k: 'admins', label: 'Administrators' },
  { k: 'no-access', label: 'No tools yet' },
  { k: 'never-signed-in', label: 'Never signed in' },
  { k: 'hrms', label: 'From HRMS' },
  { k: 'manual', label: 'Added by hand' },
];

function PeopleTab({ onToast }: { onToast: (t: { t: string; ok: boolean }) => void }) {
  const [data, setData] = useState<any>({ users: [], apps: [] });
  const [q, setQ] = useState('');
  const [facet, setFacet] = useState<Facet>('all');
  const [dept, setDept] = useState('');
  const [appFilter, setAppFilter] = useState('');
  const [sort, setSort] = useState<'name' | 'department' | 'last_login' | 'tools'>('name');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<any>(null);       // the person being inspected
  const [detail, setDetail] = useState<any>(null);

  const load = (query = '') => {
    setLoading(true);
    portalFetch(`/admin/users/${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const inspect = (u: any) => {
    setOpen(u); setDetail(null);
    portalFetch(`/admin/users/${u.id}/`).then(r => r.json()).then(setDetail).catch(() => {});
  };

  const patch = async (u: any, body: any) => {
    const r = await portalFetch(`/admin/users/${u.id}/`, { method: 'PATCH', body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    onToast({ t: r.ok ? d.message || 'Updated' : d.error || 'Could not update', ok: r.ok });
    if (r.ok) {
      load(q);
      if (open?.id === u.id) { setOpen(d.user); inspect(d.user); }
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  /* Filtering happens over the fetched page rather than round-tripping: the
     directory is a few hundred people, and an administrator flicking between
     facets should not wait on the network each time. The search box still
     goes to the server, because that one has to reach past the page limit. */
  const all: any[] = data.users || [];
  const departments: string[] = Array.from(
    new Set(all.map(u => u.department).filter(Boolean))).sort();

  // A pure predicate, so the tab counts and the table can share one definition
  // instead of two that drift apart.
  const matches = (u: any, f: Facet) => {
    switch (f) {
      case 'active': return u.is_active;
      case 'disabled': return !u.is_active;
      case 'admins': return u.is_superadmin;
      case 'no-access': return !u.is_superadmin && (u.allowed_apps?.length ?? 0) === 0;
      case 'never-signed-in': return !u.last_login_at;
      case 'hrms': return u.from_hrms;
      case 'manual': return !u.from_hrms;
      default: return true;
    }
  };

  const rows = all
    .filter(u => matches(u, facet))
    .filter(u => !dept || u.department === dept)
    .filter(u => !appFilter || u.is_superadmin || (u.allowed_apps || []).includes(appFilter))
    .sort((a, b) => {
      if (sort === 'department') return (a.department || '').localeCompare(b.department || '')
                                        || a.name.localeCompare(b.name);
      if (sort === 'tools') return (b.allowed_apps?.length ?? 0) - (a.allowed_apps?.length ?? 0);
      if (sort === 'last_login') {
        // Never-signed-in sinks to the bottom rather than sorting as "oldest",
        // which would bury the people an admin most wants to notice.
        if (!a.last_login_at && !b.last_login_at) return a.name.localeCompare(b.name);
        if (!a.last_login_at) return 1;
        if (!b.last_login_at) return -1;
        return b.last_login_at.localeCompare(a.last_login_at);
      }
      return a.name.localeCompare(b.name);
    });

  const facetCount = (f: Facet) => all.filter(u => matches(u, f)).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[['People', data.total], ['Can sign in', data.active],
          ['Administrators', data.superadmins],
          ['HRMS link', data.hrms_configured ? 'Connected' : 'Not set up']].map(([l, v]: any) => (
          <div key={l} className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{l}</p>
            <p className="text-lg font-black text-slate-800">{v ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={e => { setQ(e.target.value); load(e.target.value); }}
          placeholder="Search by name, email, code or department…"
          className="w-full border-2 border-slate-200 focus:border-indigo-400 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none" />
      </div>

      {/* The questions an administrator actually arrives with, as one click
          each — a count on every chip so "who has no access yet" is answered
          before it is even opened. */}
      <div className="flex gap-1.5 flex-wrap">
        {FACETS.map(f => {
          const n = facetCount(f.k);
          const on = facet === f.k;
          return (
            <button key={f.k} onClick={() => setFacet(f.k)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border-2 transition-all ${
                on ? 'border-slate-900 bg-slate-900 text-white'
                   : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
              {f.label}
              <span className={`ml-1.5 ${on ? 'text-white/60' : 'text-slate-300'}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <select value={dept} onChange={e => setDept(e.target.value)}
          className="border-2 border-slate-200 focus:border-indigo-400 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none">
          <option value="">All departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={appFilter} onChange={e => setAppFilter(e.target.value)}
          className="border-2 border-slate-200 focus:border-indigo-400 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none">
          <option value="">Any tool access</option>
          {(data.apps || []).map((a: any) => (
            <option key={a.key} value={a.key}>Can open: {a.label}</option>))}
        </select>

        <select value={sort} onChange={e => setSort(e.target.value as any)}
          className="border-2 border-slate-200 focus:border-indigo-400 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none">
          <option value="name">Sort: Name</option>
          <option value="department">Sort: Department</option>
          <option value="last_login">Sort: Recently signed in</option>
          <option value="tools">Sort: Most tools</option>
        </select>

        {(facet !== 'all' || dept || appFilter || q) && (
          <button onClick={() => { setFacet('all'); setDept(''); setAppFilter(''); setQ(''); load(''); }}
            className="text-[11px] font-black text-slate-400 hover:text-slate-700 px-2 py-1.5">
            Clear filters
          </button>
        )}
        <span className="ml-auto text-[11px] font-bold text-slate-400">
          Showing {rows.length} of {all.length}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-400">
              <tr>{['Person', 'Code', 'Department', 'Designation', 'Location', 'Source',
                    'Tools', 'Last sign-in', 'Status', ''].map(h => (
                <th key={h} className="px-3 py-2 text-left font-black whitespace-nowrap">{h}</th>))}</tr>
            </thead>
            <tbody>
              {rows.map((u: any) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-2">
                    <p className="font-black text-slate-800 flex items-center gap-1.5">
                      {u.name}
                      {u.is_superadmin && <Crown className="w-3 h-3 text-amber-500" />}
                    </p>
                    <p className="text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-500 font-semibold">{u.employee_code}</td>
                  <td className="px-3 py-2 text-slate-500">{u.department || '—'}</td>
                  <td className="px-3 py-2 text-slate-500 max-w-[160px] truncate"
                    title={u.designation || ''}>{u.designation || '—'}</td>
                  <td className="px-3 py-2 text-slate-500">{u.location || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] whitespace-nowrap ${
                      u.from_hrms ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-500'}`}>
                      {u.from_hrms ? 'Pocket HRMS' : 'Added here'}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {u.is_superadmin
                      ? <span className="text-amber-600">All</span>
                      : u.allowed_apps.length === 0
                        ? <span className="text-rose-500">None</span>
                        : <span className="text-slate-500">{u.allowed_apps.length}</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {u.last_login_at
                      ? <span className="text-slate-500">{u.last_login_at}</span>
                      : <span className="text-slate-300 font-semibold">Never</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                      u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => inspect(u)}
                      className="text-indigo-500 hover:text-indigo-700 font-black inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />Open
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-10 text-center text-slate-300 font-semibold">
                  {all.length === 0
                    ? 'No people yet — connect Pocket HRMS and run a sync.'
                    : 'Nobody matches these filters.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <PersonDrawer u={open} detail={detail} apps={data.apps}
          onClose={() => { setOpen(null); setDetail(null); }} onPatch={patch} />
      )}
    </div>
  );
}

/** One person in full: their access, and exactly what HRMS sent for them. */
function PersonDrawer({ u, detail, apps, onClose, onPatch }: {
  u: any; detail: any; apps: any[]; onClose: () => void; onPatch: (u: any, b: any) => void;
}) {
  const granted: string[] = detail?.user?.allowed_apps ?? u.allowed_apps ?? [];
  const raw = detail?.hrms_raw || {};
  const rawKeys = Object.keys(raw);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl ih-fade" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-black text-slate-800 truncate flex items-center gap-1.5">
              {u.name}{u.is_superadmin && <Crown className="w-3.5 h-3.5 text-amber-500" />}
            </p>
            <p className="text-xs text-slate-400 truncate">{u.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {u.is_bootstrap && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-px" />
              <p className="text-[11px] text-amber-800 font-semibold">
                Founding administrator. This account cannot be disabled or demoted — it is the way back in.
              </p>
            </div>
          )}

          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Access</p>
            <div className="flex gap-2 flex-wrap">
              <button disabled={u.is_bootstrap}
                onClick={() => onPatch(u, { is_active: !u.is_active })}
                className={`px-3 py-1.5 rounded-lg text-xs font-black border-2 disabled:opacity-40 ${
                  u.is_active ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                {u.is_active ? 'Disable sign-in' : 'Enable sign-in'}
              </button>
              <button disabled={u.is_bootstrap}
                onClick={() => onPatch(u, { is_superadmin: !u.is_superadmin })}
                className="px-3 py-1.5 rounded-lg text-xs font-black border-2 border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-40">
                {u.is_superadmin ? 'Remove admin' : 'Make administrator'}
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Tools they may open
            </p>
            {u.is_superadmin ? (
              <p className="text-xs text-slate-500 font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                An administrator can open everything — individual tools are not toggled.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {apps.map(a => {
                  const on = granted.includes(a.key);
                  return (
                    <button key={a.key}
                      onClick={() => onPatch(u, {
                        app_access: on ? granted.filter(k => k !== a.key) : [...granted, a.key],
                      })}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border-2 text-left transition-all ${
                        on ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                           : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                      {on ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                      <span className="truncate">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Master data from Pocket HRMS
            </p>
            {!detail ? (
              <p className="text-xs text-slate-300 font-semibold">Loading…</p>
            ) : rawKeys.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                Nothing on file — this person was added here by hand, or has not been
                through an HRMS sync yet.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-[11px]">
                  <tbody>
                    {rawKeys.map(k => (
                      <tr key={k} className="border-b border-slate-100 last:border-0">
                        <td className="px-2.5 py-1.5 font-bold text-slate-500 align-top w-2/5">{k}</td>
                        <td className="px-2.5 py-1.5 text-slate-800 break-all">
                          {typeof raw[k] === 'object' ? JSON.stringify(raw[k]) : String(raw[k] ?? '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {detail?.user?.last_synced_at && (
              <p className="text-[10px] text-slate-400 mt-1.5">Last synced {detail.user.last_synced_at}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HRMS master data ─────────────────────────────────────────────────────────
function HrmsTab({ onToast }: { onToast: (t: { t: string; ok: boolean }) => void }) {
  const [info, setInfo] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState('');

  const load = () => portalFetch('/admin/sync/').then(r => r.json()).then(setInfo).catch(() => {});
  useEffect(() => { load(); }, []);

  const runSync = async () => {
    setBusy('sync');
    const r = await portalFetch('/admin/sync/', { method: 'POST', body: '{}' });
    const d = await r.json().catch(() => ({}));
    onToast({ t: r.ok ? d.message || 'Sync complete' : d.error || 'Sync failed', ok: r.ok });
    setBusy(''); load();
  };

  const peek = async () => {
    setBusy('peek');
    const r = await portalFetch('/admin/hrms-preview/?limit=5');
    const d = await r.json().catch(() => ({}));
    if (!r.ok) onToast({ t: d.error || 'Could not reach Pocket HRMS', ok: false });
    setPreview(r.ok ? d : null);
    setBusy('');
  };

  if (!info) return <div className="p-10 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      {!info.configured && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-amber-800 text-sm">Pocket HRMS is not connected yet</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Set <code className="bg-amber-100 px-1 rounded font-mono">POCKET_HRMS_TOKEN</code> in the
              server's <code className="bg-amber-100 px-1 rounded font-mono">.env</code> and restart.
              Ask Pocket HRMS support for your company's production token.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={runSync} disabled={!info.configured || !!busy}
          className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-sky-600 text-white font-black px-4 py-2.5 rounded-xl text-xs disabled:opacity-40 hover:shadow-lg transition-all">
          {busy === 'sync' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Pull employee master
        </button>
        <button onClick={peek} disabled={!info.configured || !!busy}
          className="flex items-center gap-1.5 bg-white border-2 border-slate-200 text-slate-600 font-black px-4 py-2.5 rounded-xl text-xs disabled:opacity-40 hover:border-indigo-300 transition-all">
          {busy === 'peek' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
          Preview raw feed
        </button>
      </div>

      {preview && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div>
            <p className="font-black text-slate-700 text-sm">Raw feed — {preview.count} sample record(s)</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Exactly what Pocket HRMS returned, before the portal maps anything.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Columns returned</p>
            <div className="flex flex-wrap gap-1">
              {preview.returned_columns?.length
                ? preview.returned_columns.map((c: string) => (
                    <span key={c} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{c}</span>))
                : <span className="text-[11px] text-slate-400">None — the feed returned no records.</span>}
            </div>
          </div>
          {preview.sample?.length > 0 && (
            <pre className="bg-slate-900 text-slate-100 rounded-xl p-3 text-[10px] overflow-x-auto max-h-80">
              {JSON.stringify(preview.sample, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <p className="font-black text-slate-700 text-sm px-4 py-3 border-b border-slate-100">Sync history</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-400">
              <tr>{['When', 'By', 'Fetched', 'New', 'Updated', 'Disabled', 'No email', 'Result'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-black">{h}</th>))}</tr>
            </thead>
            <tbody>
              {(info.logs || []).map((l: any) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-600 font-semibold whitespace-nowrap">{l.started_at}</td>
                  <td className="px-3 py-2 text-slate-400 truncate max-w-[140px]">{l.triggered_by}</td>
                  <td className="px-3 py-2 text-slate-600">{l.fetched}</td>
                  <td className="px-3 py-2 text-emerald-600 font-bold">{l.created}</td>
                  <td className="px-3 py-2 text-sky-600 font-bold">{l.updated}</td>
                  <td className="px-3 py-2 text-rose-600 font-bold">{l.deactivated}</td>
                  <td className="px-3 py-2 text-amber-600 font-bold">{l.skipped_no_email}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                      l.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {l.ok ? 'OK' : 'Failed'}
                    </span>
                  </td>
                </tr>
              ))}
              {(info.logs || []).length === 0 && (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-slate-300 font-semibold">
                  No syncs yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Live sessions ────────────────────────────────────────────────────────────
function SessionsTab({ onToast }: { onToast: (t: { t: string; ok: boolean }) => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => portalFetch('/admin/sessions/').then(r => r.json())
    .then(d => { setRows(d.sessions || []); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const end = async (id: number) => {
    const r = await portalFetch(`/admin/sessions/${id}/`, { method: 'DELETE' });
    const d = await r.json().catch(() => ({}));
    onToast({ t: r.ok ? 'Session ended' : d.error || 'Could not end it', ok: r.ok });
    if (r.ok) load();
  };

  if (loading) return <div className="p-10 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-400">
            <tr>{['Person', 'From', 'Device', 'Last seen', ''].map(h => (
              <th key={h} className="px-3 py-2 text-left font-black">{h}</th>))}</tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <p className="font-black text-slate-800">
                    {s.name}{s.is_you && <span className="text-indigo-500 font-bold ml-1.5">(you)</span>}
                  </p>
                  <p className="text-slate-400">{s.email}</p>
                </td>
                <td className="px-3 py-2 text-slate-500 font-mono">{s.ip_address || '—'}</td>
                <td className="px-3 py-2 text-slate-400 truncate max-w-[220px]">{s.user_agent || '—'}</td>
                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{s.last_seen_at}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => end(s.id)}
                    className="text-rose-500 hover:text-rose-700 font-black inline-flex items-center gap-1">
                    <LogOut className="w-3.5 h-3.5" />{s.is_you ? 'Sign myself out' : 'End'}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-300 font-semibold">
                Nobody is signed in.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

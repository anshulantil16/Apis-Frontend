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
  Loader2, LogOut, Eye, Crown, UserPlus, Trash2, Grid3x3,
} from 'lucide-react';
import { portalFetch, type PortalUser } from './session';

type Tab = 'people' | 'access' | 'hrms' | 'sessions';

export function AdminConsole({ me }: { me: PortalUser }) {
  const [tab, setTab] = useState<Tab>('people');
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const TABS: { k: Tab; label: string; icon: any }[] = [
    { k: 'people', label: 'People', icon: Users },
    { k: 'access', label: 'Who can open what', icon: Grid3x3 },
    { k: 'hrms', label: 'HRMS Master Data', icon: Database },
    { k: 'sessions', label: 'Live Sessions', icon: Monitor },
  ];

  return (
    /* The same ground, wash and container every other page uses. Without the
       wrapper this screen had no max-width and no padding, so wide content
       ran straight off the right edge. */
    <div className="min-h-full bg-[#f8fafc] relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ih-aurora absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-violet-300/20 blur-[130px]" />
        <div className="ih-drift absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-amber-300/20 blur-[130px]" style={{ animationDelay: '6s' }} />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-6 py-5 space-y-5">
      {toast && (
        <div className={`ih-pop-in fixed top-5 right-5 z-50 px-4 py-3 rounded-xl border font-bold text-sm shadow-xl
          ${toast.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                     : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {toast.t}
        </div>
      )}

      <div className="ih-sweep relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900
                      text-white p-5 shadow-lg overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 85% 20%, rgba(245,158,11,.35), transparent 55%)' }} />
        <div className="relative flex items-center gap-4 flex-wrap">
          <div className="ih-halo w-12 h-12 bg-amber-400/20 backdrop-blur rounded-xl flex items-center
                          justify-center shrink-0" style={{ ['--ih-halo' as any]: 'rgba(245,158,11,.35)' }}>
            <Crown className="w-6 h-6 text-amber-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white/60 text-[11px] font-black uppercase tracking-widest">Administrator console</p>
            <p className="text-xl font-black leading-tight truncate">{me.name}</p>
            <p className="text-white/50 text-xs font-semibold truncate">{me.email}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-white/50 text-[11px] font-bold">Signed in</p>
            <p className="text-sm font-black text-amber-300">{me.last_login_at || 'just now'}</p>
          </div>
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
      {tab === 'access' && <AccessTab onToast={setToast} />}
      {tab === 'hrms' && <HrmsTab onToast={setToast} />}
      {tab === 'sessions' && <SessionsTab onToast={setToast} />}
      </div>
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

  const [picked, setPicked] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

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

  /* Bulk work. Opening thirty drawers to give thirty people the same tool is
     how an administrator ends up not bothering, and everyone is left with
     whatever the default was. */
  const toggleOne = (id: number) =>
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  const allShownPicked = rows.length > 0 && rows.every((u: any) => picked.includes(u.id));

  /* portalFetch hands back the raw Response, like the rest of this file, so
     every one of these reads the body itself and surfaces the server's own
     sentence rather than a generic failure. */
  const runBulk = async (action: string, app?: string) => {
    if (!picked.length) return;
    setBusy(true);
    const r = await portalFetch('/admin/bulk-access/', {
      method: 'POST', body: JSON.stringify({ user_ids: picked, action, app }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setNote(`${d.message}${d.skipped?.length ? ` Skipped ${d.skipped.join(', ')}.` : ''}`);
      setPicked([]);
      await load(q);
    } else {
      onToast({ t: d.error || 'That did not work.', ok: false });
    }
    setBusy(false);
  };

  const addPerson = async (body: any) => {
    const r = await portalFetch('/admin/users/', { method: 'POST', body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Could not add them.');
    setNote(d.message);
    setAdding(false);
    await load(q);
  };

  const removePerson = async (u: any, confirmName: string) => {
    const r = await portalFetch(`/admin/users/${u.id}/`, {
      method: 'DELETE', body: JSON.stringify({ confirm_name: confirmName }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Could not remove them.');
    setNote(`${d.message}${d.warning ? ` ${d.warning}` : ''}`);
    setOpen(null);
    await load(q);
  };


  return (
    <div className="space-y-4">
      {/* Headline counts. Each carries the one thing it implies, so the row
          answers "is anything wrong?" rather than only "how many?". */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[
          { l: 'People', v: data.total, sub: `${all.length} loaded`, icon: Users, tone: 'text-slate-800' },
          { l: 'Can sign in', v: data.active,
            sub: `${(data.total ?? 0) - (data.active ?? 0)} disabled`, icon: ShieldCheck,
            tone: 'text-emerald-600' },
          { l: 'Administrators', v: data.superadmins, sub: 'full access', icon: Crown,
            tone: 'text-amber-600' },
          { l: 'Awaiting access', v: facetCount('no-access'), sub: 'no tools granted',
            icon: AlertCircle,
            tone: facetCount('no-access') > 0 ? 'text-rose-600' : 'text-slate-800' },
        ].map(k => (
          <div key={k.l} className="ih-tilt bg-white border border-slate-200 rounded-xl px-3.5 py-3
                                    flex items-start gap-3 shadow-sm">
            <span className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
              <k.icon className="w-4 h-4 text-slate-400" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{k.l}</p>
              <p className={`text-xl font-black leading-none mt-0.5 ${k.tone}`}>{k.v ?? '—'}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tool access coverage — how many people can open each tool.
          One measure across categories, so one hue light-to-dark rather than a
          categorical palette; the count is direct-labelled so nobody has to
          read a length off an axis that isn't there. */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
          <div>
            <p className="font-black text-slate-700 text-sm">Tool access coverage</p>
            <p className="text-[11px] text-slate-400 font-semibold">
              People who can open each tool. Administrators count toward every one.
            </p>
          </div>
          <p className="text-[11px] font-bold text-slate-400">of {all.length} people</p>
        </div>
        <div className="space-y-1.5">
          {(data.apps || []).map((a: any) => {
            const n = all.filter(u => u.is_superadmin || (u.allowed_apps || []).includes(a.key)).length;
            const pct = all.length ? Math.round((n / all.length) * 100) : 0;
            const on = appFilter === a.key;
            return (
              <button key={a.key} onClick={() => setAppFilter(on ? '' : a.key)}
                title={`Show only people who can open ${a.label}`}
                className={`w-full flex items-center gap-3 rounded-lg px-2 py-1 text-left transition-colors
                  ${on ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-slate-50'}`}>
                <span className="w-32 shrink-0 text-[11px] font-bold text-slate-600 truncate">{a.label}</span>
                <span className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  {/* 4px rounded end, anchored to the baseline; a floor of 2%
                      so "one person" is still a visible mark rather than nothing. */}
                  <span className="block h-full rounded-full transition-all"
                    style={{ width: `${Math.max(pct, n > 0 ? 2 : 0)}%`,
                             backgroundColor: pct >= 66 ? '#b45309' : pct >= 33 ? '#f59e0b' : '#fcd34d' }} />
                </span>
                <span className="w-14 shrink-0 text-right text-[11px] font-black text-slate-700 tabular-nums">
                  {n}<span className="text-slate-300 font-bold"> · {pct}%</span>
                </span>
              </button>
            );
          })}
        </div>
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
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black shadow-sm">
          <UserPlus className="w-3.5 h-3.5" /> Add person
        </button>
      </div>

      {note && (
        <div className="ih-pop-in flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3.5 py-2.5">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-px" />
          <p className="text-[12px] font-bold text-indigo-900 flex-1">{note}</p>
          <button onClick={() => setNote('')} className="text-indigo-300 hover:text-indigo-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Acts on everyone ticked, so a whole department can be granted a tool
          in one go rather than one drawer at a time. */}
      {picked.length > 0 && (
        <div className="ih-pop-in sticky top-2 z-20 flex flex-wrap items-center gap-2 bg-slate-900 text-white rounded-xl px-4 py-2.5 shadow-lg">
          <span className="text-[12px] font-black">
            {picked.length} selected
          </span>
          <select disabled={busy} defaultValue=""
            onChange={e => { const [a, k] = e.target.value.split(':'); if (a) runBulk(a, k); e.target.value = ''; }}
            className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-[11px] font-bold outline-none">
            <option value="" className="text-slate-800">Grant a tool…</option>
            {(data.apps || []).map((a: any) => (
              <option key={a.key} value={`grant:${a.key}`} className="text-slate-800">{a.label}</option>
            ))}
          </select>
          <select disabled={busy} defaultValue=""
            onChange={e => { const [a, k] = e.target.value.split(':'); if (a) runBulk(a, k); e.target.value = ''; }}
            className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-[11px] font-bold outline-none">
            <option value="" className="text-slate-800">Revoke a tool…</option>
            {(data.apps || []).map((a: any) => (
              <option key={a.key} value={`revoke:${a.key}`} className="text-slate-800">{a.label}</option>
            ))}
          </select>
          <button disabled={busy} onClick={() => runBulk('enable')}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-[11px] font-black">
            Enable sign-in
          </button>
          <button disabled={busy} onClick={() => runBulk('disable')}
            className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-[11px] font-black">
            Disable sign-in
          </button>
          <button onClick={() => setPicked([])}
            className="ml-auto text-[11px] font-bold text-white/60 hover:text-white">
            Clear
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-slate-50 text-slate-400">
              <tr>
                <th className="px-3 py-2 w-8">
                  <input type="checkbox" checked={allShownPicked} className="w-3.5 h-3.5 accent-indigo-600"
                    title="Select everyone shown"
                    onChange={e => setPicked(e.target.checked ? rows.map((u: any) => u.id) : [])} />
                </th>
                {['Person', 'Code', 'Department', 'Designation', 'Location', 'Source',
                  'Tools', 'Last sign-in', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-black whitespace-nowrap">{h}</th>))}
              </tr>
            </thead>
            <tbody>
              {rows.map((u: any) => (
                <tr key={u.id} className={`border-t border-slate-100 hover:bg-slate-50/60 ${
                  picked.includes(u.id) ? 'bg-indigo-50/60' : ''}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={picked.includes(u.id)}
                      onChange={() => toggleOne(u.id)}
                      className="w-3.5 h-3.5 accent-indigo-600" />
                  </td>
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
          onClose={() => { setOpen(null); setDetail(null); }}
          onPatch={patch} onRemove={removePerson} />
      )}
      {adding && (
        <AddPerson apps={data.apps || []} onClose={() => setAdding(false)} onAdd={addPerson} />
      )}
    </div>
  );
}

/* A field that saves on blur rather than on every keystroke.
   Saving per keystroke would fire a request per letter; a Save button for one
   field is heavier than the edit itself. Blur is the moment someone has
   finished with a field. */
function EditField({ label, value, onSave, disabled, hint, type = 'text' }: {
  label: string; value: string; onSave: (v: string) => Promise<void> | void;
  disabled?: boolean; hint?: string; type?: string;
}) {
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(value ?? ''); }, [value]);

  const commit = async () => {
    if (draft === (value ?? '') || disabled) return;
    setSaving(true);
    try { await onSave(draft); } finally { setSaving(false); }
  };

  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
        {label}
        {saving && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
      </span>
      <input type={type} value={draft} disabled={disabled}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="w-full px-3 py-2 text-[13px] rounded-lg border-2 border-slate-200 focus:border-indigo-400 outline-none disabled:bg-slate-50 disabled:text-slate-400" />
      {hint && <span className="block text-[10px] text-slate-400 font-semibold mt-1">{hint}</span>}
    </label>
  );
}

/* Adding someone by hand — for the joiner HRMS has not sent yet, or a person
   who needs access before their record exists upstream. */
function AddPerson({ apps, onClose, onAdd }: {
  apps: any[]; onClose: () => void; onAdd: (b: any) => Promise<void>;
}) {
  const [f, setF] = useState<any>({
    email: '', name: '', employee_code: '', designation: '', department: '',
    location: '', app_access: ['home'],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.email.trim() || !f.name.trim() || !f.employee_code.trim()) {
      setError('An address, a name and an employee code are all required.'); return;
    }
    setBusy(true); setError('');
    try { await onAdd(f); } catch (e: any) { setError(e?.message || 'Could not add them.'); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl ih-fade"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="font-black text-slate-800">Add a person</p>
            <p className="text-[11px] text-slate-400 font-semibold">
              They can sign in as soon as this is saved.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {[['Work email', 'email', 'Where the sign-in code goes — this IS the sign-in identity'],
            ['Full name', 'name', ''],
            ['Employee code', 'employee_code', 'Must be unique'],
            ['Designation', 'designation', ''],
            ['Department', 'department', ''],
            ['Location', 'location', '']].map(([label, key, hint]) => (
            <label key={key} className="block">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {label}
              </span>
              <input value={f[key as string]} onChange={e => set(key as string, e.target.value)}
                className="w-full px-3 py-2 text-[13px] rounded-lg border-2 border-slate-200 focus:border-indigo-400 outline-none" />
              {hint && <span className="block text-[10px] text-slate-400 font-semibold mt-1">{hint}</span>}
            </label>
          ))}

          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Tools they may open
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {apps.map(a => {
                const on = f.app_access.includes(a.key);
                return (
                  <button key={a.key} type="button"
                    onClick={() => set('app_access', on
                      ? f.app_access.filter((k: string) => k !== a.key)
                      : [...f.app_access, a.key])}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border-2 text-left transition-all ${
                      on ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                         : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                    {on ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                    <span className="truncate">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-px" />
              <p className="text-[12px] font-bold text-rose-700">{error}</p>
            </div>
          )}

          <button onClick={submit} disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-[14px]">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Add them
          </button>
        </div>
      </div>
    </div>
  );
}

/** One person in full: their access, and exactly what HRMS sent for them. */
function PersonDrawer({ u, detail, apps, onClose, onPatch, onRemove }: {
  u: any; detail: any; apps: any[]; onClose: () => void;
  onPatch: (u: any, b: any) => void; onRemove: (u: any, name: string) => Promise<void>;
}) {
  const granted: string[] = detail?.user?.allowed_apps ?? u.allowed_apps ?? [];
  const raw = detail?.hrms_raw || {};
  const rawKeys = Object.keys(raw);
  const person = detail?.user ?? u;
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [removeError, setRemoveError] = useState('');

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

          {/* Details, editable in place. The address matters most: it is the
              sign-in identity, so a typo locks someone out with no clue why. */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Details
            </p>
            <EditField label="Work email" value={person.email} disabled={u.is_bootstrap}
              hint={u.is_bootstrap
                ? 'The founding account is recognised by its address, so this one is fixed.'
                : 'This is the sign-in identity — the code goes here.'}
              onSave={v => onPatch(u, { email: v })} />
            <EditField label="Full name" value={person.name}
              onSave={v => onPatch(u, { name: v })} />
            <div className="grid grid-cols-2 gap-3">
              <EditField label="Employee code" value={person.employee_code}
                onSave={v => onPatch(u, { employee_code: v })} />
              <EditField label="Location" value={person.location}
                onSave={v => onPatch(u, { location: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <EditField label="Designation" value={person.designation}
                onSave={v => onPatch(u, { designation: v })} />
              <EditField label="Department" value={person.department}
                onSave={v => onPatch(u, { department: v })} />
            </div>
            {u.from_hrms && (
              <p className="text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                Synced from Pocket HRMS. An edit here is overwritten on the next sync —
                fix it upstream for it to stick.
              </p>
            )}
          </div>

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

          {/* Removing, as opposed to disabling.
              Disabling is right for a leaver: it keeps the record and can be
              undone. This is for a row that should never have existed - a
              duplicate, a test account, a mistyped import - so it asks for the
              name rather than a yes/no, which is muscle memory. */}
          {!u.is_bootstrap && (
            <div className="border-2 border-dashed border-rose-200 rounded-xl p-3.5">
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">
                Remove from the portal
              </p>
              <p className="text-[11px] text-slate-500 font-semibold mb-2.5">
                Deletes the account outright. To stop someone signing in while keeping
                their record, disable them above instead.
              </p>
              {!confirming ? (
                <button onClick={() => { setConfirming(true); setRemoveError(''); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-black">
                  <Trash2 className="w-3.5 h-3.5" /> Remove {u.name.split(' ')[0]}
                </button>
              ) : (
                <>
                  <p className="text-[11px] font-bold text-rose-700 mb-1.5">
                    Type <span className="font-black">{u.name}</span> to confirm.
                  </p>
                  <div className="flex gap-2">
                    <input value={typed} onChange={e => setTyped(e.target.value)} autoFocus
                      placeholder={u.name}
                      className="flex-1 min-w-0 px-3 py-1.5 text-[12px] rounded-lg border-2 border-rose-200 focus:border-rose-400 outline-none" />
                    <button
                      onClick={async () => {
                        try { await onRemove(u, typed); }
                        catch (e: any) { setRemoveError(e?.message || 'Could not remove them.'); }
                      }}
                      disabled={typed.trim().toLowerCase() !== u.name.trim().toLowerCase()}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-[11px] font-black">
                      Remove
                    </button>
                    <button onClick={() => { setConfirming(false); setTyped(''); }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-black">
                      Cancel
                    </button>
                  </div>
                  {removeError && (
                    <p className="text-[11px] font-bold text-rose-700 mt-1.5">{removeError}</p>
                  )}
                </>
              )}
            </div>
          )}
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

  /* Pocket HRMS support's own recommended way to find this tenant's real
     configured column names: call the API with no EmployeeFields header at
     all, and read back whatever it sends. "EmailId" and "Email" in the
     default request are guesses until this has been run once and someone has
     read the result. */
  const discover = async () => {
    setBusy('discover');
    const r = await portalFetch('/admin/hrms-preview/?limit=3&discover=1');
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
        <button onClick={discover} disabled={!info.configured || !!busy}
          title="Calls the API with no EmployeeFields header, so Pocket HRMS returns this tenant's actual configured column names instead of us guessing"
          className="flex items-center gap-1.5 bg-white border-2 border-amber-200 text-amber-700 font-black px-4 py-2.5 rounded-xl text-xs disabled:opacity-40 hover:border-amber-400 transition-all">
          {busy === 'discover' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Discover real field names
        </button>
      </div>

      {preview && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div>
            <p className="font-black text-slate-700 text-sm">
              {preview.discovered ? 'Discovered fields' : 'Raw feed'} — {preview.count} sample record(s)
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {preview.discovered
                ? 'Called with no EmployeeFields header — these are the column names configured for this tenant. Set POCKET_HRMS_EMPLOYEE_FIELDS on the server to the ones the portal needs (email, name, department, etc.).'
                : 'Exactly what Pocket HRMS returned, before the portal maps anything.'}
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
        <div className="overflow-x-auto max-w-full">
          <table className="w-full min-w-[900px] text-xs">
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
      <div className="overflow-x-auto max-w-full">
        <table className="w-full min-w-[900px] text-xs">
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


// ── the access grid ──────────────────────────────────────────────────────────
/* Everyone against every tool, in one table.
 *
 * Deliberately a grid rather than a longer list. The People tab answers "what
 * can this person open" one drawer at a time; the question an administrator
 * actually has is comparative - who is missing Goal Setting, does anyone in
 * Sales still have TA/DA, did the new joiners get what their team has. That is
 * a question you answer by scanning DOWN a column, which a list cannot do.
 *
 * Every cell is a button. Clicking it grants or revokes on the spot, because
 * the alternative - tick things, then press Save - loses work whenever someone
 * navigates away, and an access screen is one people leave half-finished.
 */
function AccessTab({ onToast }: { onToast: (t: { t: string; ok: boolean }) => void }) {
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const [only, setOnly] = useState<'all' | 'gaps' | 'admins'>('all');
  const [saving, setSaving] = useState<string>('');

  const load = async () => {
    const r = await portalFetch('/admin/users/');
    setData(await r.json().catch(() => null));
  };
  useEffect(() => { load(); }, []);

  if (!data) {
    return <div className="py-20 text-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" /></div>;
  }

  const apps: any[] = data.apps || [];
  const people: any[] = data.users || [];
  const depts: string[] = [...new Set(people.map(u => u.department).filter(Boolean))].sort();

  const rows = people.filter(u => {
    if (dept && u.department !== dept) return false;
    if (only === 'admins' && !u.is_superadmin) return false;
    if (only === 'gaps' && (u.is_superadmin || (u.allowed_apps?.length ?? 0) > 0)) return false;
    if (!q.trim()) return true;
    const hay = `${u.name} ${u.email} ${u.employee_code} ${u.department}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  const has = (u: any, key: string) => u.is_superadmin || (u.allowed_apps || []).includes(key);

  /* One cell. The request goes out immediately and the row is marked busy, so
     a slow network cannot be mistaken for a click that did not register. */
  const toggle = async (u: any, key: string) => {
    if (u.is_superadmin) return;
    const id = `${u.id}:${key}`;
    setSaving(id);
    const next = has(u, key)
      ? (u.allowed_apps || []).filter((k: string) => k !== key)
      : [...(u.allowed_apps || []), key];
    const r = await portalFetch(`/admin/users/${u.id}/`, {
      method: 'PATCH', body: JSON.stringify({ app_access: next }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setData((p: any) => ({
        ...p,
        users: p.users.map((x: any) => (x.id === u.id ? { ...x, allowed_apps: next } : x)),
      }));
    } else {
      onToast({ t: d.error || 'Could not change that.', ok: false });
    }
    setSaving('');
  };

  /* A whole column at once, over exactly the rows on screen - so "everyone in
     Sales gets Goal Setting" is a filter and one click. */
  const column = async (key: string, action: 'grant' | 'revoke') => {
    const ids = rows.filter(u => !u.is_superadmin).map(u => u.id);
    if (!ids.length) return;
    setSaving(`col:${key}`);
    const r = await portalFetch('/admin/bulk-access/', {
      method: 'POST', body: JSON.stringify({ user_ids: ids, action, app: key }),
    });
    const d = await r.json().catch(() => ({}));
    onToast({ t: r.ok ? d.message : (d.error || 'That did not work.'), ok: r.ok });
    if (r.ok) await load();
    setSaving('');
  };

  const countFor = (key: string) => people.filter(u => has(u, key)).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search a person…"
            className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold border-2 border-slate-200 focus:border-indigo-400 rounded-lg outline-none" />
        </div>
        <select value={dept} onChange={e => setDept(e.target.value)}
          className="border-2 border-slate-200 focus:border-indigo-400 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none">
          <option value="">All departments</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {([['all', 'Everyone'], ['gaps', 'No tools yet'], ['admins', 'Administrators']] as const)
          .map(([k, label]) => (
            <button key={k} onClick={() => setOnly(k)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black border-2 transition-colors ${
                only === k ? 'bg-slate-900 text-white border-slate-900'
                           : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {label}
            </button>
          ))}
        <span className="ml-auto text-[11px] font-bold text-slate-400">
          {rows.length} of {people.length}
        </span>
      </div>

      <p className="text-[11px] text-slate-400 font-semibold">
        Click any cell to grant or revoke it there and then. Use the arrows in a column
        heading to do the whole column for the {rows.length} {rows.length === 1 ? 'person' : 'people'} shown.
      </p>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="text-xs border-separate border-spacing-0">
            <thead>
              <tr>
                {/* The name column stays put while you scroll sideways, or the
                    row you are reading stops being identifiable. */}
                <th className="sticky left-0 top-0 z-30 bg-slate-50 border-b border-r border-slate-200
                               px-3 py-2 text-left font-black text-slate-400 min-w-[220px]">
                  Person
                </th>
                {apps.map(a => (
                  <th key={a.key}
                    className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 px-2 py-2 align-bottom min-w-[92px]">
                    <p className="font-black text-slate-600 text-[11px] leading-tight mb-1">{a.label}</p>
                    <p className="text-[10px] font-bold text-slate-400 mb-1.5">
                      {countFor(a.key)} of {people.length}
                    </p>
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => column(a.key, 'grant')} disabled={!!saving}
                        title={`Give this to all ${rows.length} shown`}
                        className="px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-[10px] font-black disabled:opacity-40">
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={() => column(a.key, 'revoke')} disabled={!!saving}
                        title={`Take this from all ${rows.length} shown`}
                        className="px-1.5 py-0.5 rounded border border-rose-200 text-rose-500 hover:bg-rose-50 text-[10px] font-black disabled:opacity-40">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(u => (
                <tr key={u.id} className="group">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-r border-slate-100 px-3 py-1.5">
                    <p className="font-black text-slate-800 flex items-center gap-1.5 truncate">
                      {u.name}
                      {u.is_superadmin && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                      {!u.is_active && (
                        <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-1 py-0.5 rounded">OFF</span>
                      )}
                    </p>
                    <p className="text-slate-400 truncate">{u.department || u.email}</p>
                  </td>
                  {apps.map(a => {
                    const on = has(u, a.key);
                    const busy = saving === `${u.id}:${a.key}`;
                    return (
                      <td key={a.key} className="border-b border-slate-100 p-0 text-center">
                        <button
                          onClick={() => toggle(u, a.key)}
                          disabled={u.is_superadmin || !!saving}
                          title={u.is_superadmin
                            ? 'An administrator can open everything'
                            : `${on ? 'Take away' : 'Give'} ${a.label} ${on ? 'from' : 'to'} ${u.name}`}
                          className={`w-full h-9 flex items-center justify-center transition-colors ${
                            u.is_superadmin ? 'cursor-default'
                              : on ? 'bg-emerald-50 hover:bg-emerald-100'
                                   : 'hover:bg-slate-100'}`}>
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                            : u.is_superadmin ? <Crown className="w-3.5 h-3.5 text-amber-400" />
                              : on ? <Check className="w-4 h-4 text-emerald-600" />
                                : <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={apps.length + 1} className="px-3 py-12 text-center text-slate-300 font-semibold">
                  Nobody matches that.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-400">
        <span className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-600" /> can open it
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> cannot
        </span>
        <span className="flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 text-amber-400" /> administrator — opens everything
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-1 py-0.5 rounded">OFF</span>
          sign-in disabled, so nothing is reachable
        </span>
      </div>
    </div>
  );
}

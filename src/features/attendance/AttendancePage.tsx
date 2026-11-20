/* Attendance — read live from Pocket HRMS for any date or date range.

   A separate tool from the Data Extractor on purpose. The Extractor's two
   attendance dashboards read a file somebody exported and uploaded; this one
   asks HRMS directly, so it carries everybody's working hours for any day
   with nobody in the loop. That is why it has its own access grant.

   Three things the data genuinely cannot tell us, said on screen rather than
   papered over:
     * A blank row means "nothing recorded", NOT "absent". The feed has no
       leave or week-off column at all, and it returns a blank row for every
       employee on every date — including dates in the future.
     * An unswiped punch yields no duration. Hours are left blank rather than
       guessed, because a day that never closed reads as fifteen hours.
     * Overtime is not computed by this tenant. OTHours was '-' on all 7,180
       rows sampled, so the column is not drawn.

   Filter contract, same as the Extractor's dashboards: KPI cards with a flag
   are toggles, several at once mean ANY OF, and the counts come from the
   pre-flag set so clicking one card does not zero the others. */
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, ArrowLeft, Loader2, AlertTriangle, RefreshCw, Download,
  Users, Clock, CircleSlash, Timer, LogOut, CalendarOff, Search, Info, Table2,
  UserRound,
} from 'lucide-react';
import {
  fetchAttMeta, fetchAttRecords, hours, dur,
  type AttFlag, type AttMeta, type AttRecords, type AttRow,
} from './api';

const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare;

const iso = (d: Date) => {
  // Local date, not toISOString — that converts to UTC and in IST hands back
  // yesterday for anything before 05:30.
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const shift = (d: Date, days: number) => { const x = new Date(d); x.setDate(x.getDate() + days); return x; };
const pretty = (s: string) => (s
  ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '');

interface Card {
  key: AttFlag | 'all';
  label: string;
  hint: string;
  icon: typeof Users;
  tone: string;
}

/* Deliberately not a card: `present`. It is the denominator, not an
   exception, and a toggle for it would just hide everything else. */
const CARDS: Card[] = [
  { key: 'all',         label: 'People',       hint: 'Rows in this range',              icon: Users,       tone: 'slate' },
  { key: 'present',     label: 'Punched',      hint: 'At least one punch recorded',     icon: Clock,       tone: 'emerald' },
  { key: 'noRecord',    label: 'No record',    hint: 'Nothing at all from HRMS',        icon: CircleSlash, tone: 'slate' },
  { key: 'late',        label: 'Late (shift)', hint: "Late against their own shift",    icon: Timer,       tone: 'amber' },
  { key: 'afterCutoff', label: 'After cutoff', hint: 'In-punch after the clock cutoff', icon: Timer,       tone: 'rose' },
  { key: 'unswiped',    label: 'Unswiped',     hint: 'A punch was never made',          icon: AlertTriangle, tone: 'orange' },
  { key: 'earlyOut',    label: 'Early out',    hint: 'Left before their shift ended',   icon: LogOut,      tone: 'violet' },
  { key: 'holiday',     label: 'Holiday',      hint: 'A company holiday',               icon: CalendarOff, tone: 'sky' },
];

const TONE: Record<string, { ring: string; text: string; soft: string }> = {
  slate:   { ring: 'ring-slate-300',   text: 'text-slate-700',   soft: 'bg-slate-50' },
  emerald: { ring: 'ring-emerald-300', text: 'text-emerald-700', soft: 'bg-emerald-50' },
  amber:   { ring: 'ring-amber-300',   text: 'text-amber-700',   soft: 'bg-amber-50' },
  rose:    { ring: 'ring-rose-300',    text: 'text-rose-700',    soft: 'bg-rose-50' },
  orange:  { ring: 'ring-orange-300',  text: 'text-orange-700',  soft: 'bg-orange-50' },
  violet:  { ring: 'ring-violet-300',  text: 'text-violet-700',  soft: 'bg-violet-50' },
  sky:     { ring: 'ring-sky-300',     text: 'text-sky-700',     soft: 'bg-sky-50' },
};

type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'custom';

function rangeFor(preset: Preset, today: Date): [string, string] {
  const t = iso(today);
  if (preset === 'today') return [t, t];
  if (preset === 'yesterday') { const y = iso(shift(today, -1)); return [y, y]; }
  if (preset === 'week') {
    // Monday-first, which is how the company reads a week.
    const back = (today.getDay() + 6) % 7;
    return [iso(shift(today, -back)), t];
  }
  if (preset === 'month') {
    return [iso(new Date(today.getFullYear(), today.getMonth(), 1)), t];
  }
  // lastMonth
  const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const last = new Date(today.getFullYear(), today.getMonth(), 0);
  return [iso(first), iso(last)];
}

interface Props { onBack?: () => void }

export function AttendancePage({ onBack }: Props) {
  const [meta, setMeta] = useState<AttMeta | null>(null);
  const [metaError, setMetaError] = useState('');

  const today = useMemo(() => new Date(), []);
  const [preset, setPreset] = useState<Preset>('today');
  const [from, setFrom] = useState(iso(today));
  const [to, setTo] = useState(iso(today));

  const [data, setData] = useState<AttRecords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [department, setDepartment] = useState('');
  const [grade, setGrade] = useState('');
  const [flags, setFlags] = useState<Set<AttFlag>>(new Set());
  const [view, setView] = useState<'rows' | 'people'>('rows');

  useEffect(() => {
    fetchAttMeta().then(setMeta).catch(e => setMetaError(e.message));
  }, []);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === 'custom') return;
    const [a, b] = rangeFor(p, today);
    setFrom(a); setTo(b);
  };

  const load = async (refresh = false) => {
    setLoading(true); setError('');
    try {
      setData(await fetchAttRecords(from, to, { refresh }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fetch attendance.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = (f: AttFlag | 'all') => {
    if (f === 'all') { setFlags(new Set()); return; }
    setFlags(prev => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  };

  const rows = data?.rows ?? [];

  /* Only the facets the fetched rows actually carry get offered. A dropdown
     whose every option answers "nobody" is worse than no dropdown. */
  const grades = useMemo(
    () => Array.from(new Set(rows.map(r => r.grade).filter(Boolean))).sort(byName), [rows]);
  const locations = useMemo(
    () => Array.from(new Set(rows.map(r => r.location).filter(Boolean))).sort(byName), [rows]);
  const departments = useMemo(
    () => Array.from(new Set(rows.map(r => r.department).filter(Boolean))).sort(byName), [rows]);

  /* scoped = everything except the flag toggles. The cards count THIS, so
     clicking one card never zeroes the rest. */
  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r =>
      (!q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
      && (!location || r.location === location)
      && (!department || r.department === department)
      && (!grade || r.grade === grade));
  }, [rows, search, location, department, grade]);

  /* shown = scoped after the flags. Several flags mean ANY OF: the status
     markers are near enough mutually exclusive that an all-of rule answers
     nothing for the pairs most worth seeing together. */
  const shown = useMemo(() => {
    if (!flags.size) return scoped;
    return scoped.filter(r => r.flags.some(f => flags.has(f)));
  }, [scoped, flags]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: scoped.length };
    for (const r of scoped) for (const f of r.flags) c[f] = (c[f] || 0) + 1;
    return c;
  }, [scoped]);

  const worked = useMemo(() => {
    const v = scoped.map(r => r.workedMins).filter((m): m is number => m != null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  }, [scoped]);

  /* One row per person for a range — a month of day rows is 20,000 lines
     nobody reads, while "who was late nine times" is the actual question. */
  const people = useMemo(() => {
    const map = new Map<string, {
      code: string; name: string; designation: string; grade: string;
      department: string; location: string;
      days: number; punched: number; late: number; afterCutoff: number;
      unswiped: number; noRecord: number; earlyOut: number; totalMins: number; withHours: number;
    }>();
    for (const r of shown) {
      let p = map.get(r.code);
      if (!p) {
        p = { code: r.code, name: r.name, designation: r.designation, grade: r.grade,
              department: r.department, location: r.location,
              days: 0, punched: 0, late: 0, afterCutoff: 0, unswiped: 0,
              noRecord: 0, earlyOut: 0, totalMins: 0, withHours: 0 };
        map.set(r.code, p);
      }
      p.days += 1;
      if (r.flags.includes('present')) p.punched += 1;
      if (r.flags.includes('late')) p.late += 1;
      if (r.flags.includes('afterCutoff')) p.afterCutoff += 1;
      if (r.flags.includes('unswiped')) p.unswiped += 1;
      if (r.flags.includes('noRecord')) p.noRecord += 1;
      if (r.flags.includes('earlyOut')) p.earlyOut += 1;
      if (r.workedMins != null) { p.totalMins += r.workedMins; p.withHours += 1; }
    }
    return Array.from(map.values()).sort((a, b) => byName(a.name, b.name));
  }, [shown]);

  const download = () => {
    const head = ['Code', 'Name', 'Designation', 'Grade', 'Department', 'Location',
      'Date', 'In', 'Out', 'Worked', 'Normal', 'Late by', 'Early by', 'Flags'];
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = shown.map(r => [
      r.code, r.name, r.designation, r.grade, r.department, r.location, r.date,
      r.inUnswiped ? 'Unswiped' : r.inTime,
      r.outUnswiped ? 'Unswiped' : r.outTime,
      hours(r.workedMins), hours(r.normalMins), dur(r.lateMins), dur(r.earlyMins),
      r.flags.join(' '),
    ].map(esc).join(','));
    const blob = new Blob([[head.map(esc).join(','), ...body].join('\n')],
      { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const multiDay = (data?.days ?? 1) > 1;

  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto">

      {onBack && (
        <button onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-500
                     hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />Back to Dashboard
        </button>
      )}

      {/* ── Pick a date, then fetch ──────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-white/20 grid place-items-center">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black tracking-tight">Attendance</h2>
            <p className="text-[12px] text-indigo-100/90 mt-0.5">
              Read live from Pocket HRMS — nothing to upload.
              {meta ? ` ${meta.directorySize} people on the directory.` : ''}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {([['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This week'],
                 ['month', 'This month'], ['lastMonth', 'Last month'], ['custom', 'Custom']] as const)
                .map(([k, label]) => (
                  <button key={k} onClick={() => applyPreset(k)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors
                      ${preset === k ? 'bg-white text-indigo-700' : 'bg-white/15 hover:bg-white/25'}`}>
                    {label}
                  </button>
                ))}
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-[11px] font-bold text-indigo-100">
                From
                <input type="date" value={from} max={to}
                  onChange={e => { setFrom(e.target.value); setPreset('custom'); }}
                  className="mt-0.5 block rounded-lg px-2 py-1.5 text-[12px] text-slate-800 font-semibold" />
              </label>
              <label className="text-[11px] font-bold text-indigo-100">
                To
                <input type="date" value={to} min={from}
                  onChange={e => { setTo(e.target.value); setPreset('custom'); }}
                  className="mt-0.5 block rounded-lg px-2 py-1.5 text-[12px] text-slate-800 font-semibold" />
              </label>
              <button onClick={() => void load(false)} disabled={loading || !meta?.ready}
                className="px-4 py-2 rounded-lg bg-white text-indigo-700 text-[12px] font-black
                           hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed
                           inline-flex items-center gap-1.5">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Fetch
              </button>
              {data && (
                <button onClick={() => void load(true)} disabled={loading} title="Ignore the ten-minute cache"
                  className="px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-[12px] font-bold
                             inline-flex items-center gap-1.5 disabled:opacity-50">
                  <RefreshCw className="w-3.5 h-3.5" />Refresh
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {metaError && (
        <Banner tone="rose" icon={AlertTriangle}>{metaError}</Banner>
      )}
      {meta && !meta.ready && (
        <Banner tone="amber" icon={Info}>{meta.reason}</Banner>
      )}
      {error && <Banner tone="rose" icon={AlertTriangle}>{error}</Banner>}

      {data && (
        <>
          <p className="mt-4 text-[12px] text-slate-500">
            {pretty(data.from)}{multiDay ? ` → ${pretty(data.to)} · ${data.days} days` : ''}
            {' · '}{data.count.toLocaleString('en-IN')} rows
            {' · '}fetched {new Date(data.fetchedAt).toLocaleTimeString('en-IN',
              { hour: '2-digit', minute: '2-digit' })}
            {' · '}cutoff {data.lateCutoff}
          </p>

          {data.truncated && (
            <Banner tone="amber" icon={AlertTriangle}>
              That range is larger than this screen will draw. Showing the first {data.count.toLocaleString('en-IN')} rows —
              narrow the dates, or filter, to see the rest.
            </Banner>
          )}

          {/* ── Cards, which are also the filters ───────────────────────── */}
          <div className="mt-4 grid gap-2.5 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
            {CARDS.map(card => {
              const Icon = card.icon;
              const on = card.key === 'all' ? flags.size === 0 : flags.has(card.key as AttFlag);
              const n = counts[card.key] || 0;
              const tone = TONE[card.tone];
              return (
                <button key={card.key} onClick={() => toggleFlag(card.key)} title={card.hint}
                  className={`text-left rounded-xl border p-3 transition-all
                    ${on ? `${tone.soft} border-transparent ring-2 ${tone.ring}`
                         : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <Icon className={`w-4 h-4 ${tone.text}`} />
                  <div className={`mt-1.5 text-xl font-black tabular-nums ${tone.text}`}>
                    {n.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 leading-tight">{card.label}</div>
                </button>
              );
            })}
          </div>

          {/* The two "late" numbers disagree by design and people will ask
              why, so the answer sits next to them rather than in a tooltip. */}
          {(counts.late || counts.afterCutoff) ? (
            <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              <b>Late (shift)</b> is HRMS measuring each person against their own shift.
              <b className="ml-1">After cutoff</b> is an in-punch later than {data.lateCutoff} on the clock.
              They count different things, so they rarely match.
            </p>
          ) : null}

          {/* ── The other filters ───────────────────────────────────────── */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name or code"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-[12px] w-48
                           focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <Picker value={location} onChange={setLocation} options={locations} label="All locations" />
            <Picker value={department} onChange={setDepartment} options={departments} label="All departments" />
            <Picker value={grade} onChange={setGrade} options={grades} label="All grades" />

            <div className="ml-auto flex items-center gap-2">
              {worked != null && (
                <span className="text-[11px] text-slate-500">
                  Average day <b className="text-slate-700">{hours(worked)}</b>
                </span>
              )}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {([['rows', 'Day rows', Table2], ['people', 'By person', UserRound]] as const).map(
                  ([k, label, Icon]) => (
                    <button key={k} onClick={() => setView(k)}
                      className={`px-2.5 py-1.5 text-[11px] font-bold inline-flex items-center gap-1
                        ${view === k ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                      <Icon className="w-3 h-3" />{label}
                    </button>
                  ))}
              </div>
              <button onClick={download} disabled={!shown.length}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold
                           text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1 disabled:opacity-50">
                <Download className="w-3 h-3" />CSV
              </button>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-slate-400">
            Showing {shown.length.toLocaleString('en-IN')} of {scoped.length.toLocaleString('en-IN')}
            {flags.size > 1 ? ' · several filters mean any of them' : ''}
          </p>

          {/* ── The table. overflow-y-hidden on purpose: overflow-x-auto
                 alone computes overflow-y to auto and paints a second
                 vertical scrollbar beside the shell's own. ─────────────── */}
          <div className="mt-2 rounded-xl border border-slate-200 bg-white overflow-x-auto overflow-y-hidden">
            {view === 'rows' ? <RowTable rows={shown} multiDay={multiDay} /> : <PeopleTable people={people} />}
          </div>

          {!shown.length && (
            <p className="mt-6 text-center text-[13px] text-slate-400">
              Nothing matches those filters.
            </p>
          )}

          <p className="mt-6 text-[11px] text-slate-400 leading-relaxed">
            <b>No record</b> means HRMS returned nothing for that person that day — it is not the
            same as absent. The feed carries no leave or week-off column, so a day off, a leave and a
            missed punch all arrive looking identical. <b>Unswiped</b> days show no hours because the
            day never closed; a duration taken from one would read as a fifteen-hour shift.
            {data.overtimeTracked ? '' : ' Overtime is not computed by this HRMS tenant, so there is no overtime column.'}
          </p>
        </>
      )}

      {!data && !loading && meta?.ready && !error && (
        <p className="mt-10 text-center text-[13px] text-slate-400">
          Pick a date and press Fetch.
        </p>
      )}
    </div>
  );
}

function Banner({ tone, icon: Icon, children }: {
  tone: 'rose' | 'amber'; icon: typeof Info; children: React.ReactNode;
}) {
  const c = tone === 'rose'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : 'border-amber-200 bg-amber-50 text-amber-800';
  return (
    <div className={`mt-4 rounded-xl border p-3.5 flex gap-2.5 ${c}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="text-[13px] font-semibold">{children}</p>
    </div>
  );
}

function Picker({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void; options: string[]; label: string;
}) {
  if (!options.length) return null;   // never offer a dropdown with nothing in it
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] bg-white
                 focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-[180px]">
      <option value="">{label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

const TH = 'px-3 py-2 text-left text-[10px] font-black uppercase tracking-wide text-slate-500 whitespace-nowrap';
const TD = 'px-3 py-2 text-[12px] text-slate-700 whitespace-nowrap';

function Chip({ flag }: { flag: AttFlag }) {
  const look: Partial<Record<AttFlag, string>> = {
    late:            'bg-amber-100 text-amber-800',
    afterCutoff:     'bg-rose-100 text-rose-800',
    unswiped:        'bg-orange-100 text-orange-800',
    earlyOut:        'bg-violet-100 text-violet-800',
    noRecord:        'bg-slate-100 text-slate-600',
    holiday:         'bg-sky-100 text-sky-800',
    optionalHoliday: 'bg-sky-50 text-sky-700',
    sunday:          'bg-slate-100 text-slate-500',
  };
  const text: Partial<Record<AttFlag, string>> = {
    late: 'Late', afterCutoff: 'After cutoff', unswiped: 'Unswiped', earlyOut: 'Early out',
    noRecord: 'No record', holiday: 'Holiday', optionalHoliday: 'Optional holiday', sunday: 'Sunday',
  };
  if (flag === 'present' || !look[flag]) return null;
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${look[flag]}`}>
      {text[flag]}
    </span>
  );
}

function RowTable({ rows, multiDay }: { rows: AttRow[]; multiDay: boolean }) {
  return (
    <table className="w-full border-collapse">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          <th className={TH}>Employee</th>
          {multiDay && <th className={TH}>Date</th>}
          <th className={TH}>Designation</th>
          <th className={TH}>Grade</th>
          <th className={TH}>Department</th>
          <th className={TH}>In</th>
          <th className={TH}>Out</th>
          <th className={TH}>Worked</th>
          <th className={TH}>Normal</th>
          <th className={TH}>Late by</th>
          <th className={TH}>Early by</th>
          <th className={TH}>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.slice(0, 2000).map((r, i) => (
          <tr key={`${r.code}-${r.date}-${i}`}
            className={`border-b border-slate-100 ${r.noRecord ? 'bg-slate-50/60' : 'hover:bg-indigo-50/40'}`}>
            <td className={TD}>
              <div className="font-bold text-slate-800">{r.name || '—'}</div>
              <div className="text-[10px] text-slate-400">
                {r.code}{r.offDirectory ? ' · not on directory' : ''}
              </div>
            </td>
            {multiDay && <td className={TD}>{pretty(r.date)}</td>}
            <td className={TD}>{r.designation || '—'}</td>
            <td className={TD}>{r.grade || '—'}</td>
            <td className={TD}>{r.department || '—'}</td>
            <td className={`${TD} tabular-nums`}>
              {r.inUnswiped ? <i className="text-orange-600 not-italic font-bold">Unswiped</i> : (r.inTime || '—')}
            </td>
            <td className={`${TD} tabular-nums`}>
              {r.outUnswiped ? <i className="text-orange-600 not-italic font-bold">Unswiped</i> : (r.outTime || '—')}
            </td>
            <td className={`${TD} tabular-nums font-semibold`}>{hours(r.workedMins)}</td>
            <td className={`${TD} tabular-nums`}>{hours(r.normalMins)}</td>
            <td className={`${TD} tabular-nums`}>{dur(r.lateMins)}</td>
            <td className={`${TD} tabular-nums`}>{dur(r.earlyMins)}</td>
            <td className={TD}>
              <span className="flex flex-wrap gap-1">
                {r.flags.map(f => <Chip key={f} flag={f} />)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PeopleTable({ people }: { people: { code: string; name: string; designation: string;
  grade: string; department: string; location: string; days: number; punched: number;
  late: number; afterCutoff: number; unswiped: number; noRecord: number; earlyOut: number;
  totalMins: number; withHours: number }[] }) {
  return (
    <table className="w-full border-collapse">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          <th className={TH}>Employee</th>
          <th className={TH}>Department</th>
          <th className={TH}>Days</th>
          <th className={TH}>Punched</th>
          <th className={TH}>No record</th>
          <th className={TH}>Late (shift)</th>
          <th className={TH}>After cutoff</th>
          <th className={TH}>Unswiped</th>
          <th className={TH}>Early out</th>
          <th className={TH}>Avg day</th>
        </tr>
      </thead>
      <tbody>
        {people.slice(0, 2000).map(p => (
          <tr key={p.code} className="border-b border-slate-100 hover:bg-indigo-50/40">
            <td className={TD}>
              <div className="font-bold text-slate-800">{p.name || '—'}</div>
              <div className="text-[10px] text-slate-400">{p.code} · {p.grade || '—'}</div>
            </td>
            <td className={TD}>{p.department || '—'}</td>
            <td className={`${TD} tabular-nums`}>{p.days}</td>
            <td className={`${TD} tabular-nums font-semibold text-emerald-700`}>{p.punched}</td>
            <td className={`${TD} tabular-nums`}>{p.noRecord || '—'}</td>
            <td className={`${TD} tabular-nums ${p.late ? 'text-amber-700 font-semibold' : ''}`}>{p.late || '—'}</td>
            <td className={`${TD} tabular-nums ${p.afterCutoff ? 'text-rose-700 font-semibold' : ''}`}>{p.afterCutoff || '—'}</td>
            <td className={`${TD} tabular-nums ${p.unswiped ? 'text-orange-700 font-semibold' : ''}`}>{p.unswiped || '—'}</td>
            <td className={`${TD} tabular-nums`}>{p.earlyOut || '—'}</td>
            {/* Averaged over the days that HAVE a duration, not over every
                day — dividing by days nobody closed drags it toward zero. */}
            <td className={`${TD} tabular-nums font-semibold`}>
              {p.withHours ? hours(Math.round(p.totalMins / p.withHours)) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

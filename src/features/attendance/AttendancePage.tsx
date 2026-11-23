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
   pre-flag set so clicking one card does not zero the others.

   LAYOUT NOTE. The first build of this screen had twelve columns and the
   Status chips fell off the right-hand edge, which is the one column that
   explains the row. Related fields are now paired into single cells (grade
   with designation, the two punches as one span, late/early as one variance)
   so the table fits a laptop without scrolling sideways, and the chips sit
   under the name where they are read with it. */
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, ArrowLeft, Loader2, AlertTriangle, RefreshCw, Download,
  Users, Clock, CircleSlash, Timer, LogOut, CalendarOff, Search, Info, Table2,
  UserRound, ArrowUpDown, ArrowRight, EyeOff, Eye, LayoutDashboard, FileBarChart,
} from 'lucide-react';
import {
  fetchAttMeta, fetchAttRecords, hours, dur,
  type AttFlag, type AttMeta, type AttRecords, type AttRow,
} from './api';
import {
  arrivalHistogram, asClock, clockMins, dailySeries, group, summarise,
} from './analytics';
import { ArrivalChart, DeptChart, TrendChart } from './AttendanceCharts';
import { AttendanceReports } from './AttendanceReports';

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
const weekday = (s: string) => (s
  ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' }) : '');

interface Card {
  key: AttFlag | 'all';
  label: string;
  hint: string;
  icon: typeof Users;
  tone: Tone;
}
type Tone = 'slate' | 'emerald' | 'amber' | 'rose' | 'orange' | 'violet' | 'sky';

const CARDS: Card[] = [
  { key: 'all',         label: 'People',       hint: 'Everyone in this range',          icon: Users,         tone: 'slate' },
  { key: 'present',     label: 'Punched',      hint: 'At least one punch recorded',     icon: Clock,         tone: 'emerald' },
  { key: 'absent',      label: 'Absent',       hint: 'A working day with nothing recorded. May be approved leave — the feed cannot tell them apart.',
                                                                                        icon: CircleSlash,   tone: 'rose' },
  { key: 'late',        label: 'Late (shift)', hint: 'Late against their own shift',    icon: Timer,         tone: 'amber' },
  { key: 'afterCutoff', label: 'After cutoff', hint: 'In-punch after the clock cutoff', icon: Timer,         tone: 'rose' },
  { key: 'unswiped',    label: 'Unswiped',     hint: 'A punch was never made',          icon: AlertTriangle, tone: 'orange' },
  { key: 'earlyOut',    label: 'Early out',    hint: 'Left before their shift ended',   icon: LogOut,        tone: 'violet' },
  { key: 'holiday',     label: 'Holiday',      hint: "A company holiday at that person's location", icon: CalendarOff, tone: 'sky' },
  { key: 'weekOff',     label: 'Week off',     hint: 'Sunday',                          icon: CalendarOff,   tone: 'slate' },
];

/* Whole classes, never built by interpolation — Tailwind's scan is static and
   a class assembled at runtime is simply never emitted. */
const TONE: Record<Tone, { bar: string; text: string; soft: string; ring: string; dot: string }> = {
  slate:   { bar: 'bg-slate-400',   text: 'text-slate-700',   soft: 'bg-slate-50',   ring: 'ring-slate-400/40',   dot: 'bg-slate-400' },
  emerald: { bar: 'bg-emerald-500', text: 'text-emerald-700', soft: 'bg-emerald-50', ring: 'ring-emerald-500/40', dot: 'bg-emerald-500' },
  amber:   { bar: 'bg-amber-500',   text: 'text-amber-700',   soft: 'bg-amber-50',   ring: 'ring-amber-500/40',   dot: 'bg-amber-500' },
  rose:    { bar: 'bg-rose-500',    text: 'text-rose-700',    soft: 'bg-rose-50',    ring: 'ring-rose-500/40',    dot: 'bg-rose-500' },
  orange:  { bar: 'bg-orange-500',  text: 'text-orange-700',  soft: 'bg-orange-50',  ring: 'ring-orange-500/40',  dot: 'bg-orange-500' },
  violet:  { bar: 'bg-violet-500',  text: 'text-violet-700',  soft: 'bg-violet-50',  ring: 'ring-violet-500/40',  dot: 'bg-violet-500' },
  sky:     { bar: 'bg-sky-500',     text: 'text-sky-700',     soft: 'bg-sky-50',     ring: 'ring-sky-500/40',     dot: 'bg-sky-500' },
};

type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'custom';

function rangeFor(preset: Preset, today: Date): [string, string] {
  const t = iso(today);
  if (preset === 'today') return [t, t];
  if (preset === 'yesterday') { const y = iso(shift(today, -1)); return [y, y]; }
  if (preset === 'week') {
    const back = (today.getDay() + 6) % 7;   // Monday-first
    return [iso(shift(today, -back)), t];
  }
  if (preset === 'month') return [iso(new Date(today.getFullYear(), today.getMonth(), 1)), t];
  const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const last = new Date(today.getFullYear(), today.getMonth(), 0);
  return [iso(first), iso(last)];
}

type SortKey = 'name' | 'in' | 'out' | 'worked' | 'late' | 'date';
type Tab = 'overview' | 'rows' | 'people' | 'reports';
const TABS: { key: Tab; label: string; icon: typeof Table2 }[] = [
  { key: 'overview', label: 'Overview',  icon: LayoutDashboard },
  { key: 'rows',     label: 'Day rows',  icon: Table2 },
  { key: 'people',   label: 'By person', icon: UserRound },
  { key: 'reports',  label: 'Reports',   icon: FileBarChart },
];
const PAGE = 150;

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
  const [tab, setTab] = useState<Tab>('overview');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'name', desc: false });
  /* Rows the feed holds nothing for. These used to be collapsed by default
     under the name "no record", which hid every ABSENCE on the screen whose
     job is to show them. They are now shown, and the server has worked out
     what each blank actually means — absent, week off, holiday or not yet.
     The toggle survives for the days somebody wants only real punches; the
     COUNTS have never been affected by it either way. */
  const [hideBlank, setHideBlank] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  /* Opens on Delhi HO, because that is the question this tool was built to
     answer. Matched on the employee CODE, not the directory's location:
     83 people carry an HO code and only 40 are filed under 'DELHI-HO', while
     location 'DELHI' is mostly field sales. Switching to Everyone is one
     click, and the card counts follow the scope because it is applied
     before the flags. */
  const [hoOnly, setHoOnly] = useState(true);

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
      setLimit(PAGE);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fetch attendance.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = (f: AttFlag | 'all') => {
    setLimit(PAGE);
    if (f === 'all') { setFlags(new Set()); return; }
    setFlags(prev => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  };

  const rows = data?.rows ?? [];

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
    // Several prefixes: NA0001-NA0007 are in the feed, have never been in
    // the directory, and were being dropped from this view altogether.
    const ho = data?.homeOffice;
    const prefixes = (ho?.codePrefixes?.length ? ho.codePrefixes : [ho?.codePrefix || 'HO'])
      .map(p => p.toUpperCase());
    return rows.filter(r =>
      (!hoOnly || prefixes.some(p => r.code.toUpperCase().startsWith(p)))
      && (!q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
      && (!location || r.location === location)
      && (!department || r.department === department)
      && (!grade || r.grade === grade));
  }, [rows, hoOnly, data, search, location, department, grade]);

  /* analysed = scoped after the flag toggles. Several flags mean ANY OF: the
     status markers are near enough mutually exclusive that an all-of rule
     answers nothing for the pairs most worth seeing together.

     **Every statistic on this screen is computed from `analysed`, never from
     `shown`.** `hideBlank` below is a reading convenience for one table; it
     is not a filter on the data. Letting it reach the figures made "Turned
     up" read 100% and every no-record count read zero, because the rows it
     hides are exactly the ones those figures are about. */
  const analysed = useMemo(
    () => (flags.size ? scoped.filter(r => r.flags.some(f => flags.has(f))) : scoped),
    [scoped, flags]);

  /* shown = analysed with the blank rows collapsed and the sort applied.
     The table, and only the table, reads this. */
  const shown = useMemo(() => {
    let out = analysed;
    // Never hide what was explicitly asked for.
    if (hideBlank && !flags.has('noRecord')) out = out.filter(r => !r.noRecord);
    const dir = sort.desc ? -1 : 1;
    const num = (v: number | null) => (v == null ? Number.POSITIVE_INFINITY : v);
    const txt = (v: string) => v || '~~~';   // blanks sort last either way
    return [...out].sort((a, b) => {
      switch (sort.key) {
        case 'in':     return dir * (txt(a.inTime).localeCompare(txt(b.inTime)) || byName(a.name, b.name));
        case 'out':    return dir * (txt(a.outTime).localeCompare(txt(b.outTime)) || byName(a.name, b.name));
        case 'worked': return dir * (num(a.workedMins) - num(b.workedMins) || byName(a.name, b.name));
        case 'late':   return dir * (num(a.lateMins) - num(b.lateMins) || byName(a.name, b.name));
        case 'date':   return dir * (a.date.localeCompare(b.date) || byName(a.name, b.name));
        default:       return dir * byName(a.name, b.name);
      }
    });
  }, [analysed, flags, hideBlank, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: scoped.length };
    for (const r of scoped) for (const f of r.flags) c[f] = (c[f] || 0) + 1;
    return c;
  }, [scoped]);

  /* The overview's inputs, derived from `shown` so a chart can never
     disagree with the table beside it. All memoised on `shown` because a
     month is ~22,000 rows and these walk them several times. */
  const cutoffMins = useMemo(
    () => clockMins(data?.lateCutoff || '11:00') ?? 11 * 60, [data]);
  const histogram = useMemo(
    () => arrivalHistogram(analysed, cutoffMins), [analysed, cutoffMins]);
  const trend = useMemo(() => dailySeries(analysed), [analysed]);
  const deptStats = useMemo(() => group(analysed, 'department', 3), [analysed]);

  const worked = useMemo(() => {
    const v = analysed.map(r => r.workedMins).filter((m): m is number => m != null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  }, [analysed]);

  /* One row per person for a range — a month of day rows is 20,000 lines
     nobody reads, while "who was late nine times" is the actual question. */
  const people = useMemo(() => {
    const map = new Map<string, Person>();
    // `analysed`, not `shown`: this table has a No record column, and the
    // blank rows it collapses in the Day-rows view are its whole subject.
    for (const r of analysed) {
      let p = map.get(r.code);
      if (!p) {
        p = { code: r.code, name: r.name, designation: r.designation, grade: r.grade,
              department: r.department, location: r.location,
              days: 0, punched: 0, late: 0, afterCutoff: 0, unswiped: 0,
              noRecord: 0, absent: 0, earlyOut: 0, totalMins: 0, withHours: 0 };
        map.set(r.code, p);
      }
      p.days += 1;
      if (r.flags.includes('present')) p.punched += 1;
      if (r.flags.includes('late')) p.late += 1;
      if (r.flags.includes('afterCutoff')) p.afterCutoff += 1;
      if (r.flags.includes('unswiped')) p.unswiped += 1;
      if (r.flags.includes('noRecord')) p.noRecord += 1;
      if (r.flags.includes('absent')) p.absent += 1;
      if (r.flags.includes('earlyOut')) p.earlyOut += 1;
      if (r.workedMins != null) { p.totalMins += r.workedMins; p.withHours += 1; }
    }
    return Array.from(map.values()).sort((a, b) => byName(a.name, b.name));
  }, [analysed]);

  const download = () => {
    const head = ['Code', 'Name', 'Designation', 'Grade', 'Department', 'Location',
      'Date', 'In', 'Out', 'Worked', 'Normal', 'Late by', 'Early by', 'Flags'];
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = analysed.map(r => [
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
  const blankHidden = hideBlank && !flags.has('noRecord')
    ? analysed.filter(r => r.noRecord).length
    : 0;

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">

      {onBack && (
        <button onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-500
                     hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />Back to Dashboard
        </button>
      )}

      {/* ── Command bar ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white shadow-xl
                      ring-1 ring-white/10">
        {/* Two soft lights rather than a flat fill, so the panel has depth
            without a gradient banner shouting across the whole width. */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full
                                    bg-indigo-500/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 right-0 w-96 h-96 rounded-full
                                    bg-violet-600/20 blur-3xl" />

        <div className="relative p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-white/10 ring-1 ring-white/20
                              grid place-items-center">
                <CalendarDays className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight">Attendance</h2>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider
                                   bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30">
                    Live
                  </span>
                </div>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  Straight from Pocket HRMS — nothing to upload.
                  {meta ? ` ${meta.directorySize} people on the directory.` : ''}
                </p>
              </div>
            </div>

            {/* The day being looked at, as the biggest thing on the panel —
                it is the question every other number on the page answers. */}
            {data && (
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums leading-none">
                  {multiDay ? `${data.days} days` : pretty(data.from)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {multiDay
                    ? `${pretty(data.from)} → ${pretty(data.to)}`
                    : weekday(data.from)}
                  {' · '}{data.count.toLocaleString('en-IN')} rows
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-3">
            <div className="flex flex-wrap gap-1.5">
              {([['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This week'],
                 ['month', 'This month'], ['lastMonth', 'Last month'], ['custom', 'Custom']] as const)
                .map(([k, label]) => (
                  <button key={k} onClick={() => applyPreset(k)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors
                      ${preset === k
                        ? 'bg-white text-slate-900'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20 ring-1 ring-white/10'}`}>
                    {label}
                  </button>
                ))}
            </div>

            <div className="h-7 w-px bg-white/15 hidden sm:block" />

            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              From
              <input type="date" value={from} max={to}
                onChange={e => { setFrom(e.target.value); setPreset('custom'); }}
                className="mt-1 block rounded-lg px-2.5 py-1.5 text-[12px] text-white font-semibold
                           bg-white/10 ring-1 ring-white/15 [color-scheme:dark]
                           focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </label>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              To
              <input type="date" value={to} min={from}
                onChange={e => { setTo(e.target.value); setPreset('custom'); }}
                className="mt-1 block rounded-lg px-2.5 py-1.5 text-[12px] text-white font-semibold
                           bg-white/10 ring-1 ring-white/15 [color-scheme:dark]
                           focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </label>

            <button onClick={() => void load(false)} disabled={loading || !meta?.ready}
              className="px-5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-[12px]
                         font-black inline-flex items-center gap-1.5 shadow-lg shadow-indigo-500/25
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Fetch
            </button>
            {data && (
              <button onClick={() => void load(true)} disabled={loading}
                title="Ignore the ten-minute cache and ask HRMS again"
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 ring-1 ring-white/15
                           text-[12px] font-bold inline-flex items-center gap-1.5 disabled:opacity-40">
                <RefreshCw className="w-3.5 h-3.5" />Refresh
              </button>
            )}
            {data && (
              <span className="text-[11px] text-slate-500 ml-auto self-center">
                fetched {new Date(data.fetchedAt).toLocaleTimeString('en-IN',
                  { hour: '2-digit', minute: '2-digit' })} · cutoff {data.lateCutoff}
              </span>
            )}
          </div>
        </div>
      </div>

      {metaError && <Banner tone="rose" icon={AlertTriangle}>{metaError}</Banner>}
      {meta && !meta.ready && <Banner tone="amber" icon={Info}>{meta.reason}</Banner>}
      {error && <Banner tone="rose" icon={AlertTriangle}>{error}</Banner>}

      {data && (
        <>
          {data.truncated && (
            <Banner tone="amber" icon={AlertTriangle}>
              That range is larger than this screen will draw. Showing the first
              {' '}{data.count.toLocaleString('en-IN')} rows — narrow the dates, or filter, to see the rest.
            </Banner>
          )}

          {/* ── Cards, which are also the filters ───────────────────────── */}
          <div className="mt-5 grid gap-2.5 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
            {CARDS.map(card => {
              const Icon = card.icon;
              const on = card.key === 'all' ? flags.size === 0 : flags.has(card.key as AttFlag);
              const n = counts[card.key] || 0;
              const tone = TONE[card.tone];
              const share = counts.all ? Math.round((n / counts.all) * 100) : 0;
              return (
                <button key={card.key} onClick={() => toggleFlag(card.key)} title={card.hint}
                  className={`group relative text-left rounded-xl border bg-white p-3 pt-3.5 overflow-hidden
                    transition-all duration-150
                    ${on ? `${tone.soft} border-transparent ring-2 ${tone.ring} shadow-sm`
                         : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                  {/* The accent is a rule along the top edge, not a coloured
                      card: eight filled tiles side by side read as noise. */}
                  <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] ${tone.bar}
                    ${on ? 'opacity-100' : 'opacity-25 group-hover:opacity-60'} transition-opacity`} />
                  <div className="flex items-center justify-between">
                    <Icon className={`w-3.5 h-3.5 ${tone.text}`} />
                    {card.key !== 'all' && n > 0 && (
                      <span className="text-[9px] font-black text-slate-400 tabular-nums">{share}%</span>
                    )}
                  </div>
                  <div className={`mt-1.5 text-2xl font-black tabular-nums leading-none ${tone.text}`}>
                    {n.toLocaleString('en-IN')}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-600 leading-tight">{card.label}</div>
                </button>
              );
            })}
          </div>

          {/* The two "late" numbers disagree by design and it is the first
              thing anyone asks, so the answer sits beside them. */}
          {(counts.late || counts.afterCutoff) ? (
            <div className="mt-2.5 flex items-start gap-2 text-[11px] text-slate-500
                            rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px text-slate-400" />
              <p className="leading-relaxed">
                <b className="text-amber-700">Late (shift)</b> is HRMS measuring each person against their own
                shift. <b className="text-rose-700">After cutoff</b> is an in-punch later than {data.lateCutoff}
                {' '}on the clock. They count different things, so they rarely match.
              </p>
            </div>
          ) : null}

          {/* ── Filters ─────────────────────────────────────────────────── */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Scope first, because it changes every number above it. */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {([[true, data.homeOffice?.label || 'Delhi HO'], [false, 'Everyone']] as const).map(
                ([v, label]) => (
                  <button key={String(v)} onClick={() => { setHoOnly(v); setLimit(PAGE); }}
                    className={`px-3 py-1.5 text-[11px] font-bold transition-colors
                      ${hoOnly === v ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                    {label}
                  </button>
                ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => { setSearch(e.target.value); setLimit(PAGE); }}
                placeholder="Name or code"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-[12px] w-44
                           focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <Picker value={location} onChange={v => { setLocation(v); setLimit(PAGE); }}
              options={locations} label="All locations" />
            <Picker value={department} onChange={v => { setDepartment(v); setLimit(PAGE); }}
              options={departments} label="All departments" />
            <Picker value={grade} onChange={v => { setGrade(v); setLimit(PAGE); }}
              options={grades} label="All grades" />

            <button onClick={() => setHideBlank(h => !h)}
              title="Absences, week offs and holidays. The counts above always include them."
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1.5
                ${hideBlank ? 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            : 'border-indigo-300 bg-indigo-50 text-indigo-700'}`}>
              {hideBlank ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {hideBlank ? 'Days with no punch hidden' : 'Showing days with no punch'}
            </button>

            <div className="ml-auto flex items-center gap-2">
              {worked != null && (
                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                  Average day <b className="text-slate-800 tabular-nums">{hours(worked)}</b>
                </span>
              )}
              <button onClick={download} disabled={!analysed.length}
                title="Every filtered row, including the no-record ones the table collapses"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold
                           text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1 disabled:opacity-50">
                <Download className="w-3 h-3" />CSV
              </button>
            </div>
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div className="mt-4 flex items-center gap-1 border-b border-slate-200">
            {TABS.map(t => {
              const Icon = t.icon;
              const on = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`relative px-3.5 py-2 text-[12px] font-bold inline-flex items-center gap-1.5
                              transition-colors ${on ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Icon className="w-3.5 h-3.5" />{t.label}
                  {on && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-slate-900" />}
                </button>
              );
            })}
          </div>

          {tab === 'overview' && (
            <div className="mt-4 space-y-4">
              <HeadlineBand rows={analysed} days={data.days} cutoffLabel={data.lateCutoff} />
              <ArrivalChart data={histogram} cutoffMins={cutoffMins} cutoffLabel={data.lateCutoff} />
              {multiDay && <TrendChart data={trend} />}
              <div className="grid gap-4 xl:grid-cols-2">
                <DeptChart data={deptStats} metric="lateRate" />
                <DeptChart data={deptStats} metric="avgWorked" />
              </div>
            </div>
          )}

          {tab === 'reports' && (
            <div className="mt-4">
              <AttendanceReports rows={analysed} days={data.days}
                cutoffLabel={data.lateCutoff}
                scopeLabel={hoOnly ? (data.homeOffice?.label || 'Delhi HO') : 'this selection'} />
            </div>
          )}

          {(tab === 'rows' || tab === 'people') && (
          <>
          <p className="mt-3 text-[11px] text-slate-400">
            Showing {Math.min(tab === 'rows' ? shown.length : people.length, limit).toLocaleString('en-IN')} of{' '}
            {(tab === 'rows' ? shown.length : people.length).toLocaleString('en-IN')}
            {blankHidden ? ` · ${blankHidden.toLocaleString('en-IN')} days with no punch hidden` : ''}
            {flags.size > 1 ? ' · several filters mean any of them' : ''}
          </p>

          {/* The table sits in the page flow at desktop width, which is what
              lets `sticky top-0` on the header actually stick — an
              overflow-x container would make the header stick to a box that
              never scrolls vertically. Below lg it gets its own horizontal
              scroller, paired with overflow-y-hidden because a non-visible
              overflow-x computes overflow-y to auto and paints a second
              vertical scrollbar beside the shell's own. */}
          <div className="mt-2 rounded-xl border border-slate-200 bg-white
                          max-lg:overflow-x-auto max-lg:overflow-y-hidden">
            {tab === 'rows'
              ? <RowTable rows={shown.slice(0, limit)} multiDay={multiDay}
                          sort={sort} onSort={setSort} />
              : <PeopleTable people={people.slice(0, limit)} />}
          </div>

          {(tab === 'rows' ? shown.length : people.length) > limit && (
            <button onClick={() => setLimit(l => l + PAGE * 2)}
              className="mt-3 w-full py-2.5 rounded-xl border border-slate-200 bg-white text-[12px]
                         font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              Show more — {((tab === 'rows' ? shown.length : people.length) - limit)
                .toLocaleString('en-IN')} still hidden
            </button>
          )}

          {!shown.length && (
            <p className="py-10 text-center text-[13px] text-slate-400">Nothing matches those filters.</p>
          )}
          </>
          )}

          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              What this data cannot tell you
            </p>
            <ul className="mt-2 space-y-1.5 text-[12px] text-slate-600 leading-relaxed">
              <li>
                <b className="text-slate-800">Absent</b> means a working day with nothing recorded, once
                holidays, Sundays and future dates have been taken out. It is <b>not</b> proof of
                absence — the feed carries no leave column, so an approved leave arrives looking
                exactly the same. Check against leave records before acting on it.
              </li>
              <li>
                <b className="text-slate-800">Holidays are matched to each person's location.</b> The
                calendar is state-wise — 11 Nov is a holiday in Assam and West Bengal only — so one
                state's holiday no longer marks the whole company off.
              </li>
              <li>
                <b className="text-slate-800">Unswiped</b> days show no hours. The day never closed, and a
                duration taken from one would read as a fifteen-hour shift.
              </li>
              {!data.overtimeTracked && (
                <li>
                  <b className="text-slate-800">Overtime</b> is not computed by this HRMS tenant, so there
                  is no overtime column to show.
                </li>
              )}
            </ul>
          </div>
        </>
      )}

      {!data && !loading && meta?.ready && !error && (
        <div className="py-16 text-center">
          <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="mt-3 text-[13px] text-slate-400">Pick a date and press Fetch.</p>
        </div>
      )}
    </div>
  );
}

interface Person {
  code: string; name: string; designation: string; grade: string;
  department: string; location: string;
  days: number; punched: number; late: number; afterCutoff: number;
  unswiped: number; noRecord: number; absent: number; earlyOut: number;
  totalMins: number; withHours: number;
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
      className={`px-2.5 py-1.5 rounded-lg border text-[12px] bg-white max-w-[170px]
                  focus:outline-none focus:ring-2 focus:ring-indigo-400
                  ${value ? 'border-indigo-300 text-indigo-700 font-bold' : 'border-slate-200 text-slate-600'}`}>
      <option value="">{label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

const TH = 'px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap';
const TD = 'px-3 py-2.5 text-[12px] text-slate-700 align-middle';

function SortTH({ label, k, sort, onSort, align = 'left' }: {
  label: string; k: SortKey; align?: 'left' | 'right';
  sort: { key: SortKey; desc: boolean };
  onSort: (s: { key: SortKey; desc: boolean }) => void;
}) {
  const on = sort.key === k;
  return (
    <th className={`${TH} ${align === 'right' ? 'text-right' : ''}`}>
      <button onClick={() => onSort({ key: k, desc: on ? !sort.desc : false })}
        className={`inline-flex items-center gap-1 hover:text-slate-800 transition-colors
                    ${on ? 'text-slate-900' : ''}`}>
        {label}
        <ArrowUpDown className={`w-3 h-3 ${on ? 'opacity-100' : 'opacity-30'}`} />
      </button>
    </th>
  );
}

function Chip({ flag }: { flag: AttFlag }) {
  const look: Partial<Record<AttFlag, string>> = {
    absent:          'bg-rose-100 text-rose-800 ring-rose-200',
    weekOff:         'bg-slate-100 text-slate-500 ring-slate-200',
    notYet:          'bg-slate-50 text-slate-400 ring-slate-200',
    late:            'bg-amber-100 text-amber-800 ring-amber-200',
    afterCutoff:     'bg-rose-100 text-rose-800 ring-rose-200',
    unswiped:        'bg-orange-100 text-orange-800 ring-orange-200',
    earlyOut:        'bg-violet-100 text-violet-800 ring-violet-200',
    noRecord:        'bg-slate-100 text-slate-600 ring-slate-200',
    holiday:         'bg-sky-100 text-sky-800 ring-sky-200',
    optionalHoliday: 'bg-sky-50 text-sky-700 ring-sky-200',
    sunday:          'bg-slate-100 text-slate-500 ring-slate-200',
  };
  const text: Partial<Record<AttFlag, string>> = {
    absent: 'Absent', weekOff: 'Week off', notYet: 'Not yet',
    late: 'Late', afterCutoff: 'After cutoff', unswiped: 'Unswiped', earlyOut: 'Early out',
    holiday: 'Holiday', optionalHoliday: 'Optional holiday', sunday: 'Sunday',
  };
  /* `noRecord` carries no chip of its own: it is the raw fact, and one of
     absent / weekOff / holiday / notYet always sits beside it saying what
     it means. Showing both would put "No record  Absent" on every row. */
  if (flag === 'present' || flag === 'noRecord' || !look[flag]) return null;
  /* Sunday is already said by "Week off"; the two together are noise. */
  if (flag === 'sunday') return null;
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ring-1 ${look[flag]}`}>
      {text[flag]}
    </span>
  );
}

function RowTable({ rows, multiDay, sort, onSort }: {
  rows: AttRow[]; multiDay: boolean;
  sort: { key: SortKey; desc: boolean };
  onSort: (s: { key: SortKey; desc: boolean }) => void;
}) {
  return (
    <table className="w-full border-collapse">
      <thead className="bg-slate-50/95 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
        <tr>
          <SortTH label="Employee" k="name" sort={sort} onSort={onSort} />
          {multiDay && <SortTH label="Date" k="date" sort={sort} onSort={onSort} />}
          <th className={TH}>Role</th>
          <th className={TH}>Department</th>
          <SortTH label="Punches" k="in" sort={sort} onSort={onSort} />
          <SortTH label="Worked" k="worked" sort={sort} onSort={onSort} align="right" />
          <SortTH label="Variance" k="late" sort={sort} onSort={onSort} align="right" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.code}-${r.date}-${i}`}
            className={`border-b border-slate-100 last:border-0 transition-colors
                        ${r.flags.includes('absent') ? 'bg-rose-50/50 hover:bg-rose-50'
                          : r.noRecord ? 'bg-slate-50/60 hover:bg-slate-100/60'
                          : 'hover:bg-indigo-50/40'}`}>
            {/* Name, code and the chips that explain the row, together —
                the chips used to be the last column and fell off the edge. */}
            <td className={`${TD} min-w-[220px]`}>
              <div className="font-bold text-slate-800 leading-tight">{r.name || '—'}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {r.code}{r.offDirectory ? ' · not on directory' : ''}
              </div>
              {r.flags.some(f => f !== 'present') && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {r.flags.map(f => <Chip key={f} flag={f} />)}
                </div>
              )}
            </td>
            {multiDay && (
              <td className={`${TD} whitespace-nowrap`}>
                <div>{pretty(r.date)}</div>
                <div className="text-[10px] text-slate-400">{weekday(r.date)}</div>
              </td>
            )}
            <td className={`${TD} min-w-[150px]`}>
              <div className="leading-tight">{r.designation || '—'}</div>
              {r.grade && <div className="text-[10px] text-slate-400 mt-0.5">Grade {r.grade}</div>}
            </td>
            <td className={`${TD} min-w-[140px]`}>{r.department || '—'}</td>

            {/* Both punches as one span. Two columns of HH:mm side by side
                read as a table of numbers; an arrow reads as a day. */}
            <td className={`${TD} whitespace-nowrap`}>
              {r.noRecord ? <span className="text-slate-300">—</span> : (
                <span className="inline-flex items-center gap-1.5 tabular-nums font-semibold">
                  <Punch time={r.inTime} unswiped={r.inUnswiped} />
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <Punch time={r.outTime} unswiped={r.outUnswiped} />
                </span>
              )}
            </td>

            <td className={`${TD} text-right whitespace-nowrap`}>
              <div className="font-black text-slate-800 tabular-nums">{hours(r.workedMins)}</div>
              {r.normalMins != null && (
                <div className="text-[10px] text-slate-400 tabular-nums">{hours(r.normalMins)} normal</div>
              )}
            </td>

            {/* Late and early are one fact — which side of the shift the day
                fell on — so they share a cell and a colour. */}
            <td className={`${TD} text-right whitespace-nowrap tabular-nums`}>
              {r.lateMins ? <span className="text-amber-700 font-bold">+{dur(r.lateMins)} late</span>
                : r.earlyMins ? <span className="text-violet-700 font-bold">−{dur(r.earlyMins)} early</span>
                : <span className="text-slate-300">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Punch({ time, unswiped }: { time: string; unswiped: boolean }) {
  if (unswiped) {
    return <span className="text-orange-600 font-bold text-[11px]">Unswiped</span>;
  }
  return <span className={time ? 'text-slate-800' : 'text-slate-300'}>{time || '—'}</span>;
}

function PeopleTable({ people }: { people: Person[] }) {
  const Num = ({ n, tone }: { n: number; tone?: string }) => (
    <span className={n ? (tone || 'text-slate-700 font-semibold') : 'text-slate-300'}>
      {n || '—'}
    </span>
  );
  return (
    <table className="w-full border-collapse">
      <thead className="bg-slate-50/95 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
        <tr>
          <th className={TH}>Employee</th>
          <th className={TH}>Department</th>
          <th className={`${TH} text-right`}>Days</th>
          <th className={`${TH} text-right`}>Punched</th>
          <th className={`${TH} text-right`}>Absent</th>
          <th className={`${TH} text-right`}>Late (shift)</th>
          <th className={`${TH} text-right`}>After cutoff</th>
          <th className={`${TH} text-right`}>Unswiped</th>
          <th className={`${TH} text-right`}>Early out</th>
          <th className={`${TH} text-right`}>Avg day</th>
        </tr>
      </thead>
      <tbody>
        {people.map(p => (
          <tr key={p.code} className="border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 transition-colors">
            <td className={`${TD} min-w-[220px]`}>
              <div className="font-bold text-slate-800 leading-tight">{p.name || '—'}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {p.code}{p.grade ? ` · Grade ${p.grade}` : ''}
              </div>
            </td>
            <td className={TD}>{p.department || '—'}</td>
            <td className={`${TD} text-right tabular-nums`}>{p.days}</td>
            <td className={`${TD} text-right tabular-nums`}>
              <Num n={p.punched} tone="text-emerald-700 font-bold" />
            </td>
            <td className={`${TD} text-right tabular-nums`}>
              <Num n={p.absent} tone="text-rose-700 font-bold" />
            </td>
            <td className={`${TD} text-right tabular-nums`}>
              <Num n={p.late} tone="text-amber-700 font-bold" />
            </td>
            <td className={`${TD} text-right tabular-nums`}>
              <Num n={p.afterCutoff} tone="text-rose-700 font-bold" />
            </td>
            <td className={`${TD} text-right tabular-nums`}>
              <Num n={p.unswiped} tone="text-orange-700 font-bold" />
            </td>
            <td className={`${TD} text-right tabular-nums`}>
              <Num n={p.earlyOut} tone="text-violet-700 font-bold" />
            </td>
            {/* Averaged over the days that HAVE a duration, not over every
                day — dividing by days nobody closed drags it toward zero. */}
            <td className={`${TD} text-right tabular-nums font-black text-slate-800`}>
              {p.withHours ? hours(Math.round(p.totalMins / p.withHours)) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── The overview's headline ───────────────────────────────────────────────
   A hero figure and four supporting numbers, not an eight-hue chart: the
   question "how did today go" has one answer, and a chart of one number is
   a stat tile with extra steps.

   Everything here is quoted against a denominator that is stated on screen.
   A rate with nothing behind it reads as fact and is noise — a department of
   one person having one bad morning is 100% late. */
function HeadlineBand({ rows, days, cutoffLabel }: {
  rows: AttRow[]; days: number; cutoffLabel: string;
}) {
  const s = useMemo(() => summarise(rows), [rows]);
  if (!s.rows) return null;

  const pct = (v: number | null) => (v == null ? '—' : `${v.toFixed(0)}%`);
  const stats: { label: string; value: string; sub: string; tone?: string }[] = [
    { label: 'Median arrival',
      value: s.medianArrival == null ? '—' : asClock(s.medianArrival),
      sub: `cutoff ${cutoffLabel}`,
      tone: s.medianArrival != null && s.medianArrival > (clockMins(cutoffLabel) ?? 660)
        ? 'text-rose-700' : 'text-slate-900' },
    { label: 'Average day',
      value: s.avgWorked == null ? '—' : hours(s.avgWorked),
      sub: 'days with a duration only' },
    { label: 'After cutoff',
      value: s.afterCutoff.toLocaleString('en-IN'),
      sub: `${pct(s.punched ? (s.afterCutoff / s.punched) * 100 : null)} of days punched`,
      tone: s.afterCutoff ? 'text-rose-700' : 'text-slate-900' },
    { label: 'Unswiped',
      value: s.unswiped.toLocaleString('en-IN'),
      sub: 'no hours can be derived',
      tone: s.unswiped ? 'text-violet-700' : 'text-slate-900' },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Turned up
          </p>
          {/* The hero figure. It is a share of DAY RECORDS, not of people:
              over a range one person contributes several and they differ. */}
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-5xl font-black tracking-tight text-slate-900">
              {pct(s.punchedRate)}
            </span>
            <span className="text-[12px] text-slate-500">
              {s.punched.toLocaleString('en-IN')} of {s.rows.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {s.people.toLocaleString('en-IN')} people over {days} day{days === 1 ? '' : 's'}
            {s.noRecord ? ` · ${s.noRecord.toLocaleString('en-IN')} with no record at all` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-7 gap-y-4">
          {stats.map(st => (
            <div key={st.label}>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {st.label}
              </p>
              <p className={`mt-0.5 text-xl font-black tabular-nums ${st.tone || 'text-slate-900'}`}>
                {st.value}
              </p>
              <p className="text-[10px] text-slate-400">{st.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

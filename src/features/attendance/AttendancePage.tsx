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
  UserRound, ArrowUpDown, ArrowRight, EyeOff, Eye,
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
  { key: 'noRecord',    label: 'No record',    hint: 'Nothing at all came from HRMS',   icon: CircleSlash,   tone: 'slate' },
  { key: 'late',        label: 'Late (shift)', hint: 'Late against their own shift',    icon: Timer,         tone: 'amber' },
  { key: 'afterCutoff', label: 'After cutoff', hint: 'In-punch after the clock cutoff', icon: Timer,         tone: 'rose' },
  { key: 'unswiped',    label: 'Unswiped',     hint: 'A punch was never made',          icon: AlertTriangle, tone: 'orange' },
  { key: 'earlyOut',    label: 'Early out',    hint: 'Left before their shift ended',   icon: LogOut,        tone: 'violet' },
  { key: 'holiday',     label: 'Holiday',      hint: 'A company holiday',               icon: CalendarOff,   tone: 'sky' },
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
  const [view, setView] = useState<'rows' | 'people'>('rows');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'name', desc: false });
  /* 189 of 720 rows on a normal day are blanks for people the feed has
     nothing on. Left in, they fill the first screen with dashes before any
     real punch appears, so they are collapsed by default and one click
     away. The COUNTS always include them — only the table hides them. */
  const [hideBlank, setHideBlank] = useState(true);
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
    const prefix = (data?.homeOffice?.codePrefix || 'HO').toUpperCase();
    return rows.filter(r =>
      (!hoOnly || r.code.toUpperCase().startsWith(prefix))
      && (!q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
      && (!location || r.location === location)
      && (!department || r.department === department)
      && (!grade || r.grade === grade));
  }, [rows, hoOnly, data, search, location, department, grade]);

  /* shown = scoped after the flags. Several flags mean ANY OF: the status
     markers are near enough mutually exclusive that an all-of rule answers
     nothing for the pairs most worth seeing together. */
  const shown = useMemo(() => {
    let out = flags.size ? scoped.filter(r => r.flags.some(f => flags.has(f))) : scoped;
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
  }, [scoped, flags, hideBlank, sort]);

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
    const map = new Map<string, Person>();
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
  const blankHidden = hideBlank && !flags.has('noRecord')
    ? (flags.size ? scoped.filter(r => r.flags.some(f => flags.has(f))) : scoped).filter(r => r.noRecord).length
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
              title="Rows HRMS returned nothing for. The counts above always include them."
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1.5
                ${hideBlank ? 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            : 'border-indigo-300 bg-indigo-50 text-indigo-700'}`}>
              {hideBlank ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {hideBlank ? 'No-record rows hidden' : 'Showing no-record rows'}
            </button>

            <div className="ml-auto flex items-center gap-2">
              {worked != null && (
                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                  Average day <b className="text-slate-800 tabular-nums">{hours(worked)}</b>
                </span>
              )}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {([['rows', 'Day rows', Table2], ['people', 'By person', UserRound]] as const).map(
                  ([k, label, Icon]) => (
                    <button key={k} onClick={() => setView(k)}
                      className={`px-2.5 py-1.5 text-[11px] font-bold inline-flex items-center gap-1 transition-colors
                        ${view === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
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
            Showing {Math.min(shown.length, limit).toLocaleString('en-IN')} of{' '}
            {shown.length.toLocaleString('en-IN')}
            {blankHidden ? ` · ${blankHidden.toLocaleString('en-IN')} no-record rows hidden` : ''}
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
            {view === 'rows'
              ? <RowTable rows={shown.slice(0, limit)} multiDay={multiDay}
                          sort={sort} onSort={setSort} />
              : <PeopleTable people={people.slice(0, limit)} />}
          </div>

          {(view === 'rows' ? shown.length : people.length) > limit && (
            <button onClick={() => setLimit(l => l + PAGE * 2)}
              className="mt-3 w-full py-2.5 rounded-xl border border-slate-200 bg-white text-[12px]
                         font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              Show more — {((view === 'rows' ? shown.length : people.length) - limit)
                .toLocaleString('en-IN')} still hidden
            </button>
          )}

          {!shown.length && (
            <p className="py-10 text-center text-[13px] text-slate-400">Nothing matches those filters.</p>
          )}

          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              What this data cannot tell you
            </p>
            <ul className="mt-2 space-y-1.5 text-[12px] text-slate-600 leading-relaxed">
              <li>
                <b className="text-slate-800">No record</b> means HRMS returned nothing for that person
                that day. It is <b>not</b> the same as absent — the feed carries no leave or week-off
                column, so a day off, an approved leave and a missed punch all arrive looking identical.
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
  unswiped: number; noRecord: number; earlyOut: number;
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
    late: 'Late', afterCutoff: 'After cutoff', unswiped: 'Unswiped', earlyOut: 'Early out',
    noRecord: 'No record', holiday: 'Holiday', optionalHoliday: 'Optional holiday', sunday: 'Sunday',
  };
  if (flag === 'present' || !look[flag]) return null;
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
            className={`border-b border-slate-100 last:border-0
                        ${r.noRecord ? 'bg-slate-50/60' : 'hover:bg-indigo-50/40'} transition-colors`}>
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
          <th className={`${TH} text-right`}>No record</th>
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
            <td className={`${TD} text-right tabular-nums`}><Num n={p.noRecord} /></td>
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

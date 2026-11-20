/* The Attendance overview charts.

   Colours are not a taste decision here — the four series hues were run
   through the data-viz validator against a white surface before anything was
   drawn, because "these look different enough" is how a chart ends up
   unreadable to a tenth of the people opening it:

     teal   #0d9488   on time / punched
     amber  #f59e0b   late against their own shift
     rose   #e11d48   after the clock cutoff
     violet #7c3aed   unswiped

   Worst adjacent pair under colour-vision deficiency is ΔE 16.6 (protan),
   comfortably over the 8 target, and the worst normal-vision pair is 25.6.
   The chip palette the table already uses FAILED that check — Tailwind's
   orange-500 and rose-500 sit at ΔE 12.7, under the 15 floor, which means
   full-colour readers cannot reliably tell them apart either. Amber is the
   one hue under 3:1 contrast on white, so every chart that uses it carries
   a legend and a tooltip, and the same figures exist as a table in Reports.

   One axis per chart, always. The daily trend plots three counts of PEOPLE,
   which share a unit honestly; a rate and a count on one plot would invent a
   relationship that is not in the data. */
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Clock3, TrendingUp, Building2 } from 'lucide-react';
import { asClock, type ArrivalBucket, type DayPoint, type GroupStat } from './analytics';
import { hours } from './api';

export const VIZ = {
  onTime: '#0d9488',
  late:   '#f59e0b',
  cutoff: '#e11d48',
  unswiped: '#7c3aed',
  grid:   '#e2e8f0',
  axis:   '#94a3b8',
  ink:    '#334155',
} as const;

const AXIS = { fontSize: 11, fill: VIZ.axis } as const;

/** Values and labels wear text ink, never the series colour; the swatch
 *  beside them carries the identity. */
function TipBox({ title, rows }: { title: string; rows: { k: string; v: string; c?: string }[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <div className="text-[11px] font-black text-slate-800">{title}</div>
      <div className="mt-1 space-y-0.5">
        {rows.map(r => (
          <div key={r.k} className="flex items-center gap-2 text-[11px]">
            {r.c && <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: r.c }} />}
            <span className="text-slate-500">{r.k}</span>
            <span className="ml-auto font-bold text-slate-800 tabular-nums">{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, note, icon: Icon, children, right }: {
  title: string; note?: string; icon: typeof Clock3;
  children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-[13px] font-black text-slate-800 leading-tight">{title}</h3>
            {note && <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{note}</p>}
          </div>
        </div>
        {right}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Key({ items }: { items: { label: string; colour: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map(i => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: i.colour }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/* ── When people arrive ──────────────────────────────────────────────────── */

export function ArrivalChart({ data, cutoffMins, cutoffLabel }: {
  data: ArrivalBucket[]; cutoffMins: number; cutoffLabel: string;
}) {
  if (!data.length) {
    return (
      <Panel title="When people arrive" icon={Clock3}
        note="No in-punches in this selection.">
        <p className="py-8 text-center text-[12px] text-slate-400">Nothing to plot.</p>
      </Panel>
    );
  }
  const total = data.reduce((a, b) => a + b.count, 0);
  const past = data.filter(b => b.late).reduce((a, b) => a + b.count, 0);
  const peak = data.reduce((a, b) => (b.count > a.count ? b : a), data[0]);

  return (
    <Panel title="When people arrive" icon={Clock3}
      note={`${total.toLocaleString('en-IN')} in-punches in 15-minute blocks. Busiest block ${peak.label}.`}
      right={<Key items={[
        { label: `On time`, colour: VIZ.onTime },
        { label: `After ${cutoffLabel}`, colour: VIZ.cutoff },
      ]} />}>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 4 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={VIZ.grid} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: VIZ.grid }}
            interval="preserveStartEnd" minTickGap={14} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
          <Tooltip cursor={{ fill: 'rgba(15,23,42,.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const b = payload[0].payload as ArrivalBucket;
              return <TipBox
                title={b.overflow
                  ? (b.overflow === 'before' ? `Arrived before ${asClock(b.from + 15)}` : `Arrived ${b.label.slice(2)} or later`)
                  : `${b.label} – ${asClock(b.from + 15)}`}
                rows={[
                  { k: 'People', v: String(b.count), c: b.late ? VIZ.cutoff : VIZ.onTime },
                  { k: 'Share', v: `${((b.count / total) * 100).toFixed(1)}%` },
                ]} />;
            }} />
          {/* The company rule, drawn where it falls. Without it the reader has
              to count buckets to find out where "late" starts.

              Guarded, because this is a CATEGORY axis: recharts matches the
              reference line by label, so if the cutoff bucket fell outside
              the trimmed window the line silently does not draw. Better to
              know it is absent than to wonder where it went. */}
          {data.some(b => b.label === asClock(cutoffMins)) && (
            <ReferenceLine x={asClock(cutoffMins)} stroke={VIZ.cutoff} strokeDasharray="4 3"
              label={{ value: cutoffLabel, position: 'top', fontSize: 10, fill: VIZ.cutoff }} />
          )}
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={38}>
            {data.map(b => (
              <Cell key={b.from} fill={b.late ? VIZ.cutoff : VIZ.onTime}
                fillOpacity={b.overflow ? 0.45 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[11px] text-slate-500">
        {past
          ? <><b className="text-slate-800">{past}</b> of {total} arrivals were after {cutoffLabel}.</>
          : <>Every arrival was on or before {cutoffLabel}.</>}
        {data.some(b => b.overflow) && ' Faded bars at the ends hold the outliers, so the busy hours are not squashed by a stray 01:30 punch.'}
      </p>
    </Panel>
  );
}

/* ── Day by day ──────────────────────────────────────────────────────────── */

export function TrendChart({ data }: { data: DayPoint[] }) {
  if (data.length < 2) return null;   // a two-point line is a stat tile
  const partial = data.filter(d => d.partial);

  return (
    <Panel title="Day by day" icon={TrendingUp}
      note="All three are counts of people, so they share one axis."
      right={<Key items={[
        { label: 'Punched', colour: VIZ.onTime },
        { label: 'Late (shift)', colour: VIZ.late },
        { label: 'Unswiped', colour: VIZ.unswiped },
      ]} />}>
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke={VIZ.grid} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: VIZ.grid }}
            minTickGap={18} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DayPoint;
              return <TipBox
                title={`${label}${d.partial ? ' — still in progress' : ''}`}
                rows={[
                  { k: 'Punched', v: String(d.punched), c: VIZ.onTime },
                  { k: 'Late (shift)', v: String(d.late), c: VIZ.late },
                  { k: 'Unswiped', v: String(d.unswiped), c: VIZ.unswiped },
                  { k: 'No record', v: String(d.noRecord) },
                  { k: 'Average day', v: d.avgWorked == null ? '—' : hours(d.avgWorked) },
                ]} />;
            }} />
          {/* Today is not a finished day. On a real 20-Nov fetch every one of
              the 60 people punched in was "unswiped" at noon, which is not a
              crisis — it is lunchtime. The band says so. */}
          {partial.map(d => (
            <ReferenceLine key={d.date} x={d.label} stroke={VIZ.axis} strokeDasharray="3 3"
              label={{ value: 'in progress', position: 'insideTopRight', fontSize: 9, fill: VIZ.axis }} />
          ))}
          <Line type="monotone" dataKey="punched" stroke={VIZ.onTime} strokeWidth={2}
            dot={{ r: 3.5, strokeWidth: 0, fill: VIZ.onTime }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="late" stroke={VIZ.late} strokeWidth={2}
            dot={{ r: 3.5, strokeWidth: 0, fill: VIZ.late }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="unswiped" stroke={VIZ.unswiped} strokeWidth={2}
            dot={{ r: 3.5, strokeWidth: 0, fill: VIZ.unswiped }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
      {partial.length > 0 && (
        <p className="mt-2 text-[11px] text-slate-500">
          The last point is today and is still filling in — people who have not left yet
          count as unswiped until they punch out.
        </p>
      )}
    </Panel>
  );
}

/* ── Departments ─────────────────────────────────────────────────────────── */

export function DeptChart({ data, metric }: {
  data: GroupStat[];
  metric: 'lateRate' | 'avgWorked' | 'punched';
}) {
  const META = {
    lateRate:  { label: 'Late rate', note: 'Late days as a share of the days that team actually punched in.',
                 fmt: (v: number) => `${v.toFixed(0)}%` },
    avgWorked: { label: 'Average day', note: 'Averaged over the days that have a duration — unswiped days have none.',
                 fmt: (v: number) => hours(v) },
    punched:   { label: 'Days punched', note: 'How many day-records carry at least one punch.',
                 fmt: (v: number) => String(v) },
  }[metric];

  /* Nominal categories get ONE hue, never a value ramp: shading each bar by
     its own length double-encodes what the bar already shows and burns the
     only free channel. Ranked, longest first, so the eye does the comparing. */
  const rows = data
    .map(d => ({ ...d, value: metric === 'lateRate' ? d.lateRate : metric === 'avgWorked' ? d.avgWorked : d.punched }))
    .filter((d): d is typeof d & { value: number } => d.value != null)
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  if (rows.length < 2) return null;

  return (
    <Panel title={`Departments by ${META.label.toLowerCase()}`} icon={Building2} note={META.note}>
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 28 + 24)}>
        <BarChart data={rows} layout="vertical"
          margin={{ top: 4, right: 44, left: 4, bottom: 4 }} barCategoryGap={3}>
          <CartesianGrid horizontal={false} stroke={VIZ.grid} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false}
            tickFormatter={v => (metric === 'avgWorked' ? `${Math.round(v / 60)}h` : String(v))} />
          {/* Truncated on purpose rather than left to clip: the real names
              run to "Supply Chain Management", which is already near the
              160px gutter at 11px, and a name cut off mid-glyph reads as a
              rendering bug. The tooltip carries the full name. */}
          <YAxis type="category" dataKey="name" tick={{ ...AXIS, fill: VIZ.ink }} tickLine={false}
            axisLine={false} width={160} interval={0}
            tickFormatter={(v: string) => (v.length > 24 ? `${v.slice(0, 23)}…` : v)} />
          <Tooltip cursor={{ fill: 'rgba(15,23,42,.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as GroupStat & { value: number };
              return <TipBox title={d.name} rows={[
                { k: META.label, v: META.fmt(d.value), c: VIZ.onTime },
                { k: 'People', v: String(d.people) },
                { k: 'Days punched', v: String(d.punched) },
                { k: 'Late (shift)', v: String(d.late) },
                { k: 'After cutoff', v: String(d.afterCutoff) },
                { k: 'Unswiped', v: String(d.unswiped) },
              ]} />;
            }} />
          <Bar dataKey="value" fill={VIZ.onTime} radius={[0, 4, 4, 0]} maxBarSize={20}
            label={{ position: 'right', fontSize: 10, fill: VIZ.ink,
                     formatter: (v: unknown) => (typeof v === 'number' ? META.fmt(v) : '') }} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

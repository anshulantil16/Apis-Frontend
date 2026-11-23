/* The Reports tab: the questions people actually open this tool to ask,
   each as a list somebody can act on or forward.

   Every report here is built from the same `shown` rows the table uses, so a
   report can never disagree with the screen above it. Each one states its own
   denominator, because "late 4 times" means something different over a week
   than over a month, and a rate with nothing behind it is noise — a person
   with one recorded day and one late morning is 100% late and not a problem. */
import { useMemo, useState } from 'react';
import {
  Building2, Clock3, Download, AlertTriangle, Hourglass,
} from 'lucide-react';
import {
  asClock, byPerson, group, repeatOffenders,
  type GroupStat, type PersonStat,
} from './analytics';
import { hours, type AttRow } from './api';

type OffenceKey = 'absent' | 'late' | 'afterCutoff' | 'unswiped' | 'earlyOut';

const OFFENCE: Record<OffenceKey, { label: string; blurb: string }> = {
  absent:      { label: 'Absent',        blurb: 'Working days with nothing recorded — holidays, Sundays and future dates already excluded. May be approved leave.' },
  late:        { label: 'Late (shift)',  blurb: 'Days HRMS marked late against their own shift' },
  afterCutoff: { label: 'After cutoff',  blurb: 'Days they punched in after the clock cutoff' },
  unswiped:    { label: 'Unswiped',      blurb: 'Days a punch was never made, so no hours exist' },
  earlyOut:    { label: 'Early out',     blurb: 'Days they left before their shift ended' },
};

function csv(name: string, head: string[], body: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([[head.map(esc).join(','), ...body.map(r => r.map(esc).join(','))].join('\n')],
    { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const TH = 'px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap';
const TD = 'px-3 py-2 text-[12px] text-slate-700 whitespace-nowrap';
const NUM = `${TD} text-right tabular-nums`;

function Card({ title, note, icon: Icon, onExport, children }: {
  title: string; note: string; icon: typeof Building2;
  onExport?: () => void; children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex items-start gap-2">
          <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-[13px] font-black text-slate-800 leading-tight">{title}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{note}</p>
          </div>
        </div>
        {onExport && (
          <button onClick={onExport}
            className="shrink-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold
                       text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1">
            <Download className="w-3 h-3" />CSV
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 pb-5 text-[12px] text-slate-400">{children}</p>;
}

/** A thin share bar beside a figure. One hue — these are ranked rows of the
 *  same measure, not different series. */
function Share({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <span className="inline-block w-16 h-1.5 rounded-full bg-slate-100 align-middle overflow-hidden">
      <span className="block h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} />
    </span>
  );
}

export function AttendanceReports({ rows, days, cutoffLabel, scopeLabel }: {
  rows: AttRow[]; days: number; cutoffLabel: string; scopeLabel: string;
}) {
  const [offence, setOffence] = useState<OffenceKey>('absent');
  /* Over one day everyone with a single bad morning would be an "offender",
     which is not a report, it is the table again. Over a range the floor
     rises so the list stays worth reading. */
  const minCount = days > 1 ? 2 : 1;

  const people = useMemo(() => byPerson(rows), [rows]);
  const depts = useMemo(() => group(rows, 'department', 1), [rows]);
  const offenders = useMemo(
    () => repeatOffenders(people, offence, minCount).slice(0, 40),
    [people, offence, minCount]);

  const latest = useMemo(
    () => people.filter(p => p.avgArrival != null)
      .sort((a, b) => (b.avgArrival ?? 0) - (a.avgArrival ?? 0)).slice(0, 15),
    [people]);

  const longest = useMemo(
    () => people.filter(p => p.avgWorked != null)
      .sort((a, b) => (b.avgWorked ?? 0) - (a.avgWorked ?? 0)).slice(0, 15),
    [people]);

  const maxOffence = offenders.length ? offenders[0][offence] : 0;

  return (
    <div className="grid gap-4 xl:grid-cols-2">

      {/* ── Departments ───────────────────────────────────────────────── */}
      <Card title="Department summary" icon={Building2}
        note={`Every department in the current selection, over ${days} day${days === 1 ? '' : 's'}.`}
        onExport={() => csv('attendance_departments',
          ['Department', 'People', 'Day records', 'Punched', 'No record', 'Late (shift)',
           'After cutoff', 'Unswiped', 'Early out', 'Late rate %', 'Average day'],
          depts.map((d: GroupStat) => [
            d.name, d.people, d.rows, d.punched, d.noRecord, d.late, d.afterCutoff,
            d.unswiped, d.earlyOut,
            d.lateRate == null ? '' : d.lateRate.toFixed(1),
            d.avgWorked == null ? '' : hours(d.avgWorked),
          ]))}>
        {depts.length ? (
          <div className="max-lg:overflow-x-auto max-lg:overflow-y-hidden">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr>
                  <th className={TH}>Department</th>
                  <th className={`${TH} text-right`}>People</th>
                  <th className={`${TH} text-right`}>Punched</th>
                  <th className={`${TH} text-right`}>Absent</th>
                  <th className={`${TH} text-right`}>Late</th>
                  <th className={`${TH} text-right`}>After cutoff</th>
                  <th className={`${TH} text-right`}>Unswiped</th>
                  <th className={`${TH} text-right`}>Avg day</th>
                </tr>
              </thead>
              <tbody>
                {depts.map(d => (
                  <tr key={d.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className={`${TD} font-bold text-slate-800`}>{d.name}</td>
                    <td className={NUM}>{d.people}</td>
                    <td className={NUM}>{d.punched}</td>
                    <td className={`${NUM} ${d.absent ? 'text-rose-700 font-bold' : 'text-slate-300'}`}>
                      {d.absent || '—'}
                    </td>
                    <td className={`${NUM} ${d.late ? 'text-amber-700 font-bold' : 'text-slate-300'}`}>
                      {d.late || '—'}
                    </td>
                    <td className={`${NUM} ${d.afterCutoff ? 'text-rose-700 font-bold' : 'text-slate-300'}`}>
                      {d.afterCutoff || '—'}
                    </td>
                    <td className={`${NUM} ${d.unswiped ? 'text-violet-700 font-bold' : 'text-slate-300'}`}>
                      {d.unswiped || '—'}
                    </td>
                    <td className={`${NUM} font-bold text-slate-800`}>
                      {d.avgWorked == null ? '—' : hours(d.avgWorked)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No departments in this selection.</Empty>}
      </Card>

      {/* ── Who to talk to ────────────────────────────────────────────── */}
      <Card title="Worth a conversation" icon={AlertTriangle}
        note={`Ranked by how MANY days, not by rate — somebody late once in their only recorded day is a rounding error, not a pattern.${days > 1 ? ` Minimum ${minCount} days.` : ''}`}
        onExport={() => csv(`attendance_${offence}`,
          ['Code', 'Name', 'Department', 'Designation', OFFENCE[offence].label,
           'Days punched', 'Rate %', 'Average in', 'Average day'],
          offenders.map(p => [
            p.code, p.name, p.department, p.designation, p[offence], p.punched,
            p.lateRate == null ? '' : p.lateRate.toFixed(1),
            p.avgArrival == null ? '' : asClock(p.avgArrival),
            p.avgWorked == null ? '' : hours(p.avgWorked),
          ]))}>
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {(Object.keys(OFFENCE) as OffenceKey[]).map(k => (
            <button key={k} onClick={() => setOffence(k)} title={OFFENCE[k].blurb}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors
                ${offence === k ? 'bg-slate-900 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {OFFENCE[k].label}
            </button>
          ))}
        </div>
        {offenders.length ? (
          <div className="max-lg:overflow-x-auto max-lg:overflow-y-hidden">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr>
                  <th className={TH}>Employee</th>
                  <th className={TH}>Department</th>
                  <th className={`${TH} text-right`}>{OFFENCE[offence].label}</th>
                  <th className={`${TH} text-right`}>Of days punched</th>
                  <th className={`${TH} text-right`}>Avg in</th>
                </tr>
              </thead>
              <tbody>
                {offenders.map((p: PersonStat) => (
                  <tr key={p.code} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className={TD}>
                      <div className="font-bold text-slate-800 leading-tight">{p.name || '—'}</div>
                      <div className="text-[10px] text-slate-400">{p.code}</div>
                    </td>
                    <td className={TD}>{p.department || '—'}</td>
                    <td className={NUM}>
                      <span className="inline-flex items-center gap-2">
                        <Share value={p[offence]} max={maxOffence} />
                        <b className="text-slate-800">{p[offence]}</b>
                      </span>
                    </td>
                    <td className={NUM}>{p.punched || '—'}</td>
                    <td className={NUM}>{p.avgArrival == null ? '—' : asClock(p.avgArrival)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            Nobody in {scopeLabel} reaches {minCount} day{minCount === 1 ? '' : 's'} of
            {' '}{OFFENCE[offence].label.toLowerCase()} in this selection. That is a good answer, not an empty table.
          </Empty>
        )}
      </Card>

      {/* ── Latest arrivals ───────────────────────────────────────────── */}
      <Card title="Latest average arrival" icon={Clock3}
        note={`Mean in-punch across the days each person actually punched. Cutoff is ${cutoffLabel}.`}
        onExport={() => csv('attendance_latest_arrivals',
          ['Code', 'Name', 'Department', 'Average in', 'Days punched', 'After cutoff'],
          latest.map(p => [p.code, p.name, p.department,
            p.avgArrival == null ? '' : asClock(p.avgArrival), p.punched, p.afterCutoff]))}>
        {latest.length ? (
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className={TH}>Employee</th>
                <th className={`${TH} text-right`}>Average in</th>
                <th className={`${TH} text-right`}>Days</th>
                <th className={`${TH} text-right`}>After cutoff</th>
              </tr>
            </thead>
            <tbody>
              {latest.map(p => (
                <tr key={p.code} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className={TD}>
                    <div className="font-bold text-slate-800 leading-tight">{p.name || '—'}</div>
                    <div className="text-[10px] text-slate-400">{p.department || p.code}</div>
                  </td>
                  <td className={`${NUM} font-black text-slate-800`}>
                    {p.avgArrival == null ? '—' : asClock(p.avgArrival)}
                  </td>
                  <td className={NUM}>{p.punched}</td>
                  <td className={`${NUM} ${p.afterCutoff ? 'text-rose-700 font-bold' : 'text-slate-300'}`}>
                    {p.afterCutoff || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>Nobody in this selection has a readable in-punch.</Empty>}
      </Card>

      {/* ── Longest days ──────────────────────────────────────────────── */}
      <Card title="Longest average day" icon={Hourglass}
        note="Averaged over the days that have a duration. Unswiped days have none and are left out rather than counted as zero."
        onExport={() => csv('attendance_longest_days',
          ['Code', 'Name', 'Department', 'Average day', 'Days punched', 'Unswiped'],
          longest.map(p => [p.code, p.name, p.department,
            p.avgWorked == null ? '' : hours(p.avgWorked), p.punched, p.unswiped]))}>
        {longest.length ? (
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className={TH}>Employee</th>
                <th className={`${TH} text-right`}>Average day</th>
                <th className={`${TH} text-right`}>Days</th>
                <th className={`${TH} text-right`}>Unswiped</th>
              </tr>
            </thead>
            <tbody>
              {longest.map(p => (
                <tr key={p.code} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className={TD}>
                    <div className="font-bold text-slate-800 leading-tight">{p.name || '—'}</div>
                    <div className="text-[10px] text-slate-400">{p.department || p.code}</div>
                  </td>
                  <td className={`${NUM} font-black text-slate-800`}>
                    {p.avgWorked == null ? '—' : hours(p.avgWorked)}
                  </td>
                  <td className={NUM}>{p.punched}</td>
                  <td className={`${NUM} ${p.unswiped ? 'text-violet-700 font-bold' : 'text-slate-300'}`}>
                    {p.unswiped || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>No day in this selection has a usable duration.</Empty>}
      </Card>
    </div>
  );
}

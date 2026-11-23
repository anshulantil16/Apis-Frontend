/* Everything the Attendance charts and reports are computed from.

   Pure functions over the normalised rows, kept out of the components so
   they can be checked on their own — the frontend's vitest runner has been
   broken since the Vite 8 upgrade, so these are verified by a node script
   against real-shaped fixtures rather than by a test suite.

   Three rules run through all of it, each written because the figure was
   wrong without it:

     * `noRecord` rows are NOT absences. HRMS returns one for every employee
       on every date and the feed has no leave or week-off column, so they
       are counted as their own thing and never as "did not come in".
     * Durations are averaged over the days that HAVE one. An unswiped day
       carries `workedMins: null`, and treating that as a zero drags every
       average toward the floor.
     * A rate is only quoted when there is something to divide by. 0/0 is
       reported as null and rendered as "—", never as 0%.
*/
import type { AttRow } from './api';

export const has = (r: AttRow, f: string) => r.flags.includes(f as never);

/** A share, or null when the denominator is zero — never 0/0 shown as 0%. */
export function rate(part: number, whole: number): number | null {
  return whole > 0 ? (part / whole) * 100 : null;
}

export function mean(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

/** Minutes past midnight for an 'HH:mm' punch, or null. */
export function clockMins(hhmm: string): number | null {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(hhmm || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export const asClock = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

// ── Headline ────────────────────────────────────────────────────────────────

export interface Summary {
  rows: number;
  people: number;          // distinct employees, not row count
  days: number;            // distinct dates present
  punched: number;
  noRecord: number;
  /** A working day with nothing recorded, once holidays, Sundays and future
   *  dates are taken out. Not proof of absence — see the server's
   *  _classify(). This is the figure people actually ask for. */
  absent: number;
  late: number;
  afterCutoff: number;
  unswiped: number;
  earlyOut: number;
  /** Punched as a share of rows. Quoted against ROWS, not people: over a
      range one person contributes several rows and they are not all alike. */
  punchedRate: number | null;
  avgWorked: number | null;
  medianArrival: number | null;
}

export function summarise(rows: AttRow[]): Summary {
  const arrivals = rows.map(r => clockMins(r.inTime)).filter((m): m is number => m != null).sort((a, b) => a - b);
  const punched = rows.filter(r => has(r, 'present')).length;
  return {
    rows: rows.length,
    people: new Set(rows.map(r => r.code)).size,
    days: new Set(rows.map(r => r.date).filter(Boolean)).size,
    punched,
    noRecord: rows.filter(r => r.noRecord).length,
    absent: rows.filter(r => has(r, 'absent')).length,
    late: rows.filter(r => has(r, 'late')).length,
    afterCutoff: rows.filter(r => has(r, 'afterCutoff')).length,
    unswiped: rows.filter(r => has(r, 'unswiped')).length,
    earlyOut: rows.filter(r => has(r, 'earlyOut')).length,
    punchedRate: rate(punched, rows.length),
    avgWorked: mean(rows.map(r => r.workedMins).filter((m): m is number => m != null)),
    // Median, not mean: one 04:00 security punch moves a mean and not a median.
    medianArrival: arrivals.length ? arrivals[Math.floor(arrivals.length / 2)] : null,
  };
}

// ── When people actually arrive ─────────────────────────────────────────────

export interface ArrivalBucket {
  /** Minutes past midnight at the START of the bucket. */
  from: number;
  label: string;
  count: number;
  /** Whether this bucket sits past the cutoff — drives the emphasis colour. */
  late: boolean;
  /** An edge bucket holding everything earlier/later than the plotted window. */
  overflow?: 'before' | 'after';
}

/** A histogram of in-punch times.
 *
 *  **The window is trimmed, and that is the whole point.** Run against five
 *  real days of head office the untrimmed range was 01:30 to 16:00 — 59
 *  buckets, 38 of them empty, because of a 01:30 punch, a 14:15 and a 16:00.
 *  The mass everybody actually wants to read, 09:00 to 11:00, was squashed
 *  into a third of the width by three rows.
 *
 *  So the plotted window covers the central `1 - trim` of arrivals and the
 *  tails are folded into labelled edge buckets. Nothing is dropped: the
 *  counts still add up to every punch there was, and the edge bars say what
 *  they hold.
 */
export function arrivalHistogram(
  rows: AttRow[], cutoffMins: number, bucket = 15, trim = 0.02,
): ArrivalBucket[] {
  const mins = rows.map(r => clockMins(r.inTime))
    .filter((m): m is number => m != null)
    .sort((a, b) => a - b);
  if (!mins.length) return [];

  // Percentile cuts, clamped so a tiny sample is never trimmed to nothing.
  const cut = Math.min(Math.floor(mins.length * trim), Math.floor((mins.length - 1) / 2));
  const loVal = mins[cut];
  const hiVal = mins[mins.length - 1 - cut];

  const lo = Math.floor(loVal / bucket) * bucket;
  const hi = Math.floor(hiVal / bucket) * bucket;

  const tally = new Map<number, number>();
  let before = 0;
  let after = 0;
  for (const m of mins) {
    if (m < lo) { before += 1; continue; }
    if (m > hi + bucket - 1) { after += 1; continue; }
    const k = Math.floor(m / bucket) * bucket;
    tally.set(k, (tally.get(k) || 0) + 1);
  }

  const out: ArrivalBucket[] = [];
  if (before) {
    out.push({ from: lo - bucket, label: `< ${asClock(lo)}`, count: before,
               late: false, overflow: 'before' });
  }
  for (let t = lo; t <= hi; t += bucket) {
    out.push({
      from: t,
      label: asClock(t),
      count: tally.get(t) || 0,
      // The backend's rule is a strict `>`, so 11:00 sharp is on time and the
      // bucket that STARTS at the cutoff is not a late bucket.
      late: t > cutoffMins,
    });
  }
  if (after) {
    out.push({ from: hi + bucket, label: `> ${asClock(hi + bucket)}`, count: after,
               late: hi + bucket > cutoffMins, overflow: 'after' });
  }
  return out;
}

// ── Day by day ──────────────────────────────────────────────────────────────

export interface DayPoint {
  date: string;
  label: string;
  /** Today, which is still happening. On a real 20-Nov fetch head office
      showed 60 unswiped out of 60 punched — not a crisis, just nobody
      having gone home yet. Anything reading this series has to say so. */
  partial: boolean;
  punched: number;
  late: number;
  unswiped: number;
  noRecord: number;
  avgWorked: number | null;
  punchedRate: number | null;
}

/** One point per date. All three plotted series are counts of PEOPLE, so they
 *  share one axis honestly — a rate and a count on one plot would not. */
/** Local today as ISO. Not `toISOString()`, which converts to UTC and in
 *  IST returns yesterday for anything before 05:30. */
export function todayIso(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dailySeries(rows: AttRow[]): DayPoint[] {
  const byDate = new Map<string, AttRow[]>();
  for (const r of rows) {
    if (!r.date) continue;
    const list = byDate.get(r.date);
    if (list) list.push(r); else byDate.set(r.date, [r]);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => {
      const s = summarise(list);
      return {
        date,
        label: new Date(`${date}T00:00:00`).toLocaleDateString('en-IN',
          { day: '2-digit', month: 'short' }),
        partial: date >= todayIso(),
        punched: s.punched,
        late: s.late,
        unswiped: s.unswiped,
        noRecord: s.noRecord,
        avgWorked: s.avgWorked,
        punchedRate: s.punchedRate,
      };
    });
}

// ── Grouped ─────────────────────────────────────────────────────────────────

export interface GroupStat {
  name: string;
  rows: number;
  people: number;
  punched: number;
  late: number;
  afterCutoff: number;
  unswiped: number;
  earlyOut: number;
  noRecord: number;
  absent: number;
  avgWorked: number | null;
  lateRate: number | null;
  punchedRate: number | null;
}

/** Group rows by any string field on the row.
 *
 *  `minRows` keeps a department of one off the top of a "worst late rate"
 *  ranking, where a single person having one bad morning reads as 100%.
 */
export function group(
  rows: AttRow[], key: 'department' | 'location' | 'grade' | 'designation' | 'manager',
  minRows = 1,
): GroupStat[] {
  const map = new Map<string, AttRow[]>();
  for (const r of rows) {
    const name = (r[key] || '').trim() || 'Not set';
    const list = map.get(name);
    if (list) list.push(r); else map.set(name, [r]);
  }
  return Array.from(map.entries())
    .map(([name, list]) => {
      const s = summarise(list);
      return {
        name,
        rows: s.rows,
        people: s.people,
        punched: s.punched,
        late: s.late,
        afterCutoff: s.afterCutoff,
        unswiped: s.unswiped,
        earlyOut: s.earlyOut,
        noRecord: s.noRecord,
        absent: s.absent,
        avgWorked: s.avgWorked,
        // Lateness is quoted against the days somebody actually turned up.
        // Against every row it only measures how many blanks a team has.
        lateRate: rate(s.late, s.punched),
        punchedRate: s.punchedRate,
      };
    })
    .filter(g => g.rows >= minRows)
    .sort((a, b) => b.rows - a.rows);
}

// ── Per person, over a range ────────────────────────────────────────────────

export interface PersonStat {
  code: string;
  name: string;
  designation: string;
  grade: string;
  department: string;
  location: string;
  days: number;
  punched: number;
  late: number;
  afterCutoff: number;
  unswiped: number;
  noRecord: number;
  absent: number;
  earlyOut: number;
  avgWorked: number | null;
  avgArrival: number | null;
  lateRate: number | null;
}

export function byPerson(rows: AttRow[]): PersonStat[] {
  const map = new Map<string, AttRow[]>();
  for (const r of rows) {
    const list = map.get(r.code);
    if (list) list.push(r); else map.set(r.code, [r]);
  }
  return Array.from(map.entries()).map(([code, list]) => {
    const s = summarise(list);
    const first = list[0];
    return {
      code,
      name: first.name,
      designation: list.find(r => r.designation)?.designation || '',
      grade: list.find(r => r.grade)?.grade || '',
      department: list.find(r => r.department)?.department || '',
      location: list.find(r => r.location)?.location || '',
      days: list.length,
      punched: s.punched,
      late: s.late,
      afterCutoff: s.afterCutoff,
      unswiped: s.unswiped,
      noRecord: s.noRecord,
      absent: s.absent,
      earlyOut: s.earlyOut,
      avgWorked: s.avgWorked,
      avgArrival: mean(list.map(r => clockMins(r.inTime)).filter((m): m is number => m != null)),
      lateRate: rate(s.late, s.punched),
    };
  });
}

/** People worth a conversation, worst first.
 *
 *  Ranked by COUNT and not by rate: somebody late four mornings out of five
 *  is a conversation, somebody late once in their only recorded day is a
 *  rounding error with a 100% rate. `minCount` keeps the one-offs out.
 */
export function repeatOffenders(
  people: PersonStat[], field: 'late' | 'afterCutoff' | 'unswiped' | 'earlyOut' | 'absent',
  minCount = 2,
): PersonStat[] {
  return people
    .filter(p => p[field] >= minCount)
    .sort((a, b) => b[field] - a[field]
      || (b.lateRate ?? 0) - (a.lateRate ?? 0)
      || a.name.localeCompare(b.name));
}

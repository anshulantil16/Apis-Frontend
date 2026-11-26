/* Attendance — calls the `attendance` Django app, which reads Pocket HRMS
   live. Nothing is uploaded and nothing is stored: every figure on screen
   came from HRMS within the last ten minutes.

   The row shape below is produced by the backend's `normalise()`, not by the
   vendor. Everything derived about a row is derived there, once, so a number
   on a card, in the table and in the CSV cannot disagree. */
import { apiFetch } from '../portal/session';
import { apiBase } from '../../apiBase';

const ATT_API = `${apiBase()}/api/attendance`;

/** Mutually-exclusive-ish markers the server puts on each row.
 *  - `noRecord`    HRMS returned a row with nothing in it. NOT an absence:
 *                  it is the default state of every employee-day. What the
 *                  blank MEANT comes from the day-detail feed's status.
 *  - `unswiped`    a punch was never made, so no duration can be trusted.
 *  - `late`        HRMS's own LateTime, measured against that person's SHIFT.
 *  - `afterCutoff` in-punch after the company clock cutoff (11:00).
 *                  `late` and `afterCutoff` answer different questions and
 *                  routinely disagree — 502 vs 49 on one real two-day sample. */
export type AttFlag =
  | 'present' | 'noRecord' | 'unswiped' | 'late' | 'afterCutoff'
  | 'earlyOut' | 'holiday' | 'optionalHoliday' | 'sunday'
  /* What the day WAS. These come from HRMS's own `Status` column now, per
     employee, rather than being inferred here from the weekday and a
     state-wise holiday calendar — see `statusSource` on the row. */
  | 'absent' | 'weekOff' | 'notYet'
  /* What was applied for, which is the only thing separating an absence
     somebody arranged from one nobody knows about. HRMS's Status says
     `Absent` for an approved full-day leave, so these are not decoration. */
  | 'applied' | 'leave' | 'halfDay' | 'onDuty' | 'regularised'
  /* An absence with no application against it. Still NOT proof of anything:
     most leave here is never applied for in Pocket HRMS. */
  | 'absentUnexplained'
  /* Punched in on their own week off or holiday. Invisible before: the day
     was filed under "nobody was meant to be here" and the punch with it. */
  | 'workedOnOff';

export interface AttRow {
  code: string;
  name: string;
  designation: string;
  grade: string;
  date: string;            // ISO
  inTime: string;          // '' when there is no real time
  outTime: string;
  inUnswiped: boolean;
  outUnswiped: boolean;
  earlyMins: number | null;
  lateMins: number | null;
  workedMins: number | null;   // null on an unswiped day — never guessed
  normalMins: number | null;
  noRecord: boolean;
  flags: AttFlag[];

  /* ── From the day-detail feed (GetAttendance), merged on by code+date ──
     All optional: an older backend, or a failed second fetch, simply leaves
     them off and the screen falls back to what it always showed. */

  /** HRMS's own words, e.g. 'Present/Week Off/Holiday'. It is a SET joined
   *  with slashes, not one word — never compare it whole. */
  status?: string;
  /** 'hrms' when HRMS stated the day, 'derived' when it was inferred here
   *  from the weekday and the holiday calendar. */
  statusSource?: 'hrms' | 'derived';
  shift?: string;
  shiftTime?: string;
  /** 'PL' | 'CL' | 'SL' | 'OD' | 'COFF' | … — raw, as HRMS spells it. */
  applyCode?: string;
  /** 'Privilege leave', or the bare code where the expansion is unconfirmed. */
  applyLabel?: string;
  applySpan?: '' | 'full' | 'firstHalf' | 'secondHalf';
  applySpanLabel?: string;
  applyRemarks?: string;
  applyApproved?: boolean;
  applyApprover?: string;
  /** HRMS's reporting manager, which is not always the directory's. */
  hrmsManager?: string;
  hrmsManagerCode?: string;
  checkInPlace?: string;
  checkOutPlace?: string;
  /** A running balance that CAN be negative — 112 of 9,732 rows were. */
  leaveBalance?: number | null;
  countedDay?: boolean;
  /* Joined on from the portal directory — the HRMS feed carries none of it. */
  department: string;
  location: string;
  manager: string;
  offDirectory: boolean;
}

/** Who counts as head office. Matched on the employee CODE, not the
 *  directory's location column: 83 people carry an HO code but only 40 have
 *  location 'DELHI-HO', and location 'DELHI' is mostly field sales. */
export interface HomeOffice {
  label: string;
  /** Several, because one was not enough — NA0001–NA0007 are in the HRMS
   *  feed, have never been in the portal directory, and were being dropped
   *  from the default view entirely. */
  codePrefixes?: string[];
  /** Kept for older bundles; prefer codePrefixes. */
  codePrefix: string;
}

export interface AttMeta {
  ready: boolean;
  reason: string;
  today: string;
  lateCutoff: string;
  maxSpanDays: number;
  maxTotalDays: number;
  locations: string[];
  departments: string[];
  directorySize: number;
  overtimeTracked: boolean;
  homeOffice: HomeOffice;
  /** Whether this backend reads the day-detail feed at all. */
  dayDetail?: boolean;
  /** Leave code -> label, for anything that wants to name one up front. */
  leaveTypes?: Record<string, string>;
}

export interface AttRecords {
  from: string;
  to: string;
  days: number;
  rows: AttRow[];
  count: number;
  truncated: boolean;
  lateCutoff: string;
  holidays: Record<string, { optional: boolean; locations: string[] }>;
  overtimeTracked: boolean;
  homeOffice: HomeOffice;
  /** False when the day-detail feed could not be read for THIS fetch: every
   *  row's statusSource is then 'derived' and the screen says so. */
  dayDetail?: boolean;
  fetchedAt: string;
}

async function read<T>(res: Response, fallback: string): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || fallback);
  return body as T;
}

export async function fetchAttMeta(): Promise<AttMeta> {
  return read(await apiFetch(`${ATT_API}/meta/`), 'Could not load the attendance tool.');
}

export async function fetchAttRecords(
  from: string, to: string, opts: { code?: string; refresh?: boolean } = {},
): Promise<AttRecords> {
  const q = new URLSearchParams({ from, to });
  if (opts.code) q.set('code', opts.code);
  if (opts.refresh) q.set('refresh', '1');
  return read(await apiFetch(`${ATT_API}/records/?${q}`), 'Could not fetch attendance.');
}

/** 513 -> '8h 33m'. Blank for null, which is what an unswiped day carries. */
export function hours(mins: number | null): string {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** 25 -> '25m'; 95 -> '1h 35m'. For the early/late durations. */
export function dur(mins: number | null): string {
  return mins == null || mins === 0 ? '—' : hours(mins);
}

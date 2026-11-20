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
 *                  the feed has no leave or week-off marker at all.
 *  - `unswiped`    a punch was never made, so no duration can be trusted.
 *  - `late`        HRMS's own LateTime, measured against that person's SHIFT.
 *  - `afterCutoff` in-punch after the company clock cutoff (11:00).
 *                  `late` and `afterCutoff` answer different questions and
 *                  routinely disagree — 502 vs 49 on one real two-day sample. */
export type AttFlag =
  | 'present' | 'noRecord' | 'unswiped' | 'late' | 'afterCutoff'
  | 'earlyOut' | 'holiday' | 'optionalHoliday' | 'sunday';

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
  /* Joined on from the portal directory — the HRMS feed carries none of it. */
  department: string;
  location: string;
  manager: string;
  offDirectory: boolean;
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

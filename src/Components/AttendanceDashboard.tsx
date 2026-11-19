import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Users, UserCheck, CalendarOff, Coffee, CheckSquare, Search,
  Download, MapPin, User, Clock, ChevronDown, ChevronUp, SlidersHorizontal,
  AlertTriangle, Timer, Navigation, Camera, Filter, X, ScanFace,
} from 'lucide-react';
import { TOOL_STYLES } from './toolStyles';
import { checkMany, checkViaServer, type PhotoStat } from './photoCheck';
import { renderSheet, downloadBlob, safeFileName, MAX_ROWS, type ShareRow } from './shareSheet';
import { apiFetch } from '../features/portal/session';
import { apiBase } from '../apiBase';

/* ── Reading the BIZOM export ──────────────────────────────────────────── */

const getImageUrl = (html: string): string => {
  if (!html) return '';
  const t = html.trim();
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  const s = t.match(/src\s*=\s*['"]([^'"]+)['"]/i);
  if (s) return s[1];
  const h = t.match(/href\s*=\s*['"]([^'"]+)['"]/i);
  return h ? h[1] : '';
};

type LatLng = [number, number];

/* BIZOM writes both punch locations as "lat,lng". An auto-closed day often
   carries a bare "," instead, which is why this returns null rather than
   [0, 0] -- 0,0 is a point in the Gulf of Guinea, and treating it as a
   coordinate puts a 6,000 km journey on somebody's card. */
const parseLatLng = (s: string): LatLng | null => {
  const m = (s || '').trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = +m[1], lng = +m[2];
  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return [lat, lng];
};

/* Great-circle distance between the two punches.

   This is the straight line from where the day started to where it was
   closed -- NOT the distance travelled. Somebody who worked a loop and came
   back to where they began covers a lot of ground and scores nearly zero
   here, and the UI says "start -> EOD" everywhere rather than "travelled",
   because the file gives two points and no track. */
const haversineKm = (a: LatLng, b: LatLng): number => {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2
          + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const mapsLink = (p: LatLng) =>
  `https://www.google.com/maps/search/?api=1&query=${p[0]},${p[1]}`;

const routeLink = (a: LatLng, b: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&origin=${a[0]},${a[1]}&destination=${b[0]},${b[1]}`;

const fmtKm = (km: number): string =>
  km < 0 ? '—' : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

/* BIZOM punches arrive as HH:MM or HH:MM:SS. -> minutes past midnight, or
   -1 for anything that is not a real time (blank, "unswipe", "0"). */
const toMinutes = (t: string): number => {
  const m = (t || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return -1;
  const h = +m[1], mi = +m[2];
  return h > 23 || mi > 59 ? -1 : h * 60 + mi;
};

const isValidTime = (t: string): boolean => {
  if (!t || !t.trim()) return false;
  const l = t.trim().toLowerCase();
  if (l.includes('unswipe') || l === '—' || l === '-' || l === 'n/a') return false;
  if (/^0+[:h]0*/.test(l)) return false;
  return /\d:\d/.test(l);
};

/* BIZOM closes a day nobody closed by stamping 23:59. It is not when the
   person stopped working -- it is the system giving up on them -- so these
   rows are flagged, and neither the hours nor the EOD-compliance figure may
   be computed from one. */
const AUTO_EOD_MINS = 23 * 60 + 59;
const isAutoEod = (r: { eodTime: string }) => toMinutes(r.eodTime) >= AUTO_EOD_MINS;

/* Hours worked, from the two punches. Nothing is returned unless both are
   real and the day closed properly: a 23:59 auto-close would read as a
   fifteen-hour day and drag every average with it. */
const workedMinutes = (r: { attendanceTime: string; eodTime: string }): number => {
  if (isAutoEod(r)) return 0;
  const a = toMinutes(r.attendanceTime), b = toMinutes(r.eodTime);
  return a === -1 || b === -1 || b <= a ? 0 : b - a;
};

const fmtHM = (mins: number): string =>
  mins > 0 ? `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m` : '—';

/* What the leave was. The BIZOM export writes it free-text and the spelling
   is theirs -- "Causal Leave" is in the live file -- so it is shown as sent
   rather than mapped to a code list that would quietly drop the unknowns. */
const leaveLabel = (r: { leaveDetails: string; attendance: string }): string => {
  const raw = (r.leaveDetails || '').trim();
  if (raw) return raw.replace(/\s+/g, ' ');
  return (r.attendance || '').trim() || 'Leave';
};

/* ── What kind of day it was ───────────────────────────────────────────── */

type Cat = 'present' | 'late' | 'leave' | 'wo' | 'other';

const hasLeave = (r: AttendanceRecord) =>
  r.attendance.toLowerCase().includes('leave') || r.attendance.toLowerCase() === 'l'
  || r.leaveDetails.trim() !== '';
const hasWO = (r: AttendanceRecord) => {
  const a = r.attendance.toLowerCase();
  return a.includes('wo') || a.includes('weekly') || a.includes('off');
};
const hasLate = (r: AttendanceRecord) =>
  r.attendance.toLowerCase().includes('late') || r.presentType.toLowerCase().includes('late');
const hasPresent = (r: AttendanceRecord) => {
  const a = r.attendance.toLowerCase(), t = r.presentType.toLowerCase();
  return a.includes('present') || t.includes('present') || a === 'p';
};

/* One answer per row, decided in one place.

   Order is the whole of it. Late beats present, because BIZOM writes "late"
   in the same column and a late day was still worked. Present beats leave,
   because a half day carries both a punch and a leave note and reading it as
   leave hides the punch that was made. */
const category = (r: AttendanceRecord): Cat => {
  if (hasWO(r)) return 'wo';
  if (hasLate(r)) return 'late';
  if (hasPresent(r)) return 'present';
  if (hasLeave(r)) return 'leave';
  return 'other';
};

const missingPunch = (r: AttendanceRecord): 'no_out' | 'no_in' | null => {
  const hasIn = isValidTime(r.attendanceTime), hasOut = isValidTime(r.eodTime);
  if (hasIn && !hasOut) return 'no_out';
  if (!hasIn && hasOut) return 'no_in';
  return null;
};

/* Two punches within this of each other means the day started and finished
   in the same place. For a field role that is worth a look -- it is a GPS
   fix, not a confession, so it is a flag to review and never a verdict. */
const NO_MOVE_KM = 0.2;

interface AttendanceRecord {
  zone: string; subzone: string; reportingTo: string; status: string;
  attendance: string; attendanceTime: string; attendanceImage: string;
  presentType: string; eodTime: string; location: string; userType: string;
  userName: string; userId: string; empId: string; designation: string;
  leaveDetails: string; forDate: string; eodLocation: string; beat: string;
  raw: Record<string, unknown>;
}

/* `badPhoto` is the odd one out: every other flag is decided from the row
   itself, but that one needs the image fetched and inspected, so it lives
   outside `Row.flags` and is answered by the scan results. */
type FlagKey = 'present' | 'late' | 'leave' | 'wo' | 'eodDone' | 'autoEod'
             | 'invalidPunch' | 'noMove' | 'noEodLoc' | 'noPhoto'
             | 'badPhoto' | 'noPerson';

interface Row extends AttendanceRecord {
  cat: Cat;
  worked: boolean;          // the day was worked, so punches are expected
  auto: boolean;            // closed at 23:59 by the system
  mp: 'no_out' | 'no_in' | null;
  workedMin: number;
  km: number;               // -1 when either end has no usable coordinate
  from: LatLng | null;
  to: LatLng | null;
  flags: Set<FlagKey>;
}

/* Everything derived about a row, computed once. The counts, the filters,
   the cards and the CSV all read these, so a figure on screen and a figure
   in the export cannot disagree. */
const enrich = (r: AttendanceRecord): Row => {
  const cat = category(r);
  const worked = cat === 'present' || cat === 'late';
  const auto = worked && isAutoEod(r);
  // Somebody on leave or on a weekly off has nothing to punch. Reading their
  // blank row as a missing punch put people on approved leave onto the
  // exceptions list every single day.
  const mp = worked ? missingPunch(r) : null;
  const workedMin = worked ? workedMinutes(r) : 0;
  const from = parseLatLng(r.location), to = parseLatLng(r.eodLocation);
  const km = worked && from && to ? haversineKm(from, to) : -1;

  const flags = new Set<FlagKey>();
  if (cat === 'present') flags.add('present');
  if (cat === 'late') flags.add('late');
  if (cat === 'leave') flags.add('leave');
  if (cat === 'wo') flags.add('wo');
  if (auto) flags.add('autoEod');
  else if (worked && isValidTime(r.eodTime)) flags.add('eodDone');
  if (mp) flags.add('invalidPunch');
  if (km >= 0 && km < NO_MOVE_KM) flags.add('noMove');
  if (worked && isValidTime(r.eodTime) && !to) flags.add('noEodLoc');
  if (worked && !r.attendanceImage) flags.add('noPhoto');

  return { ...r, cat, worked, auto, mp, workedMin, km, from, to, flags };
};

const CAT_CHIP: Record<Cat, { label: string; cls: string }> = {
  present: { label: 'Present', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  late:    { label: 'Late',    cls: 'bg-amber-50 text-amber-700 border-amber-300'       },
  leave:   { label: 'Leave',   cls: 'bg-rose-50 text-rose-700 border-rose-200'          },
  wo:      { label: 'W/Off',   cls: 'bg-sky-50 text-sky-700 border-sky-200'             },
  other:   { label: '',        cls: 'bg-slate-50 text-slate-600 border-slate-200'       },
};

/* What a day can be grouped by. Offered only when the column is actually in
   the file: the BIZOM export carries Zone and Beat but no Sub Zone, manager,
   user type or designation, so those four sat in the dropdown answering
   "Not Assigned, everybody" and looked broken. */
const GROUP_FIELDS: { key: keyof AttendanceRecord; label: string }[] = [
  { key: 'zone',        label: 'Zone' },
  { key: 'subzone',     label: 'Sub Zone' },
  { key: 'reportingTo', label: 'Reporting Manager' },
  { key: 'beat',        label: 'Beat' },
  { key: 'userType',    label: 'User Type' },
  { key: 'designation', label: 'Designation' },
  { key: 'forDate',     label: 'Date' },
];

/* Natural order, so GTR2 sorts before GTR10 rather than after it, and so
   the list reads the way somebody scanning for their own zone expects. */
const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare;

/* The exceptions that do not get a card of their own. Each is a filter. */
const EXCEPTIONS: { key: FlagKey; label: string; hint: string }[] = [
  { key: 'noMove',   label: 'No movement',     hint: `Start and EOD within ${NO_MOVE_KM * 1000} m` },
  { key: 'noEodLoc', label: 'No EOD location', hint: 'Day closed with no coordinates' },
  { key: 'noPhoto',  label: 'No photo',        hint: 'Worked with no attendance photo' },
];

export function AttendanceDashboard({ rawData }: { rawData: unknown[] }) {
  const normalized = useMemo<Row[]>(() => {
    if (!rawData?.length) return [];
    return (rawData as Record<string, unknown>[]).map(row => {
      const keys = Object.keys(row);
      const norm = (v: string) => v.toLowerCase().replace(/[\s_-]/g, '');
      /* An exact column name wins before any partial match. "EOD_Location"
         contains "eod", so a loose-only pass answers get('eod') with the
         location the moment that column comes first in the sheet. */
      const get = (...patterns: string[]): string => {
        const want = patterns.map(norm);
        const k = keys.find(c => want.includes(norm(c)))
               ?? keys.find(c => {
                    const lk = norm(c);
                    return want.some(p => (p === 'attendance' ? lk === p : lk.includes(p)));
                  });
        return k ? String(row[k] ?? '').trim() : '';
      };
      return enrich({
        zone: get('zone'), subzone: get('subzone', 'sub zone'),
        reportingTo: get('reporting to', 'reporting manager', 'reportingto', 'manager'),
        status: get('status'), attendance: get('attendance'),
        attendanceTime: get('attendance time', 'attendancetime'),
        attendanceImage: getImageUrl(get('attendance image', 'attendanceimage', 'image', 'photo')),
        presentType: get('present type', 'presenttype'),
        eodTime: get('eod time', 'eodtime', 'eod'),
        location: get('location', 'state', 'hq', 'district'),
        userType: get('user type', 'usertype'),
        userName: get('user name', 'username', 'employee name', 'name'),
        userId: get('user id', 'userid'),
        empId: get('emp id', 'empid', 'employee code', 'emp code'),
        designation: get('designation'),
        leaveDetails: get('leave details', 'leavedetails'),
        forDate: get('for date', 'date'),
        eodLocation: get('eod location', 'eodlocation'),
        beat: get('beat name', 'beatname', 'beat'),
        raw: row,
      });
    });
  }, [rawData]);

  const uniqueDates = useMemo(() => {
    const s = new Set<string>();
    normalized.forEach(r => r.forDate && s.add(r.forDate));
    return Array.from(s).sort();
  }, [normalized]);

  const [selectedDate, setSelectedDate] = useState(() => uniqueDates[0] || '');
  const [groupBy, setGroupBy] = useState<keyof AttendanceRecord>('zone');
  const [groupValue, setGroupValue] = useState('');   // '' = every group
  const [sortBy, setSortBy] = useState<'name' | 'size'>('name');
  const [search, setSearch] = useState('');

  /* Only the columns this file actually carries. */
  const groupOptions = useMemo(
    () => GROUP_FIELDS.filter(f => normalized.some(r => String(r[f.key] || '').trim() !== '')),
    [normalized]);

  // A file with no Zone column must not leave the dropdown pointing at one.
  useEffect(() => {
    if (groupOptions.length && !groupOptions.some(o => o.key === groupBy)) {
      setGroupBy(groupOptions[0].key);
    }
  }, [groupOptions, groupBy]);
  const [flags, setFlags] = useState<Set<FlagKey>>(() => new Set());
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  /* The photo scan. Keyed by image URL rather than by row, because the same
     photo can appear on more than one row and fetching it twice is wasted.
     It is started by a button and never on load: a day is six hundred
     images, and nobody asked for that the moment they opened a file. */
  const [photos, setPhotos] = useState<Record<string, PhotoStat>>({});
  const [scan, setScan] = useState<{ running: boolean; done: number; total: number }>(
    { running: false, done: 0, total: 0 });
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; }, []);
  // A new file is a new set of photos; keeping the old verdicts would label
  // rows from a report nobody is looking at any more.
  useEffect(() => { setPhotos({}); setScan({ running: false, done: 0, total: 0 }); }, [rawData]);

  /* Two stages, deliberately.

     `scoped` is the day being looked at. Every count on every card comes
     from here, so the cards keep saying what the day holds after one of
     them has been clicked -- read them off the filtered set instead and
     clicking "Auto EOD" zeroes every other card, leaving nothing to click
     next. `shown` is what the table actually lists. */
  const dated = useMemo(() => normalized.filter(r => {
    if (selectedDate && r.forDate !== selectedDate) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.userName.toLowerCase().includes(q) || r.reportingTo.toLowerCase().includes(q) ||
             r.empId.toLowerCase().includes(q) || r.zone.toLowerCase().includes(q) ||
             r.subzone.toLowerCase().includes(q) || r.beat.toLowerCase().includes(q) ||
             r.location.toLowerCase().includes(q);
    }
    return true;
  }), [normalized, selectedDate, search]);

  /* Every value of the current grouping, for the "which one" dropdown. Read
     from `dated` rather than from `scoped`, or choosing a zone empties the
     list that offers the zones. */
  const groupValues = useMemo(() => {
    const s = new Set<string>();
    dated.forEach(r => { const v = String(r[groupBy] || '').trim(); if (v) s.add(v); });
    return [...s].sort(byName);
  }, [dated, groupBy]);

  // Changing what we group by invalidates the value picked under the old one.
  useEffect(() => { setGroupValue(''); }, [groupBy]);

  /* Picking one zone narrows the cards too, not only the table: "show me
     this zone" means the whole screen, otherwise the numbers above describe
     a day the table below is not showing. */
  const scoped = useMemo(() => {
    if (!groupValue) return dated;
    return dated.filter(r => String(r[groupBy] || '').trim() === groupValue);
  }, [dated, groupBy, groupValue]);

  /* Several flags at once mean "any of these", not "all of these". The four
     status flags are mutually exclusive, so an all-of rule would answer
     nothing the moment somebody clicked Present and Late together -- which
     is exactly the pair worth looking at side by side. */
  const photoOf = (r: Row) => r.attendanceImage ? photos[r.attendanceImage] : undefined;
  const isBadPhoto = (r: Row) => photoOf(r)?.verdict === 'blank';
  const isNoPerson = (r: Row) => photoOf(r)?.verdict === 'no_person';
  const holds = (r: Row, f: FlagKey) =>
    f === 'badPhoto' ? isBadPhoto(r)
    : f === 'noPerson' ? isNoPerson(r)
    : r.flags.has(f);

  const shown = useMemo(() => {
    if (!flags.size) return scoped;
    const want = [...flags];
    return scoped.filter(r => want.some(f => holds(r, f)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, flags, photos]);

  const toggleFlag = (k: FlagKey) => setFlags(p => {
    const n = new Set(p);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });

  const count = (k: FlagKey) => scoped.reduce((n, r) => n + (holds(r, k) ? 1 : 0), 0);

  /* The server does the looking. It has to: BIZOM's image host sends no
     CORS header, so the browser can display these photos and cannot read a
     single pixel of one. The in-page check is kept only for a backend too
     old to have the endpoint. */
  const scanPhotos = async () => {
    const urls = [...new Set(scoped.map(r => r.attendanceImage).filter(Boolean))]
      .filter(u => !photos[u]);
    if (!urls.length || scan.running) return;
    stop.current = false;
    setScan({ running: true, done: 0, total: urls.length });
    try {
      const got = await checkViaServer(urls, body =>
        apiFetch(`${apiBase()}/api/user_management/photo-check/`, { method: 'POST', body }));
      if (!stop.current) {
        setPhotos(p => ({ ...p, ...got }));
        setScan(s => ({ ...s, done: Object.keys(got).length }));
      }
    } catch {
      await checkMany(urls, (url, stat) => {
        setPhotos(p => ({ ...p, [url]: stat }));
        setScan(s => ({ ...s, done: s.done + 1 }));
      }, { stopped: () => stop.current });
    }
    setScan(s => ({ ...s, running: false }));
  };

  /* What the scan found, once it has run. `blocked` is the case that needs
     saying out loud: nothing is wrong with the photos, the host simply will
     not let the browser read them back. */
  const photoSummary = useMemo(() => {
    let checked = 0, blank = 0, noPerson = 0, blocked = 0;
    scoped.forEach(r => {
      const s = r.attendanceImage ? photos[r.attendanceImage] : undefined;
      if (!s) return;
      checked++;
      if (s.verdict === 'blank') blank++;
      else if (s.verdict === 'no_person') noPerson++;
      else if (s.verdict === 'unreadable') blocked++;
    });
    return { checked, blank, noPerson, blocked };
  }, [scoped, photos]);

  const kpi = useMemo(() => {
    let workMins = 0, workDays = 0, kmSum = 0, kmDays = 0;
    const leaveTypes: Record<string, number> = {};
    scoped.forEach(r => {
      if (r.cat === 'leave') {
        const k = leaveLabel(r);
        leaveTypes[k] = (leaveTypes[k] || 0) + 1;
      }
      if (r.workedMin > 0) { workMins += r.workedMin; workDays++; }
      if (r.km >= 0) { kmSum += r.km; kmDays++; }
    });
    const total = scoped.length;
    const present = count('present'), late = count('late');
    const leave = count('leave'), wo = count('wo');
    const eod = count('eodDone'), working = present + late;
    return {
      total, present, late, leave, wo, eod, working, leaveTypes,
      autoEod: count('autoEod'), invalidPunch: count('invalidPunch'),
      workDays, kmDays,
      avgWorkStr: fmtHM(workDays ? Math.round(workMins / workDays) : 0),
      avgKmStr: kmDays ? fmtKm(kmSum / kmDays) : '—',
      totalKm: kmSum,
      presentPct: total ? Math.round(present / total * 100) : 0,
      latePct:    total ? Math.round(late    / total * 100) : 0,
      leavePct:   total ? Math.round(leave   / total * 100) : 0,
      woPct:      total ? Math.round(wo      / total * 100) : 0,
      eodPct:     working ? Math.round(eod   / working * 100) : 0,
    };
  }, [scoped]);

  const grouped = useMemo(() => {
    const g: Record<string, {
      name: string; total: number; present: number; late: number; leave: number;
      wo: number; eod: number; invalidPunch: number; autoEod: number;
      workMins: number; workDays: number; kmSum: number; kmDays: number; records: Row[];
    }> = {};
    shown.forEach(r => {
      const key = String(r[groupBy] || 'Not Assigned').trim() || 'Not Assigned';
      if (!g[key]) g[key] = { name: key, total: 0, present: 0, late: 0, leave: 0, wo: 0,
                              eod: 0, invalidPunch: 0, autoEod: 0,
                              workMins: 0, workDays: 0, kmSum: 0, kmDays: 0, records: [] };
      const q = g[key];
      q.total++;
      if (r.cat === 'present') q.present++;
      else if (r.cat === 'late') q.late++;
      else if (r.cat === 'leave') q.leave++;
      else if (r.cat === 'wo') q.wo++;
      if (r.flags.has('eodDone')) q.eod++;
      if (r.auto) q.autoEod++;
      if (r.mp) q.invalidPunch++;
      if (r.workedMin > 0) { q.workMins += r.workedMin; q.workDays++; }
      if (r.km >= 0) { q.kmSum += r.km; q.kmDays++; }
      q.records.push(r);
    });
    return Object.values(g).map(q => {
      const working = q.present + q.late;
      return {
        ...q, working,
        workingPct: q.total ? Math.round(working / q.total * 100) : 0,
        eodPct: working ? Math.round(q.eod / working * 100) : 0,
        avgWorkStr: fmtHM(q.workDays ? Math.round(q.workMins / q.workDays) : 0),
        avgKmStr: q.kmDays ? fmtKm(q.kmSum / q.kmDays) : '—',
      };
    }).sort((a, b) => sortBy === 'size' ? b.total - a.total : byName(a.name, b.name));
  }, [shown, groupBy, sortBy]);

  const toggle = (name: string) => setExpandedGroups(p => ({ ...p, [name]: !p[name] }));

  /* ── Sending the exceptions to whoever can do something about them ──

     An HOD gets a message, not a login. So a group -- or one person -- can
     leave here as a JPG carrying the date, the names and what is wrong.

     The photos have to come from our own backend as data URIs: drawing a
     BIZOM-hosted image onto a canvas taints it and toBlob then refuses, so
     the sheet would not be produced at all. A face we cannot fetch becomes
     initials on a grey square, which is a gap, not a failure. */
  const [sheetFor, setSheetFor] = useState('');

  const asShareRow = (r: Row, thumbs: Record<string, string>): ShareRow => ({
    photo: r.attendanceImage ? thumbs[r.attendanceImage] : undefined,
    name: r.userName || r.empId || r.userId || 'Unknown',
    sub: [r.empId || r.userId, r.beat].filter(Boolean).join(' · '),
    status: CAT_CHIP[r.cat].label || r.attendance,
    facts: r.cat === 'leave'
      ? [leaveLabel(r)]
      : [
          [isValidTime(r.attendanceTime) ? r.attendanceTime : 'no in punch',
           isValidTime(r.eodTime) ? r.eodTime : 'no out punch'].join(' → '),
          r.workedMin > 0 ? fmtHM(r.workedMin) : '',
          r.km >= 0 ? fmtKm(r.km) : '',
        ].filter(Boolean),
    flags: [
      r.auto && 'Auto EOD',
      r.mp === 'no_out' && 'Missing out punch',
      r.mp === 'no_in' && 'Missing in punch',
      r.flags.has('noMove') && 'Same place all day',
      r.flags.has('noEodLoc') && 'No EOD location',
      r.flags.has('noPhoto') && 'No photo',
      isBadPhoto(r) && 'Blank photo',
      isNoPerson(r) && 'May not be a person',
    ].filter(Boolean) as string[],
  });

  const makeSheet = async (key: string, title: string, rows: Row[]) => {
    if (!rows.length || sheetFor) return;
    setSheetFor(key);
    try {
      let thumbs: Record<string, string> = {};
      // Only the rows the sheet will actually draw: renderSheet caps at
      // MAX_ROWS, and fetching a hundred faces to paint sixty is a hundred
      // image downloads for no picture.
      const urls = [...new Set(rows.slice(0, MAX_ROWS).map(r => r.attendanceImage).filter(Boolean))];
      if (urls.length) {
        try {
          const res = await apiFetch(`${apiBase()}/api/user_management/photo-thumbs/`,
            { method: 'POST', body: JSON.stringify({ urls: urls.slice(0, 120) }) });
          if (res.ok) thumbs = (await res.json())?.thumbs || {};
        } catch { /* initials instead of faces; the sheet still goes out */ }
      }
      // Says what the reader is looking at. With filters on it is the
      // exceptions; with none it is the whole group, and the sheet must not
      // imply otherwise.
      const what = activeLabels.length ? activeLabels.join(' or ') : 'Attendance';
      const blob = await renderSheet({
        title,
        subtitle: `${what} — ${rows.length} ${rows.length === 1 ? 'person' : 'people'}`,
        dateLabel: selectedDate || 'All dates',
        source: 'BIZOM field attendance',
        rows: rows.map(r => asShareRow(r, thumbs)),
      });
      downloadBlob(blob, safeFileName(title, what, selectedDate || 'all dates'));
    } finally {
      setSheetFor('');
    }
  };

  const download = (name: string, rows: (string | number)[][]) => {
    const csv = '\uFEFF' + rows.map(r =>
      r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => download(
    `Attendance_${groupBy}_${selectedDate || 'All'}.csv`,
    [['Group', 'Total', 'Present', 'Late', 'Leave', 'WO', 'Attendance %',
      'EOD Done', 'EOD %', 'Auto EOD', 'Invalid Punch', 'Avg Hours', 'Avg Start-EOD'],
     ...grouped.map(g => [g.name, g.total, g.present, g.late, g.leave, g.wo,
                          `${g.workingPct}%`, g.eod, `${g.eodPct}%`, g.autoEod,
                          g.invalidPunch, g.avgWorkStr, g.avgKmStr])]);

  /* The row-level export. The grouped one answers "how did the zone do";
     this one is what somebody takes away to ask a named person about a
     named day, so it carries the flags as words rather than as colours. */
  const exportDetailCSV = () => download(
    `Attendance_Detail_${selectedDate || 'All'}.csv`,
    [['Emp ID', 'Name', 'Designation', 'Zone', 'Sub Zone', 'Reporting To', 'Beat',
      'Date', 'Status', 'Leave Type', 'In', 'Out', 'Hours', 'Start-EOD',
      'Start Location', 'EOD Location', 'Exceptions'],
     ...shown.map(r => [
       r.empId || r.userId, r.userName, r.designation, r.zone, r.subzone, r.reportingTo, r.beat,
       r.forDate, CAT_CHIP[r.cat].label || r.attendance,
       r.cat === 'leave' ? leaveLabel(r) : '',
       r.cat === 'leave' ? '' : (isValidTime(r.attendanceTime) ? r.attendanceTime : ''),
       r.cat === 'leave' ? '' : (isValidTime(r.eodTime) ? r.eodTime : ''),
       r.workedMin > 0 ? fmtHM(r.workedMin) : '',
       r.km >= 0 ? fmtKm(r.km) : '',
       r.cat === 'leave' ? '' : r.location,
       r.cat === 'leave' ? '' : r.eodLocation,
       [r.auto && 'Auto EOD',
        r.mp === 'no_out' && 'Missing out punch',
        r.mp === 'no_in' && 'Missing in punch',
        r.flags.has('noMove') && 'No movement',
        r.flags.has('noEodLoc') && 'No EOD location',
        r.flags.has('noPhoto') && 'No photo',
        isBadPhoto(r) && `Blank photo (${photoOf(r)?.reason})`,
        isNoPerson(r) && 'May not be a person',
       ].filter(Boolean).join('; '),
     ])]);

  const cards: {
    label: string; value: string | number; sub: string; pct: number | null;
    icon: React.ComponentType<{ className?: string }>;
    iconCls: string; valCls: string; grad: string; ring: string; flag?: FlagKey;
  }[] = [
    { label: 'Total Active',  value: kpi.total,        sub: 'Rows for this day',         pct: null,           icon: Users,         iconCls: 'bg-slate-100 text-slate-600',     valCls: 'text-slate-800',   grad: 'from-white to-slate-50',      ring: 'border-slate-200' },
    { label: 'Present',       value: kpi.present,      sub: 'On time',                   pct: kpi.presentPct, icon: UserCheck,     iconCls: 'bg-emerald-100 text-emerald-600', valCls: 'text-emerald-700', grad: 'from-white to-emerald-50/60', ring: 'border-emerald-200', flag: 'present' },
    { label: 'Late',          value: kpi.late,         sub: 'Marked late by BIZOM',      pct: kpi.latePct,    icon: AlertTriangle, iconCls: 'bg-amber-100 text-amber-600',     valCls: 'text-amber-700',   grad: 'from-white to-amber-50/60',   ring: 'border-amber-300',   flag: 'late' },
    { label: 'On Leave',      value: kpi.leave,        sub: 'Approved leave',            pct: kpi.leavePct,   icon: CalendarOff,   iconCls: 'bg-rose-100 text-rose-600',       valCls: 'text-rose-700',    grad: 'from-white to-rose-50/60',    ring: 'border-rose-200',    flag: 'leave' },
    { label: 'Weekly Off',    value: kpi.wo,           sub: 'Rest day',                  pct: kpi.woPct,      icon: Coffee,        iconCls: 'bg-sky-100 text-sky-600',         valCls: 'text-sky-700',     grad: 'from-white to-sky-50/60',     ring: 'border-sky-200',     flag: 'wo' },
    { label: 'EOD Done',      value: kpi.eod,          sub: 'Of those who worked',       pct: kpi.eodPct,     icon: CheckSquare,   iconCls: 'bg-indigo-100 text-indigo-600',   valCls: 'text-indigo-700',  grad: 'from-white to-indigo-50/60',  ring: 'border-indigo-200',  flag: 'eodDone' },
    { label: 'Auto EOD',      value: kpi.autoEod,      sub: 'Closed at 23:59 by system', pct: null,           icon: Timer,         iconCls: 'bg-orange-100 text-orange-600',   valCls: 'text-orange-700',  grad: 'from-white to-orange-50/60',  ring: 'border-orange-300',  flag: 'autoEod' },
    { label: 'Invalid Punch', value: kpi.invalidPunch, sub: 'Missing in / out',          pct: null,           icon: AlertTriangle, iconCls: 'bg-red-100 text-red-600',         valCls: 'text-red-700',     grad: 'from-white to-red-50/60',     ring: 'border-red-200',     flag: 'invalidPunch' },
    { label: 'Avg Hours',     value: kpi.avgWorkStr,   sub: `${kpi.workDays} full days`, pct: null,           icon: Clock,         iconCls: 'bg-violet-100 text-violet-600',   valCls: 'text-violet-700',  grad: 'from-white to-violet-50/60',  ring: 'border-violet-200' },
    { label: 'Avg Start→EOD', value: kpi.avgKmStr,     sub: `${kpi.kmDays} with both pins`, pct: null,        icon: Navigation,    iconCls: 'bg-teal-100 text-teal-600',       valCls: 'text-teal-700',    grad: 'from-white to-teal-50/60',    ring: 'border-teal-200' },
  ];

  const activeLabels = cards.filter(c => c.flag && flags.has(c.flag)).map(c => c.label)
    .concat(EXCEPTIONS.filter(e => flags.has(e.key)).map(e => e.label))
    .concat(flags.has('badPhoto') ? ['Blank photo'] : [])
    .concat(flags.has('noPerson') ? ['May not be a person'] : []);

  return (
    <div className="space-y-5">
      <style>{TOOL_STYLES}</style>

      {/* ── Filters ── */}
      <div className="tp-reveal bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search employee, manager, zone, beat..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 placeholder-slate-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 min-w-fit flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {/* Only what this file carries — see GROUP_FIELDS. */}
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as keyof AttendanceRecord)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none cursor-pointer">
              {groupOptions.map(o => <option key={String(o.key)} value={String(o.key)}>{o.label}</option>)}
            </select>

            {/* Which one. Narrows the whole screen, cards included. */}
            {groupValues.length > 1 && (
              <select value={groupValue} onChange={e => setGroupValue(e.target.value)}
                className={`px-3 py-2.5 border rounded-xl text-sm font-bold focus:outline-none cursor-pointer max-w-56 ${
                  groupValue ? 'bg-amber-50 border-amber-300 text-amber-800'
                             : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <option value="">All ({groupValues.length})</option>
                {groupValues.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            )}

            <select value={sortBy} onChange={e => setSortBy(e.target.value as 'name' | 'size')}
              title="How the groups below are ordered"
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none cursor-pointer">
              <option value="name">A → Z</option>
              <option value="size">Most rows first</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          {uniqueDates.length > 0 && (
            <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none cursor-pointer">
              {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          <button onClick={exportDetailCSV} title="One row per employee, with every exception spelled out"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:border-amber-300 hover:text-amber-700 text-slate-600 font-bold text-xs rounded-xl transition-all">
            <Download className="w-3.5 h-3.5" /> Detail
          </button>
          <button onClick={exportCSV}
            className="tp-sheen flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/15 hover:scale-[1.02] active:scale-95 transition-all">
            <Download className="w-3.5 h-3.5" /> Summary
          </button>
        </div>
      </div>

      {/* ── KPI cards. The ones with a flag are filters: click to narrow,
           click again to let go. ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c, i) => {
          const on = !!c.flag && flags.has(c.flag);
          const Tag = c.flag ? 'button' : 'div';
          return (
            <Tag key={c.label}
              {...(c.flag ? { onClick: () => toggleFlag(c.flag!), type: 'button' as const,
                              'aria-pressed': on, title: `Show only: ${c.label}` } : {})}
              className={`tp-reveal tp-tilt text-left bg-gradient-to-br ${c.grad} rounded-2xl border p-4 shadow-sm transition-all duration-200 ${
                on ? `${c.ring} ring-2 ring-offset-1 ring-amber-400 shadow-lg`
                   : `${c.ring} hover:shadow-lg`
              } ${c.flag ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between mb-3">
                <div className={`tp-pop-in w-10 h-10 rounded-2xl flex items-center justify-center ${c.iconCls} shadow-sm`}>
                  <c.icon className="w-5 h-5" />
                </div>
                {c.pct !== null && (
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full bg-white/70 border ${c.ring} ${c.valCls}`}>{c.pct}%</span>
                )}
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{c.label}</p>
              <p className={`text-3xl font-black mt-0.5 ${c.valCls}`}>{c.value}</p>
              <p className="text-[11px] font-medium text-slate-400 mt-1">{c.sub}</p>
            </Tag>
          );
        })}
      </div>

      {/* ── Exceptions worth a look, each one a filter ── */}
      <div className="tp-reveal bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3.5 flex flex-wrap items-center gap-2" style={{ animationDelay: '80ms' }}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mr-1">
          <Filter className="w-3 h-3" /> Exceptions
        </span>
        {EXCEPTIONS.map(e => {
          const n = count(e.key), on = flags.has(e.key);
          return (
            <button key={e.key} type="button" onClick={() => toggleFlag(e.key)}
              aria-pressed={on} title={e.hint} disabled={n === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                on ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                   : n === 0 ? 'bg-slate-50 text-slate-300 border-slate-150 cursor-default'
                   : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700'
              }`}>
              {e.key === 'noMove' ? <Navigation className="w-3 h-3" />
               : e.key === 'noPhoto' ? <Camera className="w-3 h-3" />
               : <MapPin className="w-3 h-3" />}
              {e.label}
              <span className={`px-1.5 rounded font-black ${on ? 'bg-white/25' : 'bg-slate-100'}`}>{n}</span>
            </button>
          );
        })}

        {/* Photo check. A brightness-and-detail test, run on demand -- see
            photoCheck.ts for why it is not called face detection. */}
        {scan.running ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-xs font-bold text-amber-700">
            <ScanFace className="w-3 h-3 animate-pulse" />
            Checking photos… {scan.done} / {scan.total}
            <button type="button" onClick={() => { stop.current = true; }}
              className="ml-1 underline hover:no-underline">stop</button>
          </span>
        ) : photoSummary.checked === 0 ? (
          <button type="button" onClick={scanPhotos}
            title="Looks for blank, black or featureless photos. Not a face check."
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-amber-300 hover:text-amber-700 transition-all">
            <ScanFace className="w-3 h-3" /> Check photos
          </button>
        ) : (
          <>
            <button type="button" onClick={() => toggleFlag('badPhoto')}
              aria-pressed={flags.has('badPhoto')} disabled={photoSummary.blank === 0}
              title={`Black, washed out or featureless. ${photoSummary.checked} photos checked`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                flags.has('badPhoto') ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                : photoSummary.blank === 0 ? 'bg-slate-50 text-slate-300 border-slate-150 cursor-default'
                : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700'
              }`}>
              <ScanFace className="w-3 h-3" /> Blank photo
              <span className={`px-1.5 rounded font-black ${flags.has('badPhoto') ? 'bg-white/25' : 'bg-slate-100'}`}>
                {photoSummary.blank}
              </span>
            </button>
            {/* Kept apart from "blank" on purpose: there IS a picture here,
                it just does not appear to have anybody in it, and that is a
                hint rather than a finding. */}
            <button type="button" onClick={() => toggleFlag('noPerson')}
              aria-pressed={flags.has('noPerson')} disabled={photoSummary.noPerson === 0}
              title="A picture with no skin tone in it — an object, a wall, a screen. A colour test, not a face check: worth a look, not proof."
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                flags.has('noPerson') ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                : photoSummary.noPerson === 0 ? 'bg-slate-50 text-slate-300 border-slate-150 cursor-default'
                : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700'
              }`}>
              <ScanFace className="w-3 h-3" /> May not be a person
              <span className={`px-1.5 rounded font-black ${flags.has('noPerson') ? 'bg-white/25' : 'bg-slate-100'}`}>
                {photoSummary.noPerson}
              </span>
            </button>
            <button type="button" onClick={scanPhotos} title="Check any photos not looked at yet"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-400 hover:text-amber-700 hover:border-amber-300 transition-all">
              Re-check
            </button>
          </>
        )}
        {!scan.running && photoSummary.blocked > 0 && (
          <span className="text-[11px] font-semibold text-slate-400"
            title="The image host does not allow the browser to read these back">
            {photoSummary.blocked} could not be read
          </span>
        )}

        {flags.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] font-semibold text-slate-500">
              {shown.length} of {scoped.length} · {activeLabels.join(' or ')}
            </span>
            <button type="button" onClick={() => setFlags(new Set())}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:text-red-600 hover:border-red-200 transition-all">
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Leave breakdown ── Hidden when nobody is on leave: an empty card
           reads as broken rather than as good news. ── */}
      {Object.keys(kpi.leaveTypes).length > 0 && (
        <div className="tp-reveal bg-white p-4 rounded-2xl border border-slate-100 shadow-sm" style={{ animationDelay: '100ms' }}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
            <CalendarOff className="w-3 h-3" /> Leave types
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(kpi.leaveTypes).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
              <span key={t} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold bg-rose-50 text-rose-700 border-rose-200">
                {t} <span className="bg-white/70 px-1 rounded font-black">{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Summary table ── */}
      <div className="tp-reveal bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ animationDelay: '120ms' }}>
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800">By {groupBy.charAt(0).toUpperCase() + String(groupBy).slice(1)}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Click a row to expand employee records</p>
          </div>
          <span className="px-3 py-1.5 bg-amber-50 text-amber-700 font-bold text-xs rounded-full border border-amber-200">{grouped.length} groups</span>
        </div>

        {grouped.length === 0 ? (
          /* Reachable only by filtering everything out, so it says how to
             get back rather than just sitting there empty. */
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-bold text-slate-500">Nothing matches these filters.</p>
            <button type="button" onClick={() => { setFlags(new Set()); setGroupValue(''); }}
              className="mt-3 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-all">
              Clear filters
            </button>
          </div>
        ) : (
        /* overflow-y-hidden is load-bearing, not tidying. Per spec a
           non-visible overflow-x forces overflow-y to auto, so this wrapper
           quietly became a second vertical scrollbox -- and the tp-reveal
           cards inside it start 18px low and lift 4px on hover, which is
           enough to fill it. The page then had two vertical scrollbars side
           by side. Same class of bug as the bracket clipping in
           APIS_TREE.tsx. */
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                {/* Ten columns do not fit a laptop, and a table that must be
                    dragged sideways to reach its own headline figure is worse
                    than one that drops a column. The order here is the order
                    they go: detail first, the figures somebody came for last.
                    Every one of them is still in the CSV. */}
                {[
                  { h: 'Group',         cls: 'px-6 w-1/4 text-left' },
                  { h: 'Total',         cls: 'px-4 text-center' },
                  { h: 'Present',       cls: 'px-4 text-center' },
                  { h: 'Late',          cls: 'px-4 text-center' },
                  { h: 'Leave',         cls: 'px-4 text-center hidden sm:table-cell' },
                  { h: 'WO',            cls: 'px-4 text-center hidden md:table-cell' },
                  { h: 'EOD Done',      cls: 'px-4 text-center hidden lg:table-cell' },
                  { h: 'Avg Hrs',       cls: 'px-4 text-center hidden xl:table-cell' },
                  { h: 'Avg Start→EOD', cls: 'px-4 text-center hidden xl:table-cell' },
                  { h: 'Attendance %',  cls: 'px-6 text-right' },
                ].map(c => (
                  <th key={c.h} className={`py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider ${c.cls}`}>{c.h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {grouped.map(grp => {
                const open = !!expandedGroups[grp.name];
                return (
                  <React.Fragment key={grp.name}>
                    <tr onClick={() => toggle(grp.name)} className="hover:bg-slate-50/60 cursor-pointer transition-colors group">
                      <td className="px-6 py-3.5 flex items-center gap-2 font-bold text-slate-700 flex-wrap">
                        {open ? <ChevronUp className="w-3.5 h-3.5 text-amber-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-400 transition-colors" />}
                        <span className="group-hover:text-amber-700 transition-colors text-sm">{grp.name}</span>
                        {grp.invalidPunch > 0 && (
                          <span className="flex items-center gap-1 text-[11px] font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> {grp.invalidPunch} invalid
                          </span>
                        )}
                        {grp.autoEod > 0 && (
                          <span className="flex items-center gap-1 text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                            <Timer className="w-3 h-3" /> {grp.autoEod} auto EOD
                          </span>
                        )}
                        {/* The whole group as one picture, to forward to
                            whoever owns it. stopPropagation or the click
                            also collapses the row under the button. */}
                        <button type="button" disabled={!!sheetFor}
                          onClick={e => { e.stopPropagation(); makeSheet(grp.name, grp.name, grp.records); }}
                          title={`Download ${grp.name} as a JPG to share`}
                          className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-amber-700 border border-slate-200 hover:border-amber-300 px-2 py-0.5 rounded-full transition-all disabled:opacity-40">
                          <Download className="w-3 h-3" />
                          {sheetFor === grp.name ? 'Making…' : 'JPG'}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600 font-semibold text-sm">{grp.total}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{grp.present}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${grp.late > 0 ? 'text-amber-700 bg-amber-50' : 'text-slate-300 bg-slate-50'}`}>{grp.late}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${grp.leave > 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-300 bg-slate-50'}`}>{grp.leave}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center hidden md:table-cell">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${grp.wo > 0 ? 'text-sky-600 bg-sky-50' : 'text-slate-300 bg-slate-50'}`}>{grp.wo}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${grp.eodPct >= 80 ? 'text-indigo-600 bg-indigo-50' : grp.eod > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-300 bg-slate-50'}`}>{grp.eod} ({grp.eodPct}%)</span>
                      </td>
                      <td className="px-4 py-3.5 text-center hidden xl:table-cell">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${grp.workDays ? 'text-violet-700 bg-violet-50' : 'text-slate-300 bg-slate-50'}`}>{grp.avgWorkStr}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center hidden xl:table-cell">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${grp.kmDays ? 'text-teal-700 bg-teal-50' : 'text-slate-300 bg-slate-50'}`}>{grp.avgKmStr}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-sm font-black ${grp.workingPct >= 80 ? 'text-emerald-600' : grp.workingPct >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{grp.workingPct}%</span>
                          <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${grp.workingPct >= 80 ? 'bg-emerald-500' : grp.workingPct >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${grp.workingPct}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>

                    {open && (
                      <tr>
                        <td colSpan={10} className="px-6 py-4 bg-slate-50/50">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                            {grp.name} · {grp.records.length} employees
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                            {grp.records.map((rec, i) => {
                              const leave = rec.cat === 'leave';
                              const chip = CAT_CHIP[rec.cat];
                              return (
                                <div key={i} className={`tp-reveal tp-tilt bg-white rounded-xl border p-4 flex gap-3 hover:shadow-md transition-all ${
                                  rec.mp      ? 'border-red-300 bg-red-50/40 ring-1 ring-red-200'
                                  : rec.auto  ? 'border-orange-300 bg-orange-50/40 ring-1 ring-orange-200'
                                  : 'border-slate-150 hover:border-slate-200'
                                }`} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                                  {rec.attendanceImage && (
                                    <a href={rec.attendanceImage} target="_blank" rel="noopener noreferrer"
                                      title={photoOf(rec)?.reason}
                                      className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border shadow-sm ${
                                        isBadPhoto(rec) ? 'border-amber-400 ring-2 ring-amber-300'
                                        : isNoPerson(rec) ? 'border-yellow-300 ring-2 ring-yellow-200'
                                        : 'border-slate-100'
                                      }`}>
                                      <img src={rec.attendanceImage} alt={rec.userName} className="w-full h-full object-cover" />
                                    </a>
                                  )}
                                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate">{rec.userName}</p>
                                        <p className="text-[11px] text-slate-400 font-semibold">{rec.empId || rec.userId || '—'}</p>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-lg border ${chip.cls}`}>
                                          {chip.label || rec.attendance || '?'}
                                        </span>
                                        {/* This one person, on their own, for
                                            a message to their manager. */}
                                        <button type="button" disabled={!!sheetFor}
                                          onClick={() => makeSheet(`one-${grp.name}-${i}`, rec.userName || 'Employee', [rec])}
                                          title="Download this person as a JPG to share"
                                          className="p-1 rounded-lg text-slate-300 hover:text-amber-600 hover:bg-amber-50 transition-all disabled:opacity-40">
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {rec.beat && (
                                      <p className="text-[11px] text-slate-400 font-semibold truncate" title={rec.beat}>{rec.beat}</p>
                                    )}

                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium">
                                      {rec.reportingTo && <span className="flex items-center gap-1 text-slate-400"><User className="w-3 h-3" />{rec.reportingTo}</span>}
                                      {leave ? (
                                        /* No punch line at all. A blank clock beside
                                           somebody on approved leave reads as a
                                           missing punch, which is what it is not. */
                                        <span className="flex items-center gap-1 text-rose-600 font-bold">
                                          <CalendarOff className="w-3 h-3" />{leaveLabel(rec)}
                                        </span>
                                      ) : (
                                        <>
                                          <span className={`flex items-center gap-1 ${rec.mp === 'no_in' ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                            <Clock className={`w-3 h-3 ${rec.mp === 'no_in' ? 'text-red-500' : 'text-emerald-500'}`} />
                                            {isValidTime(rec.attendanceTime)
                                              ? rec.attendanceTime
                                              : rec.mp === 'no_in' ? 'No In Punch' : '—'}
                                          </span>
                                          {(isValidTime(rec.eodTime) || rec.mp === 'no_out') && (
                                            <span className={`flex items-center gap-1 ${
                                              rec.mp === 'no_out' ? 'text-red-600 font-bold'
                                              : rec.auto ? 'text-orange-600 font-bold' : 'text-slate-500'}`}>
                                              <Clock className={`w-3 h-3 ${
                                                rec.mp === 'no_out' ? 'text-red-500'
                                                : rec.auto ? 'text-orange-500' : 'text-indigo-500'}`} />
                                              {isValidTime(rec.eodTime) ? rec.eodTime : 'No Out Punch'}
                                            </span>
                                          )}
                                          {/* Hours, but never off an auto-close: 23:59
                                              would read as a fifteen-hour day. */}
                                          <span className={`flex items-center gap-1 font-bold ${
                                            rec.workedMin > 0 ? 'text-violet-700' : 'text-slate-300'}`}>
                                            <Timer className="w-3 h-3" />{rec.workedMin > 0 ? fmtHM(rec.workedMin) : '—'}
                                          </span>
                                          {/* Straight line between the two punches,
                                              never a claim about ground covered. */}
                                          {rec.km >= 0 && (
                                            <span className={`flex items-center gap-1 font-bold ${
                                              rec.flags.has('noMove') ? 'text-amber-600' : 'text-teal-700'}`}
                                              title="Straight line from the start punch to the EOD punch">
                                              <Navigation className="w-3 h-3" />{fmtKm(rec.km)}
                                            </span>
                                          )}
                                          {rec.from && rec.to
                                            ? <a href={routeLink(rec.from, rec.to)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-amber-600 font-bold hover:underline"><MapPin className="w-3 h-3" />Route</a>
                                            : rec.from ? <a href={mapsLink(rec.from)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-amber-600 font-bold hover:underline"><MapPin className="w-3 h-3" />Start</a>
                                            : null}
                                        </>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                      {rec.mp && (
                                        <span className="text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3" />
                                          {rec.mp === 'no_out' ? 'Missing Out Punch' : 'Missing In Punch'}
                                        </span>
                                      )}
                                      {rec.auto && (
                                        <span className="text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                          <Timer className="w-3 h-3" /> Auto EOD — never punched out
                                        </span>
                                      )}
                                      {rec.flags.has('noMove') && (
                                        <span className="text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                          <Navigation className="w-3 h-3" /> Same place all day
                                        </span>
                                      )}
                                      {rec.flags.has('noEodLoc') && (
                                        <span className="text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                          <MapPin className="w-3 h-3" /> No EOD location
                                        </span>
                                      )}
                                      {rec.flags.has('noPhoto') && (
                                        <span className="text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                          <Camera className="w-3 h-3" /> No photo
                                        </span>
                                      )}
                                      {isBadPhoto(rec) && (
                                        <span className="text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                          <ScanFace className="w-3 h-3" />
                                          Blank photo — {photoOf(rec)?.reason}
                                        </span>
                                      )}
                                      {isNoPerson(rec) && (
                                        <span className="text-[11px] font-bold bg-yellow-50 text-yellow-800 border border-yellow-300 px-2 py-0.5 rounded-lg flex items-center gap-1"
                                          title="A colour test, not a face check — worth a look, not proof.">
                                          <ScanFace className="w-3 h-3" /> May not be a person
                                        </span>
                                      )}
                                      {!rec.mp && !rec.auto && rec.designation && (
                                        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg font-bold">{rec.designation}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}

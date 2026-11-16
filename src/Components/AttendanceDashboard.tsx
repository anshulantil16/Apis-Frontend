import React, { useState, useMemo } from 'react';
import {
  Users, UserCheck, CalendarOff, Coffee, CheckSquare, Search,
  Download, MapPin, User, Clock, ChevronDown, ChevronUp, SlidersHorizontal,
  AlertTriangle, Timer,
} from 'lucide-react';
import { TOOL_STYLES } from './toolStyles';

const getImageUrl = (html: string): string => {
  if (!html) return '';
  const t = html.trim();
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  const s = t.match(/src\s*=\s*['"]([^'"]+)['"]/i);
  if (s) return s[1];
  const h = t.match(/href\s*=\s*['"]([^'"]+)['"]/i);
  return h ? h[1] : '';
};

const getMapsLink = (loc: string): string => {
  if (!loc) return '';
  const t = loc.trim();
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(t)
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t)}`
    : '';
};

/* BIZOM punches arrive as HH:MM or HH:MM:SS. -> minutes past midnight, or
   -1 for anything that is not a real time (blank, "unswipe", "0"). */
const toMinutes = (t: string): number => {
  const m = (t || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return -1;
  const h = +m[1], mi = +m[2];
  return h > 23 || mi > 59 ? -1 : h * 60 + mi;
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

interface AttendanceRecord {
  zone: string; subzone: string; reportingTo: string; status: string;
  attendance: string; attendanceTime: string; attendanceImage: string;
  presentType: string; eodTime: string; location: string; userType: string;
  userName: string; userId: string; empId: string; designation: string;
  leaveDetails: string; forDate: string; eodLocation: string; beat: string;
  raw: Record<string, unknown>;
}

export function AttendanceDashboard({ rawData }: { rawData: unknown[] }) {
  const normalized = useMemo<AttendanceRecord[]>(() => {
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
      return {
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
      };
    });
  }, [rawData]);

  const uniqueDates = useMemo(() => {
    const s = new Set<string>();
    normalized.forEach(r => r.forDate && s.add(r.forDate));
    return Array.from(s).sort();
  }, [normalized]);

  const [selectedDate, setSelectedDate] = useState(() => uniqueDates[0] || '');
  const [groupBy, setGroupBy] = useState<keyof AttendanceRecord>('zone');
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => normalized.filter(r => {
    if (selectedDate && r.forDate !== selectedDate) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.userName.toLowerCase().includes(q) || r.reportingTo.toLowerCase().includes(q) ||
             r.empId.toLowerCase().includes(q) || r.zone.toLowerCase().includes(q) ||
             r.subzone.toLowerCase().includes(q) || r.location.toLowerCase().includes(q);
    }
    return true;
  }), [normalized, selectedDate, search]);

  const isValidTime = (t: string): boolean => {
    if (!t || !t.trim()) return false;
    const l = t.trim().toLowerCase();
    if (l.includes('unswipe') || l === '—' || l === '-' || l === 'n/a') return false;
    // Reject zero/placeholder times
    if (/^0+[:h]0*/.test(l)) return false;
    // Must contain at least a digit:colon pattern
    return /\d:\d/.test(l);
  };

  const missingFieldPunch = (r: AttendanceRecord): 'no_out' | 'no_in' | null => {
    // Somebody on leave or on a weekly off has nothing to punch. Reading
    // their blank row as a missing punch put people on approved leave onto
    // the exceptions list every single day.
    if (isOnLeave(r) || isWO(r)) return null;
    const hasIn  = isValidTime(r.attendanceTime);
    const hasOut = isValidTime(r.eodTime);
    if (hasIn && !hasOut) return 'no_out';
    if (!hasIn && hasOut) return 'no_in';
    return null;
  };

  const isPresent = (r: AttendanceRecord) => {
    const a = r.attendance.toLowerCase(), t = r.presentType.toLowerCase();
    return a.includes('present') || t.includes('present') || a === 'p';
  };
  const isLeave = (r: AttendanceRecord) => r.attendance.toLowerCase().includes('leave') || r.attendance.toLowerCase() === 'l' || r.leaveDetails !== '';
  const isWO = (r: AttendanceRecord) => { const a = r.attendance.toLowerCase(); return a.includes('wo') || a.includes('weekly') || a.includes('off'); };
  /* Present wins over leave. A half day carries both a punch and a leave
     note, and reading it as leave would hide the punch that was made. Every
     count and every card goes through this one, so they cannot disagree. */
  const isOnLeave = (r: AttendanceRecord) => !isPresent(r) && isLeave(r);

  const kpi = useMemo(() => {
    let present = 0, leave = 0, wo = 0, eod = 0, invalidPunch = 0, autoEod = 0;
    let workMins = 0, workDays = 0;
    const leaveTypes: Record<string, number> = {};
    filtered.forEach(r => {
      const onLeave = isOnLeave(r);
      if (isPresent(r)) present++;
      else if (onLeave) { const k = leaveLabel(r); leave++; leaveTypes[k] = (leaveTypes[k] || 0) + 1; }
      else if (isWO(r)) wo++;
      if (!onLeave) {
        // An auto-close is not an EOD the person submitted, so it is counted
        // on its own rather than inflating the compliance figure.
        if (isAutoEod(r)) autoEod++;
        else if (isValidTime(r.eodTime)) eod++;
        const w = workedMinutes(r);
        if (w > 0) { workMins += w; workDays++; }
      }
      if (missingFieldPunch(r)) invalidPunch++;
    });
    const total = filtered.length;
    return {
      total, present, leave, wo, eod, invalidPunch, autoEod, workDays, leaveTypes,
      avgWorkStr: fmtHM(workDays ? Math.round(workMins / workDays) : 0),
      presentPct: total ? Math.round(present / total * 100) : 0,
      leavePct:   total ? Math.round(leave   / total * 100) : 0,
      woPct:      total ? Math.round(wo      / total * 100) : 0,
      eodPct:     present ? Math.round(eod   / present * 100) : 0,
    };
  }, [filtered]);

  const grouped = useMemo(() => {
    const g: Record<string, { name: string; total: number; present: number; leave: number; wo: number; eod: number; invalidPunch: number; autoEod: number; workMins: number; workDays: number; records: AttendanceRecord[] }> = {};
    filtered.forEach(r => {
      const key = String(r[groupBy] || 'Not Assigned').trim() || 'Not Assigned';
      if (!g[key]) g[key] = { name: key, total: 0, present: 0, leave: 0, wo: 0, eod: 0, invalidPunch: 0, autoEod: 0, workMins: 0, workDays: 0, records: [] };
      g[key].total++;
      const onLeave = isOnLeave(r);
      if (isPresent(r)) g[key].present++;
      else if (onLeave) g[key].leave++;
      else if (isWO(r)) g[key].wo++;
      if (!onLeave) {
        if (isAutoEod(r)) g[key].autoEod++;
        else if (isValidTime(r.eodTime)) g[key].eod++;
        const w = workedMinutes(r);
        if (w > 0) { g[key].workMins += w; g[key].workDays++; }
      }
      if (missingFieldPunch(r)) g[key].invalidPunch++;
      g[key].records.push(r);
    });
    return Object.values(g).map(g => ({
      ...g,
      presentPct: g.total ? Math.round(g.present / g.total * 100) : 0,
      eodPct: g.present ? Math.round(g.eod / g.present * 100) : 0,
      avgWorkStr: fmtHM(g.workDays ? Math.round(g.workMins / g.workDays) : 0),
    })).sort((a, b) => b.total - a.total);
  }, [filtered, groupBy]);

  const toggle = (name: string) => setExpandedGroups(p => ({ ...p, [name]: !p[name] }));

  const exportCSV = () => {
    const hdr = [groupBy.toUpperCase(), 'Total', 'Present', 'Present %', 'Leave', 'WO',
                 'EOD', 'EOD %', 'Auto EOD', 'Avg Hours'];
    const rows = grouped.map(g => [g.name, g.total, g.present, `${g.presentPct}%`, g.leave, g.wo,
                                   g.eod, `${g.eodPct}%`, g.autoEod, g.avgWorkStr]);
    const csv = '﻿' + [hdr, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `Attendance_${groupBy}_${selectedDate || 'All'}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="space-y-5">
      <style>{TOOL_STYLES}</style>

      {/* ── Filters ── */}
      <div className="tp-reveal bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search employee, manager, zone..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 placeholder-slate-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 min-w-fit">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as keyof AttendanceRecord)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none cursor-pointer">
              <option value="zone">Zone</option>
              <option value="subzone">Sub Zone</option>
              <option value="reportingTo">Reporting Manager</option>
              <option value="location">Location / State</option>
              <option value="userType">User Type</option>
              <option value="designation">Designation</option>
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
          <button onClick={exportCSV}
            className="tp-sheen flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/15 hover:scale-[1.02] active:scale-95 transition-all">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Active',  value: kpi.total,        sub: 'Total workforce',          pct: null,             icon: Users,         iconCls: 'bg-slate-100 text-slate-600',    valCls: 'text-slate-800',   grad: 'from-white to-slate-50',    ring: 'border-slate-200' },
          { label: 'Present',       value: kpi.present,      sub: 'Marked attendance',        pct: kpi.presentPct,   icon: UserCheck,     iconCls: 'bg-emerald-100 text-emerald-600',valCls: 'text-emerald-700', grad: 'from-white to-emerald-50/60',ring: 'border-emerald-200' },
          { label: 'On Leave',      value: kpi.leave,        sub: 'Approved leave',           pct: kpi.leavePct,     icon: CalendarOff,   iconCls: 'bg-rose-100 text-rose-600',      valCls: 'text-rose-700',    grad: 'from-white to-rose-50/60',   ring: 'border-rose-200' },
          { label: 'Weekly Off',    value: kpi.wo,           sub: 'Rest day',                 pct: kpi.woPct,        icon: Coffee,        iconCls: 'bg-sky-100 text-sky-600',        valCls: 'text-sky-700',     grad: 'from-white to-sky-50/60',    ring: 'border-sky-200' },
          { label: 'EOD Done',      value: kpi.eod,          sub: 'Of present employees',     pct: kpi.eodPct,       icon: CheckSquare,   iconCls: 'bg-indigo-100 text-indigo-600',  valCls: 'text-indigo-700',  grad: 'from-white to-indigo-50/60', ring: 'border-indigo-200' },
          { label: 'Auto EOD',      value: kpi.autoEod,      sub: 'Closed at 23:59 by system',pct: null,             icon: Timer,         iconCls: 'bg-orange-100 text-orange-600',  valCls: 'text-orange-700',  grad: 'from-white to-orange-50/60', ring: 'border-orange-300' },
          { label: 'Avg Hours',     value: kpi.avgWorkStr,   sub: `${kpi.workDays} full days`,pct: null,             icon: Clock,         iconCls: 'bg-violet-100 text-violet-600',  valCls: 'text-violet-700',  grad: 'from-white to-violet-50/60', ring: 'border-violet-200' },
          { label: 'Invalid Punch', value: kpi.invalidPunch, sub: 'Missing in / out',         pct: null,             icon: AlertTriangle, iconCls: 'bg-red-100 text-red-600',        valCls: 'text-red-700',     grad: 'from-white to-red-50/60',    ring: 'border-red-200' },
        ].map((c, i) => (
          <div key={c.label}
            className={`tp-reveal tp-tilt bg-gradient-to-br ${c.grad} rounded-2xl border ${c.ring} p-4 shadow-sm hover:shadow-lg transition-all duration-200`}
            style={{ animationDelay: `${i * 60}ms` }}>
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
          </div>
        ))}
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                {['Group', 'Total', 'Present', 'Leave', 'WO', 'EOD Done', 'Avg Hrs', 'Attendance %'].map((h, i) => (
                  <th key={h} className={`py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider ${i === 0 ? 'px-6 w-1/3' : i === 7 ? 'px-6 text-right' : 'px-4 text-center'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {grouped.map(grp => {
                const open = !!expandedGroups[grp.name];
                return (
                  <React.Fragment key={grp.name}>
                    <tr onClick={() => toggle(grp.name)} className="hover:bg-slate-50/60 cursor-pointer transition-colors group">
                      <td className="px-6 py-3.5 flex items-center gap-2 font-bold text-slate-700">
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
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600 font-semibold text-sm">{grp.total}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{grp.present} ({grp.presentPct}%)</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${grp.leave > 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-300 bg-slate-50'}`}>{grp.leave}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${grp.wo > 0 ? 'text-sky-600 bg-sky-50' : 'text-slate-300 bg-slate-50'}`}>{grp.wo}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${grp.eodPct >= 80 ? 'text-indigo-600 bg-indigo-50' : grp.eod > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-300 bg-slate-50'}`}>{grp.eod} ({grp.eodPct}%)</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${grp.workDays ? 'text-violet-700 bg-violet-50' : 'text-slate-300 bg-slate-50'}`}>{grp.avgWorkStr}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-sm font-black ${grp.presentPct >= 80 ? 'text-emerald-600' : grp.presentPct >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{grp.presentPct}%</span>
                          <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${grp.presentPct >= 80 ? 'bg-emerald-500' : grp.presentPct >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${grp.presentPct}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>

                    {open && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 bg-slate-50/50">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                            {grp.name} · {grp.records.length} employees
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                            {grp.records.map((rec, i) => {
                              const present = isPresent(rec), leave = isOnLeave(rec), wo = isWO(rec);
                              const mp = missingFieldPunch(rec);
                              // Someone on leave did not work, so the card shows
                              // which leave it was and no punch at all.
                              const auto = !leave && isAutoEod(rec);
                              const worked = leave ? 0 : workedMinutes(rec);
                              return (
                                <div key={i} className={`tp-reveal tp-tilt bg-white rounded-xl border p-4 flex gap-3 hover:shadow-md transition-all ${
                                  mp     ? 'border-red-300 bg-red-50/40 ring-1 ring-red-200'
                                  : auto ? 'border-orange-300 bg-orange-50/40 ring-1 ring-orange-200'
                                  : 'border-slate-150 hover:border-slate-200'
                                }`} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                                  {rec.attendanceImage && (
                                    <a href={rec.attendanceImage} target="_blank" rel="noopener noreferrer"
                                      className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 shadow-sm">
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
                                        <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                                          present ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                          leave   ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                          wo      ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                                    'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}>
                                          {present ? 'Present' : leave ? 'Leave' : wo ? 'W/Off' : rec.attendance || '?'}
                                        </span>
                                      </div>
                                    </div>
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
                                          <span className={`flex items-center gap-1 ${mp === 'no_in' ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                            <Clock className={`w-3 h-3 ${mp === 'no_in' ? 'text-red-500' : 'text-emerald-500'}`} />
                                            {isValidTime(rec.attendanceTime)
                                              ? rec.attendanceTime
                                              : mp === 'no_in'
                                                ? 'No In Punch'
                                                : '—'}
                                          </span>
                                          {(isValidTime(rec.eodTime) || mp === 'no_out') && (
                                            <span className={`flex items-center gap-1 ${
                                              mp === 'no_out' ? 'text-red-600 font-bold'
                                              : auto ? 'text-orange-600 font-bold' : 'text-slate-500'}`}>
                                              <Clock className={`w-3 h-3 ${
                                                mp === 'no_out' ? 'text-red-500'
                                                : auto ? 'text-orange-500' : 'text-indigo-500'}`} />
                                              {isValidTime(rec.eodTime) ? rec.eodTime : 'No Out Punch'}
                                            </span>
                                          )}
                                          {/* Hours, but never off an auto-close: 23:59
                                              would read as a fifteen-hour day. */}
                                          <span className={`flex items-center gap-1 font-bold ${
                                            worked > 0 ? 'text-violet-700' : 'text-slate-300'}`}>
                                            <Timer className="w-3 h-3" />{worked > 0 ? fmtHM(worked) : '—'}
                                          </span>
                                          {rec.location && getMapsLink(rec.location)
                                            ? <a href={getMapsLink(rec.location)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-amber-600 font-bold hover:underline"><MapPin className="w-3 h-3" />Map</a>
                                            : rec.location ? <span className="flex items-center gap-1 text-slate-400"><MapPin className="w-3 h-3" />{rec.location}</span> : null}
                                        </>
                                      )}
                                    </div>
                                    {mp && (
                                      <span className="text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-lg w-fit flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {mp === 'no_out' ? 'Missing Out Punch' : 'Missing In Punch'}
                                      </span>
                                    )}
                                    {auto && (
                                      <span className="text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 rounded-lg w-fit flex items-center gap-1">
                                        <Timer className="w-3 h-3" />
                                        Auto EOD — never punched out
                                      </span>
                                    )}
                                    {!mp && !auto && rec.designation && <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg font-bold w-fit">{rec.designation}</span>}
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
      </div>
    </div>
  );
}

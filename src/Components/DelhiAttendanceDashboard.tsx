import React, { useState, useMemo } from 'react';
import {
  Users, UserCheck, CalendarOff, Coffee, Search, Download,
  Clock, ChevronDown, ChevronUp, SlidersHorizontal,
  AlertTriangle, Timer, Activity, TrendingDown, MessageSquare,
} from 'lucide-react';

// ── Pure helpers ────────────────────────────────────────────────────────────

function parseDurationHours(dur: string): number {
  const m = (dur || '').match(/^(\d+):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

function parseTimeMinutes(t: string): number {
  if (!t || t.toLowerCase().includes('unswipe') || !t.trim()) return -1;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return -1;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function fmtAvgDuration(totalHours: number, count: number): string {
  if (!count) return '—';
  const avg = totalHours / count;
  const h = Math.floor(avg);
  const m = Math.round((avg - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}h`;
}

const LATE_MINS = 10 * 60 + 30; // 10:30 AM

// ── Type classification ─────────────────────────────────────────────────────

type AttCat = 'present' | 'absent' | 'leave' | 'off';

const TYPE_MAP: Record<string, { label: string; cls: string; cat: AttCat }> = {
  P:   { label: 'Present',         cls: 'bg-emerald-100 text-emerald-800 border-emerald-300', cat: 'present' },
  A:   { label: 'Absent',          cls: 'bg-rose-100    text-rose-800    border-rose-300',    cat: 'absent'  },
  CL:  { label: 'Casual Leave',    cls: 'bg-orange-100  text-orange-800  border-orange-300',  cat: 'leave'   },
  PL:  { label: 'Privilege Leave', cls: 'bg-purple-100  text-purple-800  border-purple-300',  cat: 'leave'   },
  SL:  { label: 'Sick Leave',      cls: 'bg-pink-100    text-pink-800    border-pink-300',    cat: 'leave'   },
  ML:  { label: 'Medical Leave',   cls: 'bg-pink-100    text-pink-800    border-pink-300',    cat: 'leave'   },
  EL:  { label: 'Earned Leave',    cls: 'bg-violet-100  text-violet-800  border-violet-300',  cat: 'leave'   },
  LWP: { label: 'LWP',             cls: 'bg-red-100     text-red-800     border-red-300',     cat: 'leave'   },
  W:   { label: 'Sunday Off',      cls: 'bg-sky-100     text-sky-800     border-sky-300',     cat: 'off'     },
  WO:  { label: 'Weekly Off',      cls: 'bg-sky-100     text-sky-800     border-sky-300',     cat: 'off'     },
  HD:  { label: 'Half Day',        cls: 'bg-amber-100   text-amber-800   border-amber-300',   cat: 'present' },
  CO:  { label: 'Comp Off',        cls: 'bg-teal-100    text-teal-800    border-teal-300',    cat: 'off'     },
};

function typeInfo(raw: string) {
  const t = (raw || '').trim().toUpperCase();
  return TYPE_MAP[t] ?? { label: raw || '—', cls: 'bg-slate-100 text-slate-700 border-slate-200', cat: 'absent' as AttCat };
}

// ── Remark classification ───────────────────────────────────────────────────

type RemarkKey = 'WFH' | 'OD' | 'OD_MERGE' | 'OTHER';

const REMARK_STYLE: Record<RemarkKey, { label: string; cls: string }> = {
  WFH:     { label: 'WFH',          cls: 'bg-blue-100    text-blue-800    border-blue-300'    },
  OD:      { label: 'On Duty',      cls: 'bg-indigo-100  text-indigo-800  border-indigo-300'  },
  OD_MERGE:{ label: 'OD Merge',     cls: 'bg-purple-100  text-purple-800  border-purple-300'  },
  OTHER:   { label: 'Remark',       cls: 'bg-slate-100   text-slate-700   border-slate-300'   },
};

function remarkKey(remark: string): RemarkKey | null {
  const r = (remark || '').toLowerCase().trim();
  if (!r) return null;
  if (r.includes('wfh') || r.includes('work from home') || r.includes('work from office')) return 'WFH';
  if (r.includes('merge') || r.includes('in out process')) return 'OD_MERGE';
  if (r.includes('on duty') || r === 'od' || r.startsWith('od ') || r.includes('outstation')) return 'OD';
  return 'OTHER';
}

// ── Types ───────────────────────────────────────────────────────────────────

interface DelhiRecord {
  code: string; name: string; category: string; department: string; designation: string;
  date: string; shiftName: string; inTime: string; outTime: string;
  duration: string; type: string; day: string; remarks: string;
  raw: Record<string, unknown>;
}

interface Props { rawData: unknown[] }

// ── Main component ──────────────────────────────────────────────────────────

export function DelhiAttendanceDashboard({ rawData }: Props) {

  // ── Normalise raw rows ──────────────────────────────────────────────────
  const records = useMemo<DelhiRecord[]>(() => {
    if (!rawData?.length) return [];
    return (rawData as Record<string, unknown>[]).map(row => {
      const keys = Object.keys(row);
      const find = (...patterns: string[]): string => {
        const k = keys.find(k =>
          patterns.some(p => k.toLowerCase().replace(/[\s_-]/g, '') === p.toLowerCase().replace(/[\s_-]/g, ''))
        );
        return k ? String(row[k] ?? '').trim() : '';
      };
      return {
        code:        find('code', 'empcode', 'employeecode', 'employeeid'),
        name:        find('name', 'employeename'),
        category:    find('category'),
        department:  find('department', 'dept'),
        designation: find('designation'),
        date:        find('date'),
        shiftName:   find('shiftname', 'shiftname', 'shift name', 'shift'),
        inTime:      find('intime', 'in time', 'in'),
        outTime:     find('outtime', 'out time', 'out'),
        duration:    find('duration'),
        type:        find('type'),
        day:         find('day'),
        remarks:     find('remarks'),
        raw: row,
      };
    });
  }, [rawData]);

  const uniqueDates = useMemo(() => {
    const s = new Set<string>();
    records.forEach(r => r.date && s.add(r.date));
    return Array.from(s).sort();
  }, [records]);

  // ── Date range state ────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState(() => uniqueDates[0] || '');
  const [dateTo,   setDateTo  ] = useState(() => uniqueDates[uniqueDates.length - 1] || '');

  const selectedDates = useMemo<Set<string>>(() => {
    if (!uniqueDates.length) return new Set();
    const lo = uniqueDates.indexOf(dateFrom);
    const hi = uniqueDates.indexOf(dateTo);
    if (lo === -1 || hi === -1) return new Set(uniqueDates);
    return new Set(uniqueDates.slice(Math.min(lo, hi), Math.max(lo, hi) + 1));
  }, [uniqueDates, dateFrom, dateTo]);

  const isRange = selectedDates.size > 1;

  // ── Other filters ───────────────────────────────────────────────────────
  const [groupBy, setGroupBy] = useState<'department' | 'category' | 'designation'>('department');
  const [search, setSearch]   = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [shiftFilter, setShiftFilter] = useState('all');

  const uniqueShifts = useMemo(() => {
    const s = new Set<string>();
    records.forEach(r => r.shiftName && s.add(r.shiftName));
    return Array.from(s).sort();
  }, [records]);

  // ── Filtered records ────────────────────────────────────────────────────
  const filtered = useMemo(() => records.filter(r => {
    if (!selectedDates.has(r.date)) return false;
    if (shiftFilter !== 'all' && r.shiftName !== shiftFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) ||
             r.department.toLowerCase().includes(q) || r.designation.toLowerCase().includes(q);
    }
    return true;
  }), [records, selectedDates, shiftFilter, search]);

  // ── KPI calculation ─────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const byDate: Record<string, { present: number; absent: number; leave: number; off: number; late: number }> = {};
    const leaveTypes: Record<string, number> = {};
    const remarkTypes: Record<string, number> = {};
    const uniqueEmps = new Set<string>();
    let totalDur = 0, durCount = 0, shortHours = 0;

    filtered.forEach(r => {
      uniqueEmps.add(r.code || r.name);
      const ti = typeInfo(r.type);
      const d = r.date || '_';
      if (!byDate[d]) byDate[d] = { present: 0, absent: 0, leave: 0, off: 0, late: 0 };

      if (ti.cat === 'present') {
        byDate[d].present++;
        if (parseTimeMinutes(r.inTime) > LATE_MINS) byDate[d].late++;
        const h = parseDurationHours(r.duration);
        if (h > 0) { totalDur += h; durCount++; if (h < 7) shortHours++; }
      } else if (ti.cat === 'absent') {
        byDate[d].absent++;
      } else if (ti.cat === 'leave') {
        byDate[d].leave++;
        const lt = (r.type || '').trim().toUpperCase();
        leaveTypes[lt] = (leaveTypes[lt] || 0) + 1;
      } else {
        byDate[d].off++;
        const lt = (r.type || '').trim().toUpperCase();
        leaveTypes[lt] = (leaveTypes[lt] || 0) + 1;
      }

      // Count every record that has a remark, regardless of type
      if (r.remarks?.trim()) {
        const rk = remarkKey(r.remarks);
        if (rk) remarkTypes[rk] = (remarkTypes[rk] || 0) + 1;
      }
    });

    const days = Object.values(byDate);
    const n = days.length || 1;
    const sum = (k: keyof typeof days[0]) => days.reduce((s, d) => s + d[k], 0);
    const avg = (k: keyof typeof days[0]) => Math.round(sum(k) / n);

    // In range mode show avg/day; in single-day mode show actuals
    const present = isRange ? avg('present') : sum('present');
    const absent  = isRange ? avg('absent')  : sum('absent');
    const leave   = isRange ? avg('leave')   : sum('leave');
    const off     = isRange ? avg('off')     : sum('off');
    const late    = isRange ? avg('late')    : sum('late');
    const total   = isRange ? uniqueEmps.size : filtered.length;

    return {
      total, present, absent, leave, off, late, shortHours, leaveTypes, remarkTypes,
      avgDurationStr: fmtAvgDuration(totalDur, durCount),
      daysCount: n,
      presentPct: total ? Math.round(present / total * 100) : 0,
      absentPct:  total ? Math.round(absent  / total * 100) : 0,
      leavePct:   total ? Math.round(leave   / total * 100) : 0,
      latePct:    present ? Math.round(late  / present * 100) : 0,
    };
  }, [filtered, isRange]);

  // ── Grouped data ────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const g: Record<string, {
      name: string;
      present: number; absent: number; leave: number; off: number; late: number; withRemarks: number;
      employees: Record<string, DelhiRecord[]>;
      records: DelhiRecord[];
    }> = {};

    filtered.forEach(r => {
      const key = (groupBy === 'department' ? r.department
                 : groupBy === 'category'   ? r.category
                 : r.designation) || 'Not Assigned';
      if (!g[key]) g[key] = { name: key, present: 0, absent: 0, leave: 0, off: 0, late: 0, withRemarks: 0, employees: {}, records: [] };
      const ti = typeInfo(r.type);
      if (ti.cat === 'present') { g[key].present++; if (parseTimeMinutes(r.inTime) > LATE_MINS) g[key].late++; }
      else if (ti.cat === 'absent') g[key].absent++;
      else if (ti.cat === 'leave')  g[key].leave++;
      else                          g[key].off++;
      if (r.remarks?.trim()) g[key].withRemarks++;

      const empKey = r.code || r.name || '?';
      if (!g[key].employees[empKey]) g[key].employees[empKey] = [];
      g[key].employees[empKey].push(r);
      g[key].records.push(r);
    });

    return Object.values(g).map(grp => {
      const uniqueEmpCount = Object.keys(grp.employees).length;
      const total = isRange ? uniqueEmpCount : grp.records.length;
      return {
        ...grp,
        total,
        uniqueEmpCount,
        presentPct: grp.records.length ? Math.round(grp.present / grp.records.length * 100) : 0,
        employeeList: Object.entries(grp.employees)
          .map(([code, recs]) => ({ code, recs: recs.sort((a, b) => a.date.localeCompare(b.date)) }))
          .sort((a, b) => a.code.localeCompare(b.code)),
      };
    }).sort((a, b) => b.total - a.total);
  }, [filtered, groupBy, isRange]);

  const toggle = (name: string) => setExpanded(p => ({ ...p, [name]: !p[name] }));

  const exportCSV = () => {
    const hdr = ['Code','Name','Category','Department','Designation','Date','Shift','In Time','Out Time','Duration','Type','Day','Remarks'];
    const rows = filtered.map(r => [r.code,r.name,r.category,r.department,r.designation,r.date,r.shiftName,r.inTime,r.outTime,r.duration,r.type,r.day,r.remarks]);
    const csv = '﻿' + [hdr,...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `HO_Attendance_${dateFrom}${isRange ? '_to_' + dateTo : ''}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">

      {/* ── Filters bar ──────────────────────────────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-2xl p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col xl:flex-row gap-4 items-center justify-between">

        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-1 max-w-5xl">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search name, code, department..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl w-full text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 placeholder-slate-400 text-sm transition-all"
            />
          </div>
          {/* Group by */}
          <div className="flex gap-2 min-w-[240px]">
            <div className="flex items-center bg-slate-50 px-3 rounded-2xl border border-slate-200">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 mr-2" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Group</span>
            </div>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as typeof groupBy)}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:outline-none text-sm cursor-pointer">
              <option value="department">Department</option>
              <option value="category">Category</option>
              <option value="designation">Designation</option>
            </select>
          </div>
          {/* Shift */}
          {uniqueShifts.length > 1 && (
            <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:outline-none text-sm cursor-pointer">
              <option value="all">All Shifts</option>
              {uniqueShifts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        <div className="flex gap-3 w-full xl:w-auto justify-end items-center flex-wrap">
          {/* ── Date range picker ── */}
          {uniqueDates.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</span>
              <select value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none text-xs cursor-pointer shadow-sm">
                {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span className="text-slate-300 font-bold">→</span>
              <select value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none text-xs cursor-pointer shadow-sm">
                {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button
                onClick={() => { setDateFrom(uniqueDates[0]); setDateTo(uniqueDates[uniqueDates.length - 1]); }}
                className="px-2.5 py-1 text-[10px] font-black bg-violet-100 text-violet-700 rounded-xl hover:bg-violet-200 transition-colors uppercase tracking-wide"
              >All</button>
              {isRange && (
                <span className="px-2 py-0.5 bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-bold rounded-lg">
                  {selectedDates.size}d
                </span>
              )}
            </div>
          )}
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold rounded-2xl transition-all shadow-md hover:scale-[1.02] active:scale-95 text-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      {isRange && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Range mode — showing averages per day across {kpi.daysCount} days · {kpi.total} unique employees
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Total */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl w-fit"><Users className="w-4 h-4" /></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.total}</h3>
          <p className="text-[10px] font-semibold text-slate-400">{isRange ? 'Unique employees' : 'Employees'}</p>
        </div>
        {/* Present */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500" />
          <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-xl w-fit"><UserCheck className="w-4 h-4" /></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Present</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.present}</h3>
          <p className="text-[10px] font-semibold text-emerald-600">{kpi.presentPct}%{isRange ? ' avg/day' : ''}</p>
        </div>
        {/* Absent */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-rose-500" />
          <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl w-fit"><CalendarOff className="w-4 h-4" /></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Absent</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.absent}</h3>
          <p className="text-[10px] font-semibold text-rose-500">{kpi.absentPct}%{isRange ? ' avg/day' : ''}</p>
        </div>
        {/* On Leave */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-orange-500" />
          <div className="p-2.5 bg-orange-50 text-orange-500 rounded-xl w-fit"><CalendarOff className="w-4 h-4" /></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">On Leave</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.leave}</h3>
          <p className="text-[10px] font-semibold text-slate-400">{kpi.leavePct}%{isRange ? ' avg/day' : ''}</p>
        </div>
        {/* Weekly Off */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-sky-500" />
          <div className="p-2.5 bg-sky-50 text-sky-500 rounded-xl w-fit"><Coffee className="w-4 h-4" /></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Weekly Off</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.off}</h3>
          <p className="text-[10px] font-semibold text-slate-400">{isRange ? 'avg/day' : 'Scheduled off'}</p>
        </div>
        {/* Late In */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-500" />
          <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl w-fit"><AlertTriangle className="w-4 h-4" /></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Late In</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.late}</h3>
          <p className="text-[10px] font-semibold text-slate-400">{kpi.latePct}% of present{isRange ? ' avg' : ''}</p>
        </div>
        {/* Avg Hours */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-violet-500" />
          <div className="p-2.5 bg-violet-50 text-violet-500 rounded-xl w-fit"><Timer className="w-4 h-4" /></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avg Hours</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.avgDurationStr}</h3>
          <p className="text-[10px] font-semibold text-slate-400">{kpi.shortHours} short-hour days</p>
        </div>
      </div>

      {/* ── Leave & Remarks breakdowns ─────────────────────────────────── */}
      {(Object.keys(kpi.leaveTypes).length > 0 || Object.keys(kpi.remarkTypes).length > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Leave types */}
          {Object.keys(kpi.leaveTypes).length > 0 && (
            <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Leave &amp; Off Breakdown
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(kpi.leaveTypes).sort((a,b) => b[1]-a[1]).map(([t, count]) => {
                  const info = typeInfo(t);
                  return (
                    <div key={t} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${info.cls}`}>
                      <span>{info.label}</span>
                      <span className="bg-white/70 px-1.5 py-0.5 rounded-lg font-black">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Remark types */}
          {Object.keys(kpi.remarkTypes).length > 0 && (
            <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Remarks Breakdown{isRange ? ' (total across range)' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(kpi.remarkTypes).sort((a,b) => b[1]-a[1]).map(([rk, count]) => {
                  const style = REMARK_STYLE[rk as RemarkKey] ?? REMARK_STYLE.OTHER;
                  return (
                    <div key={rk} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${style.cls}`}>
                      <span>{style.label}</span>
                      <span className="bg-white/70 px-1.5 py-0.5 rounded-lg font-black">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Summary table ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Summary by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
              {isRange && <span className="ml-2 text-xs font-semibold text-violet-500">Avg/day shown in KPIs · totals in table</span>}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Click a row to expand employee records</p>
          </div>
          <span className="px-3 py-1 bg-violet-100 text-violet-700 font-bold text-xs rounded-full uppercase tracking-wider">{grouped.length} Groups</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  { label: groupBy.toUpperCase(), align: 'left',   cls: 'px-7 w-1/4' },
                  { label: isRange ? 'EMPLOYEES' : 'TOTAL', align: 'center', cls: 'px-5' },
                  { label: 'PRESENT',  align: 'center', cls: 'px-5' },
                  { label: 'ABSENT',   align: 'center', cls: 'px-5' },
                  { label: 'LEAVE',    align: 'center', cls: 'px-5' },
                  { label: 'WO',       align: 'center', cls: 'px-5' },
                  { label: 'LATE IN',  align: 'center', cls: 'px-5' },
                  { label: 'REMARKS',  align: 'center', cls: 'px-5' },
                  { label: 'ATT %',    align: 'right',  cls: 'px-7' },
                ].map(h => (
                  <th key={h.label} className={`py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${h.cls} text-${h.align}`}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {grouped.map(grp => {
                const isOpen = !!expanded[grp.name];
                return (
                  <React.Fragment key={grp.name}>
                    <tr onClick={() => toggle(grp.name)} className="hover:bg-slate-50/60 cursor-pointer transition-colors group">
                      <td className="px-7 py-4 flex items-center gap-2 font-bold text-slate-700">
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-violet-400 flex-shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition-colors flex-shrink-0" />}
                        <span className="group-hover:text-violet-700 transition-colors">{grp.name}</span>
                      </td>
                      <td className="px-5 py-4 text-center text-slate-600 font-semibold">{grp.total}</td>
                      <td className="px-5 py-4 text-center">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">{grp.present} ({grp.presentPct}%)</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${grp.absent > 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-400 bg-slate-100'}`}>{grp.absent}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${grp.leave > 0 ? 'text-orange-700 bg-orange-50' : 'text-slate-400 bg-slate-100'}`}>{grp.leave}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${grp.off > 0 ? 'text-sky-700 bg-sky-50' : 'text-slate-400 bg-slate-100'}`}>{grp.off}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${grp.late > 0 ? 'text-amber-700 bg-amber-50' : 'text-slate-400 bg-slate-100'}`}>{grp.late}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${grp.withRemarks > 0 ? 'text-blue-700 bg-blue-50' : 'text-slate-400 bg-slate-100'}`}>{grp.withRemarks}</span>
                      </td>
                      <td className="px-7 py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-slate-700">{grp.presentPct}%</span>
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${grp.presentPct >= 80 ? 'bg-emerald-500' : grp.presentPct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${grp.presentPct}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* ── Drilldown ─────────────────────────────────────── */}
                    {isOpen && (
                      <tr>
                        <td colSpan={9} className="px-7 py-5 bg-slate-50/60 border-t border-slate-100">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                            {grp.name} — {isRange ? `${grp.uniqueEmpCount} employees · ${isRange ? selectedDates.size + ' days' : '1 day'}` : `${grp.records.length} records`}
                          </p>

                          {isRange
                            ? /* Range mode: one card per employee with attendance log */
                              <div className="space-y-2">
                                {grp.employeeList.map(emp => {
                                  const pCount = emp.recs.filter(r => typeInfo(r.type).cat === 'present').length;
                                  const aCount = emp.recs.filter(r => typeInfo(r.type).cat === 'absent').length;
                                  const lCount = emp.recs.filter(r => typeInfo(r.type).cat === 'leave').length;
                                  const oCount = emp.recs.filter(r => typeInfo(r.type).cat === 'off').length;
                                  const durHrs = emp.recs.reduce((s, r) => s + parseDurationHours(r.duration), 0);
                                  const durN   = emp.recs.filter(r => typeInfo(r.type).cat === 'present' && parseDurationHours(r.duration) > 0).length;
                                  const first  = emp.recs[0];
                                  return (
                                    <div key={emp.code} className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                                      {/* Employee header */}
                                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="min-w-0">
                                            <span className="font-bold text-slate-800 text-sm">{first?.name || '—'}</span>
                                            <span className="ml-2 text-[10px] font-bold text-slate-400 font-mono">{emp.code}</span>
                                          </div>
                                          <div className="flex gap-1 flex-wrap">
                                            {first?.department && <span className="text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded">{first.department}</span>}
                                            {first?.designation && <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{first.designation}</span>}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg">{pCount}P</span>
                                          {aCount > 0 && <span className="text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-lg">{aCount}A</span>}
                                          {lCount > 0 && <span className="text-[10px] font-black bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-lg">{lCount}L</span>}
                                          {oCount > 0 && <span className="text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-lg">{oCount}W</span>}
                                          <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-lg">
                                            Avg {fmtAvgDuration(durHrs, durN)}
                                          </span>
                                        </div>
                                      </div>
                                      {/* Day-by-day rows */}
                                      <div className="divide-y divide-slate-50">
                                        {emp.recs.map((rec, ri) => {
                                          const ti = typeInfo(rec.type);
                                          const dh = parseDurationHours(rec.duration);
                                          const isShort = ti.cat === 'present' && dh > 0 && dh < 7;
                                          const inM = parseTimeMinutes(rec.inTime);
                                          const isLate = ti.cat === 'present' && inM !== -1 && inM > LATE_MINS;
                                          const rk = remarkKey(rec.remarks);
                                          const remarkStyle = rk ? REMARK_STYLE[rk] : null;
                                          return (
                                            <div key={ri} className={`flex items-center gap-3 px-4 py-2 text-xs ${isShort ? 'bg-amber-50/40' : ''}`}>
                                              <span className="font-bold text-slate-500 w-20 flex-shrink-0">{rec.date}</span>
                                              <span className={`w-20 flex-shrink-0 font-bold ${isLate ? 'text-amber-600' : 'text-slate-600'}`}>
                                                {ti.cat === 'present' && !rec.inTime.toLowerCase().includes('unswipe') ? rec.inTime : '—'}
                                              </span>
                                              <span className="text-slate-300">→</span>
                                              <span className="w-16 flex-shrink-0 text-slate-600 font-bold">
                                                {ti.cat === 'present' && !rec.outTime.toLowerCase().includes('unswipe') ? rec.outTime : '—'}
                                              </span>
                                              <span className={`w-14 flex-shrink-0 font-black ${isShort ? 'text-amber-600' : dh >= 9 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                {rec.duration ? rec.duration + 'h' : '—'}
                                              </span>
                                              <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${ti.cls}`}>
                                                {rec.type?.trim().toUpperCase() || '—'}
                                              </span>
                                              <div className="flex gap-1 flex-1 flex-wrap">
                                                {isLate && <span className="text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-1 py-0.5 rounded flex items-center gap-0.5"><AlertTriangle className="w-2 h-2"/>Late</span>}
                                                {isShort && <span className="text-[9px] font-black bg-orange-100 text-orange-700 border border-orange-200 px-1 py-0.5 rounded flex items-center gap-0.5"><TrendingDown className="w-2 h-2"/>Short</span>}
                                                {remarkStyle && (
                                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${remarkStyle.cls}`}>
                                                    {remarkStyle.label}
                                                  </span>
                                                )}
                                                {rk === null && rec.remarks?.trim() && (
                                                  <span className="text-[9px] text-slate-500 italic truncate max-w-[160px]">"{rec.remarks}"</span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                            : /* Single-date mode: individual cards as before */
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {grp.records.map((rec, i) => {
                                  const ti = typeInfo(rec.type);
                                  const dh = parseDurationHours(rec.duration);
                                  const isShort = ti.cat === 'present' && dh > 0 && dh < 7;
                                  const inM = parseTimeMinutes(rec.inTime);
                                  const isLate = ti.cat === 'present' && inM !== -1 && inM > LATE_MINS;
                                  const rk = remarkKey(rec.remarks);
                                  const remarkStyle = rk ? REMARK_STYLE[rk] : null;
                                  return (
                                    <div key={i} className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-2 hover:shadow-md transition-all ${isShort ? 'border-amber-300' : 'border-slate-200/70'}`}>
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="font-bold text-slate-800 text-sm leading-tight truncate">{rec.name || '—'}</p>
                                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 font-mono">{rec.code}</p>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border flex-shrink-0 ${ti.cls}`}>
                                          {rec.type?.trim().toUpperCase() || ti.label}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {rec.department && <span className="text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded">{rec.department}</span>}
                                        {rec.designation && <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{rec.designation}</span>}
                                      </div>
                                      {ti.cat === 'present' && (
                                        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${rec.inTime.toLowerCase().includes('unswipe') ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-700'}`}>
                                          <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isLate ? 'text-amber-500' : 'text-emerald-500'}`} />
                                          <span className={isLate ? 'font-bold text-amber-700' : ''}>{rec.inTime}</span>
                                          <span className="text-slate-300">→</span>
                                          <span>{rec.outTime}</span>
                                          {rec.duration && <><span className="text-slate-300 ml-1">|</span><span className={`font-black ml-1 ${isShort ? 'text-amber-600' : dh >= 9 ? 'text-emerald-600' : 'text-slate-700'}`}>{rec.duration}h</span></>}
                                        </div>
                                      )}
                                      {(isLate || isShort || remarkStyle || (rec.shiftName && rec.shiftName !== 'General Shift')) && (
                                        <div className="flex flex-wrap gap-1">
                                          {isLate && <span className="text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5"/>Late In</span>}
                                          {isShort && <span className="text-[9px] font-black bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded flex items-center gap-0.5"><TrendingDown className="w-2.5 h-2.5"/>Short Hrs</span>}
                                          {remarkStyle && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${remarkStyle.cls}`}>{remarkStyle.label}</span>}
                                          {rec.shiftName && rec.shiftName !== 'General Shift' && <span className="text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">{rec.shiftName}</span>}
                                        </div>
                                      )}
                                      {/* Show raw remark text if it's an OTHER or unknown category */}
                                      {rec.remarks?.trim() && (
                                        <p className="text-[10px] text-slate-500 italic bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 leading-relaxed">
                                          "{rec.remarks}"
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                          }
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

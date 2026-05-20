import React, { useState, useMemo } from 'react';
import {
  Users, UserCheck, CalendarOff, Coffee, Search, Download,
  Clock, ChevronDown, ChevronUp, SlidersHorizontal,
  AlertTriangle, Timer, Activity, TrendingDown,
} from 'lucide-react';

function parseDurationHours(dur: string): number {
  const m = (dur || '').match(/^(\d+):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

function parseTimeMinutes(t: string): number {
  if (!t || t.toLowerCase().includes('unswipe') || t.trim() === '') return -1;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return -1;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

const LATE_MINS = 10 * 60 + 30; // 10:30 AM

type LeaveCategory = 'present' | 'absent' | 'leave' | 'off';

const TYPE_MAP: Record<string, { label: string; cls: string; cat: LeaveCategory }> = {
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
  return TYPE_MAP[t] ?? {
    label: raw || '—',
    cls: 'bg-slate-100 text-slate-700 border-slate-200',
    cat: 'absent' as LeaveCategory,
  };
}

interface DelhiRecord {
  code: string;
  name: string;
  category: string;
  department: string;
  designation: string;
  date: string;
  shiftName: string;
  inTime: string;
  outTime: string;
  duration: string;
  type: string;
  day: string;
  remarks: string;
  raw: Record<string, unknown>;
}

interface Props { rawData: unknown[] }

export function DelhiAttendanceDashboard({ rawData }: Props) {
  const records = useMemo<DelhiRecord[]>(() => {
    if (!rawData?.length) return [];
    return (rawData as Record<string, unknown>[]).map(row => {
      const keys = Object.keys(row);
      const find = (...patterns: string[]): string => {
        const k = keys.find(k => {
          const n = k.toLowerCase().replace(/[\s_-]/g, '');
          return patterns.some(p => n === p.toLowerCase().replace(/[\s_-]/g, ''));
        });
        return k ? String(row[k] ?? '').trim() : '';
      };
      return {
        code:        find('code', 'empcode', 'employeecode', 'employeeid'),
        name:        find('name', 'employeename'),
        category:    find('category'),
        department:  find('department', 'dept'),
        designation: find('designation'),
        date:        find('date'),
        shiftName:   find('shiftname', 'shift name', 'shiftname', 'shift'),
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

  const [selectedDate, setSelectedDate] = useState(() => uniqueDates[0] || '');

  const [groupBy, setGroupBy] = useState<'department' | 'category' | 'designation'>('department');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [shiftFilter, setShiftFilter] = useState('all');

  const uniqueShifts = useMemo(() => {
    const s = new Set<string>();
    records.forEach(r => r.shiftName && s.add(r.shiftName));
    return Array.from(s).sort();
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (selectedDate && r.date !== selectedDate) return false;
      if (shiftFilter !== 'all' && r.shiftName !== shiftFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.designation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, selectedDate, shiftFilter, search]);

  const kpi = useMemo(() => {
    let present = 0, absent = 0, leave = 0, off = 0, late = 0;
    let shortHours = 0, totalDur = 0, durCount = 0;
    const leaveTypes: Record<string, number> = {};

    filtered.forEach(r => {
      const ti = typeInfo(r.type);
      if (ti.cat === 'present') {
        present++;
        const inM = parseTimeMinutes(r.inTime);
        if (inM !== -1 && inM > LATE_MINS) late++;
        const hrs = parseDurationHours(r.duration);
        if (hrs > 0) { totalDur += hrs; durCount++; if (hrs < 7) shortHours++; }
      } else if (ti.cat === 'absent') {
        absent++;
      } else if (ti.cat === 'leave') {
        leave++;
        const t = (r.type || '').trim().toUpperCase();
        leaveTypes[t] = (leaveTypes[t] || 0) + 1;
      } else {
        off++;
        const t = (r.type || '').trim().toUpperCase();
        leaveTypes[t] = (leaveTypes[t] || 0) + 1;
      }
    });

    const total = filtered.length;
    const avgH = durCount > 0 ? totalDur / durCount : 0;
    const avgDurationStr = durCount > 0
      ? `${Math.floor(avgH)}:${String(Math.round((avgH - Math.floor(avgH)) * 60)).padStart(2, '0')}h`
      : '—';

    return {
      total, present, absent, leave, off, late, shortHours, leaveTypes, avgDurationStr,
      presentPct: total ? Math.round(present / total * 100) : 0,
      absentPct:  total ? Math.round(absent  / total * 100) : 0,
      leavePct:   total ? Math.round(leave   / total * 100) : 0,
      latePct:    present ? Math.round(late   / present * 100) : 0,
    };
  }, [filtered]);

  const grouped = useMemo(() => {
    const g: Record<string, {
      name: string; present: number; absent: number; leave: number; off: number; late: number; records: DelhiRecord[];
    }> = {};
    filtered.forEach(r => {
      const key = (groupBy === 'department' ? r.department
                 : groupBy === 'category'   ? r.category
                 : r.designation) || 'Not Assigned';
      if (!g[key]) g[key] = { name: key, present: 0, absent: 0, leave: 0, off: 0, late: 0, records: [] };
      const ti = typeInfo(r.type);
      if (ti.cat === 'present') {
        g[key].present++;
        if (parseTimeMinutes(r.inTime) > LATE_MINS) g[key].late++;
      } else if (ti.cat === 'absent') {
        g[key].absent++;
      } else if (ti.cat === 'leave') {
        g[key].leave++;
      } else {
        g[key].off++;
      }
      g[key].records.push(r);
    });
    return Object.values(g).map(g => ({
      ...g,
      total: g.records.length,
      presentPct: g.records.length ? Math.round(g.present / g.records.length * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [filtered, groupBy]);

  const toggle = (name: string) => setExpanded(p => ({ ...p, [name]: !p[name] }));

  const exportCSV = () => {
    const headers = ['Code','Name','Category','Department','Designation','Date','Shift','In Time','Out Time','Duration','Type','Day','Remarks'];
    const rows = filtered.map(r => [r.code,r.name,r.category,r.department,r.designation,r.date,r.shiftName,r.inTime,r.outTime,r.duration,r.type,r.day,r.remarks]);
    const csv = '﻿' + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `HO_Attendance_${selectedDate || 'All'}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-2xl p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col xl:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-1 max-w-5xl">

          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text" placeholder="Search name, code, department..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl w-full text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 placeholder-slate-400 text-sm transition-all"
            />
          </div>

          <div className="flex gap-2 min-w-[260px]">
            <div className="flex items-center bg-slate-50 px-3 rounded-2xl border border-slate-200">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 mr-2" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Group</span>
            </div>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as typeof groupBy)}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-sm cursor-pointer">
              <option value="department">Department</option>
              <option value="category">Category</option>
              <option value="designation">Designation</option>
            </select>
          </div>

          {uniqueShifts.length > 1 && (
            <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-sm cursor-pointer">
              <option value="all">All Shifts</option>
              {uniqueShifts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        <div className="flex gap-3 w-full xl:w-auto justify-end items-center flex-wrap">
          {uniqueDates.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase pl-3">Date</span>
              <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none text-sm cursor-pointer shadow-sm">
                {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold rounded-2xl transition-all shadow-md hover:scale-[1.02] active:scale-95 text-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl w-fit">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.total}</h3>
          <p className="text-[10px] font-semibold text-slate-400">Employees</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500" />
          <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-xl w-fit">
            <UserCheck className="w-4 h-4" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Present</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.present}</h3>
          <p className="text-[10px] font-semibold text-emerald-600">{kpi.presentPct}% attendance</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-rose-500" />
          <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl w-fit">
            <CalendarOff className="w-4 h-4" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Absent</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.absent}</h3>
          <p className="text-[10px] font-semibold text-rose-500">{kpi.absentPct}% absent</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-orange-500" />
          <div className="p-2.5 bg-orange-50 text-orange-500 rounded-xl w-fit">
            <CalendarOff className="w-4 h-4" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">On Leave</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.leave}</h3>
          <p className="text-[10px] font-semibold text-slate-400">{kpi.leavePct}% on leave</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-sky-500" />
          <div className="p-2.5 bg-sky-50 text-sky-500 rounded-xl w-fit">
            <Coffee className="w-4 h-4" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Weekly Off</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.off}</h3>
          <p className="text-[10px] font-semibold text-slate-400">Scheduled off</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-500" />
          <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl w-fit">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Late In</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.late}</h3>
          <p className="text-[10px] font-semibold text-slate-400">{kpi.latePct}% of present</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-violet-500" />
          <div className="p-2.5 bg-violet-50 text-violet-500 rounded-xl w-fit">
            <Timer className="w-4 h-4" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avg Hours</p>
          <h3 className="text-2xl font-black text-slate-800">{kpi.avgDurationStr}</h3>
          <p className="text-[10px] font-semibold text-slate-400">{kpi.shortHours} short-hour days</p>
        </div>

      </div>

      {/* ── Leave Type Breakdown ─────────────────────────────────────── */}
      {Object.keys(kpi.leaveTypes).length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            Leave &amp; Off Breakdown
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(kpi.leaveTypes).sort((a, b) => b[1] - a[1]).map(([t, count]) => {
              const info = typeInfo(t);
              return (
                <div key={t} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${info.cls}`}>
                  <span>{info.label}</span>
                  <span className="bg-white/70 px-1.5 py-0.5 rounded-lg font-black">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Summary Table ────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Summary by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Click a row to expand individual employee records</p>
          </div>
          <span className="px-3 py-1 bg-violet-100 text-violet-700 font-bold text-xs rounded-full uppercase tracking-wider">
            {grouped.length} Groups
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Department / Group', 'Total', 'Present', 'Absent', 'Leave', 'WO', 'Late In', 'Attendance %'].map((h, i) => (
                  <th key={h} className={`py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${i === 0 ? 'px-7 w-1/4' : i === 7 ? 'px-7 text-right' : 'px-5 text-center'}`}>
                    {h}
                  </th>
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
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
                          {grp.present} ({grp.presentPct}%)
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${grp.absent > 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-400 bg-slate-100'}`}>
                          {grp.absent}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${grp.leave > 0 ? 'text-orange-700 bg-orange-50' : 'text-slate-400 bg-slate-100'}`}>
                          {grp.leave}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${grp.off > 0 ? 'text-sky-700 bg-sky-50' : 'text-slate-400 bg-slate-100'}`}>
                          {grp.off}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${grp.late > 0 ? 'text-amber-700 bg-amber-50' : 'text-slate-400 bg-slate-100'}`}>
                          {grp.late}
                        </span>
                      </td>
                      <td className="px-7 py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-slate-700">{grp.presentPct}%</span>
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                grp.presentPct >= 80 ? 'bg-emerald-500' : grp.presentPct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${grp.presentPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={8} className="px-7 py-5 bg-slate-50/60 border-t border-slate-100">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                            {grp.name} — {grp.records.length} Employees
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {grp.records.map((rec, i) => {
                              const ti = typeInfo(rec.type);
                              const durationHrs = parseDurationHours(rec.duration);
                              const isShort = ti.cat === 'present' && durationHrs > 0 && durationHrs < 7;
                              const inM = parseTimeMinutes(rec.inTime);
                              const isLate = ti.cat === 'present' && inM !== -1 && inM > LATE_MINS;
                              const isUnswipe = rec.inTime.toLowerCase().includes('unswipe');

                              return (
                                <div key={i} className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-2 hover:shadow-md transition-all ${isShort ? 'border-amber-300' : 'border-slate-200/70'}`}>

                                  {/* Name + Type badge */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-800 text-sm leading-tight truncate">{rec.name || '—'}</p>
                                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 font-mono">{rec.code}</p>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border flex-shrink-0 ${ti.cls}`}>
                                      {rec.type?.trim().toUpperCase() || ti.label}
                                    </span>
                                  </div>

                                  {/* Dept + Designation pills */}
                                  <div className="flex flex-wrap gap-1">
                                    {rec.department && (
                                      <span className="text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded">
                                        {rec.department}
                                      </span>
                                    )}
                                    {rec.designation && (
                                      <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                        {rec.designation}
                                      </span>
                                    )}
                                  </div>

                                  {/* Punch times row — only for present/half-day */}
                                  {(ti.cat === 'present') && (
                                    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${isUnswipe ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-700'}`}>
                                      <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isLate ? 'text-amber-500' : 'text-emerald-500'}`} />
                                      <span className={isLate ? 'font-bold text-amber-700' : ''}>{rec.inTime || '—'}</span>
                                      <span className="text-slate-300">→</span>
                                      <span>{rec.outTime || '—'}</span>
                                      {rec.duration && (
                                        <>
                                          <span className="text-slate-300 ml-1">|</span>
                                          <span className={`font-black ml-1 ${isShort ? 'text-amber-600' : durationHrs >= 9 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                            {rec.duration}h
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  )}

                                  {/* Flag badges */}
                                  {(isLate || isShort || (rec.shiftName && rec.shiftName !== 'General Shift')) && (
                                    <div className="flex flex-wrap gap-1">
                                      {isLate && (
                                        <span className="text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                          <AlertTriangle className="w-2.5 h-2.5" /> Late In
                                        </span>
                                      )}
                                      {isShort && (
                                        <span className="text-[9px] font-black bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                          <TrendingDown className="w-2.5 h-2.5" /> Short Hours
                                        </span>
                                      )}
                                      {rec.shiftName && rec.shiftName !== 'General Shift' && (
                                        <span className="text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                                          {rec.shiftName}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Remarks */}
                                  {rec.remarks?.trim() && (
                                    <p className="text-[10px] text-slate-500 italic bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 leading-relaxed">
                                      "{rec.remarks}"
                                    </p>
                                  )}
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

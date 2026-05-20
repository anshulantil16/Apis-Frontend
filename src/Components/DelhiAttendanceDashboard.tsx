import React, { useState, useMemo } from 'react';
import {
  Users, UserCheck, CalendarOff, Coffee, Search, Download,
  Clock, ChevronDown, ChevronUp, SlidersHorizontal,
  AlertTriangle, Timer, Activity, TrendingDown, MessageSquare,
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseDurationHours(dur: string): number {
  const m = (dur || '').match(/^(\d+):(\d{2})$/);
  return m ? parseInt(m[1], 10) + parseInt(m[2], 10) / 60 : 0;
}

function parseTimeMinutes(t: string): number {
  if (!t || t.toLowerCase().includes('unswipe') || !t.trim()) return -1;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : -1;
}

function fmtAvgDur(total: number, count: number): string {
  if (!count) return '—';
  const avg = total / count;
  return `${Math.floor(avg)}:${String(Math.round((avg - Math.floor(avg)) * 60)).padStart(2, '0')}h`;
}

const LATE_MINS = 10 * 60 + 30;

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

type RemarkKey = 'WFH' | 'OD' | 'OD_MERGE' | 'OTHER';
const REMARK_STYLE: Record<RemarkKey, { label: string; cls: string }> = {
  WFH:     { label: 'WFH',      cls: 'bg-blue-100 text-blue-800 border-blue-300'     },
  OD:      { label: 'On Duty',  cls: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  OD_MERGE:{ label: 'OD Merge', cls: 'bg-purple-100 text-purple-800 border-purple-300' },
  OTHER:   { label: 'Remark',   cls: 'bg-slate-100 text-slate-700 border-slate-200'   },
};

function remarkKey(remark: string): RemarkKey | null {
  const r = (remark || '').toLowerCase().trim();
  if (!r) return null;
  if (r.includes('wfh') || r.includes('work from home') || r.includes('work from office')) return 'WFH';
  if (r.includes('merge') || r.includes('in out process')) return 'OD_MERGE';
  if (r.includes('on duty') || r === 'od' || r.startsWith('od ') || r.includes('outstation')) return 'OD';
  return 'OTHER';
}

interface DelhiRecord {
  code: string; name: string; category: string; department: string; designation: string;
  date: string; shiftName: string; inTime: string; outTime: string;
  duration: string; type: string; day: string; remarks: string;
  raw: Record<string, unknown>;
}

// ── Component ────────────────────────────────────────────────────────────────

export function DelhiAttendanceDashboard({ rawData }: { rawData: unknown[] }) {

  const records = useMemo<DelhiRecord[]>(() => {
    if (!rawData?.length) return [];
    return (rawData as Record<string, unknown>[]).map(row => {
      const keys = Object.keys(row);
      const find = (...patterns: string[]): string => {
        const k = keys.find(k => patterns.some(p => k.toLowerCase().replace(/[\s_-]/g, '') === p.toLowerCase().replace(/[\s_-]/g, '')));
        return k ? String(row[k] ?? '').trim() : '';
      };
      return {
        code: find('code', 'empcode', 'employeecode', 'employeeid'),
        name: find('name', 'employeename'),
        category: find('category'),
        department: find('department', 'dept'),
        designation: find('designation'),
        date: find('date'),
        shiftName: find('shiftname', 'shiftname', 'shift name', 'shift'),
        inTime: find('intime', 'in time', 'in'),
        outTime: find('outtime', 'out time', 'out'),
        duration: find('duration'),
        type: find('type'),
        day: find('day'),
        remarks: find('remarks'),
        raw: row,
      };
    });
  }, [rawData]);

  const uniqueDates = useMemo(() => {
    const s = new Set<string>(); records.forEach(r => r.date && s.add(r.date));
    return Array.from(s).sort();
  }, [records]);

  const [dateFrom, setDateFrom] = useState(() => uniqueDates[0] || '');
  const [dateTo, setDateTo] = useState(() => uniqueDates[uniqueDates.length - 1] || '');

  const selectedDates = useMemo<Set<string>>(() => {
    if (!uniqueDates.length) return new Set();
    const lo = uniqueDates.indexOf(dateFrom), hi = uniqueDates.indexOf(dateTo);
    if (lo === -1 || hi === -1) return new Set(uniqueDates);
    return new Set(uniqueDates.slice(Math.min(lo, hi), Math.max(lo, hi) + 1));
  }, [uniqueDates, dateFrom, dateTo]);

  const isRange = selectedDates.size > 1;

  const [groupBy, setGroupBy] = useState<'department' | 'category' | 'designation'>('department');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [shiftFilter, setShiftFilter] = useState('all');

  const uniqueShifts = useMemo(() => {
    const s = new Set<string>(); records.forEach(r => r.shiftName && s.add(r.shiftName));
    return Array.from(s).sort();
  }, [records]);

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
      if (r.remarks?.trim()) {
        const rk = remarkKey(r.remarks);
        if (rk) remarkTypes[rk] = (remarkTypes[rk] || 0) + 1;
      }
    });

    const days = Object.values(byDate);
    const n = days.length || 1;
    const sum = (k: keyof typeof days[0]) => days.reduce((s, d) => s + d[k], 0);
    const avg = (k: keyof typeof days[0]) => Math.round(sum(k) / n);

    const present = isRange ? avg('present') : sum('present');
    const absent  = isRange ? avg('absent')  : sum('absent');
    const leave   = isRange ? avg('leave')   : sum('leave');
    const off     = isRange ? avg('off')     : sum('off');
    const late    = isRange ? avg('late')    : sum('late');
    const total   = isRange ? uniqueEmps.size : filtered.length;

    return {
      total, present, absent, leave, off, late, shortHours, leaveTypes, remarkTypes,
      avgDurStr: fmtAvgDur(totalDur, durCount),
      daysCount: n,
      presentPct: total ? Math.round(present / total * 100) : 0,
      absentPct:  total ? Math.round(absent  / total * 100) : 0,
      leavePct:   total ? Math.round(leave   / total * 100) : 0,
      latePct:    present ? Math.round(late  / present * 100) : 0,
    };
  }, [filtered, isRange]);

  const grouped = useMemo(() => {
    const g: Record<string, {
      name: string; present: number; absent: number; leave: number; off: number; late: number; withRemarks: number;
      employees: Record<string, DelhiRecord[]>; records: DelhiRecord[];
    }> = {};
    filtered.forEach(r => {
      const key = (groupBy === 'department' ? r.department : groupBy === 'category' ? r.category : r.designation) || 'Not Assigned';
      if (!g[key]) g[key] = { name: key, present: 0, absent: 0, leave: 0, off: 0, late: 0, withRemarks: 0, employees: {}, records: [] };
      const ti = typeInfo(r.type);
      if (ti.cat === 'present') { g[key].present++; if (parseTimeMinutes(r.inTime) > LATE_MINS) g[key].late++; }
      else if (ti.cat === 'absent') g[key].absent++;
      else if (ti.cat === 'leave')  g[key].leave++;
      else                          g[key].off++;
      if (r.remarks?.trim()) g[key].withRemarks++;
      const ek = r.code || r.name || '?';
      if (!g[key].employees[ek]) g[key].employees[ek] = [];
      g[key].employees[ek].push(r);
      g[key].records.push(r);
    });
    return Object.values(g).map(grp => ({
      ...grp,
      total: isRange ? Object.keys(grp.employees).length : grp.records.length,
      uniqueEmpCount: Object.keys(grp.employees).length,
      presentPct: grp.records.length ? Math.round(grp.present / grp.records.length * 100) : 0,
      employeeList: Object.entries(grp.employees)
        .map(([code, recs]) => ({ code, recs: recs.sort((a, b) => a.date.localeCompare(b.date)) }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    })).sort((a, b) => b.total - a.total);
  }, [filtered, groupBy, isRange]);

  const toggle = (n: string) => setExpanded(p => ({ ...p, [n]: !p[n] }));

  const exportCSV = () => {
    const hdr = ['Code','Name','Category','Department','Designation','Date','Shift','In Time','Out Time','Duration','Type','Day','Remarks'];
    const rows = filtered.map(r => [r.code,r.name,r.category,r.department,r.designation,r.date,r.shiftName,r.inTime,r.outTime,r.duration,r.type,r.day,r.remarks]);
    const csv = '﻿' + [hdr,...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `HO_Attendance_${dateFrom}${isRange?'_to_'+dateTo:''}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="space-y-5">

      {/* ── Filters bar ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search name, code, department..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 placeholder-slate-400 transition-all"
            />
          </div>
          {/* Group by */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as typeof groupBy)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none cursor-pointer">
              <option value="department">Department</option>
              <option value="category">Category</option>
              <option value="designation">Designation</option>
            </select>
          </div>
          {/* Shift filter */}
          {uniqueShifts.length > 1 && (
            <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none cursor-pointer">
              <option value="all">All Shifts</option>
              {uniqueShifts.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
          {/* Date range */}
          {uniqueDates.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</span>
              <select value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none cursor-pointer">
                {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span className="text-slate-300">→</span>
              <select value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none cursor-pointer">
                {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button
                onClick={() => { setDateFrom(uniqueDates[0]); setDateTo(uniqueDates[uniqueDates.length - 1]); }}
                className="px-2 py-0.5 text-[10px] font-black bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors">
                All
              </button>
              {isRange && (
                <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-lg">{selectedDates.size}d</span>
              )}
            </div>
          )}
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-violet-500/15 hover:scale-[1.02] active:scale-95 transition-all">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Range mode banner ── */}
      {isRange && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 border border-violet-100 rounded-xl">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
          <p className="text-xs font-semibold text-violet-700">
            Range mode · KPI cards show <span className="font-black">avg/day</span> across {kpi.daysCount} days · {kpi.total} unique employees
          </p>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total',       value: kpi.total,       sub: isRange ? 'Unique emps' : 'Employees',         border: 'border-t-2 border-slate-200',   icon: Users,       iconCls: 'bg-slate-100 text-slate-500'    },
          { label: 'Present',     value: kpi.present,     sub: `${kpi.presentPct}%${isRange ? ' avg' : ''}`,   border: 'border-t-2 border-emerald-400', icon: UserCheck,   iconCls: 'bg-emerald-50 text-emerald-500' },
          { label: 'Absent',      value: kpi.absent,      sub: `${kpi.absentPct}%${isRange ? ' avg' : ''}`,    border: 'border-t-2 border-rose-400',    icon: CalendarOff, iconCls: 'bg-rose-50 text-rose-500'       },
          { label: 'On Leave',    value: kpi.leave,       sub: `${kpi.leavePct}%${isRange ? ' avg' : ''}`,     border: 'border-t-2 border-orange-400',  icon: CalendarOff, iconCls: 'bg-orange-50 text-orange-500'   },
          { label: 'Weekly Off',  value: kpi.off,         sub: isRange ? 'avg/day' : 'Scheduled',              border: 'border-t-2 border-sky-400',     icon: Coffee,      iconCls: 'bg-sky-50 text-sky-500'         },
          { label: 'Late In',     value: kpi.late,        sub: `${kpi.latePct}% of present`,                   border: 'border-t-2 border-amber-400',   icon: AlertTriangle,iconCls:'bg-amber-50 text-amber-500'    },
          { label: 'Avg Hours',   value: kpi.avgDurStr,   sub: `${kpi.shortHours} short days`,                 border: 'border-t-2 border-violet-400',  icon: Timer,       iconCls: 'bg-violet-50 text-violet-500'   },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-2xl border border-slate-100 ${c.border} p-4 shadow-sm hover:shadow-md transition-all`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${c.iconCls}`}>
              <c.icon className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.label}</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">{c.value}</p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Breakdowns row ── */}
      {(Object.keys(kpi.leaveTypes).length > 0 || Object.keys(kpi.remarkTypes).length > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {Object.keys(kpi.leaveTypes).length > 0 && (
            <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Leave &amp; Off
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(kpi.leaveTypes).sort((a,b)=>b[1]-a[1]).map(([t,n]) => {
                  const info = typeInfo(t);
                  return (
                    <span key={t} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${info.cls}`}>
                      {info.label} <span className="bg-white/70 px-1 rounded font-black">{n}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {Object.keys(kpi.remarkTypes).length > 0 && (
            <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> Remarks{isRange ? ' (total)' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(kpi.remarkTypes).sort((a,b)=>b[1]-a[1]).map(([rk,n]) => {
                  const style = REMARK_STYLE[rk as RemarkKey] ?? REMARK_STYLE.OTHER;
                  return (
                    <span key={rk} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${style.cls}`}>
                      {style.label} <span className="bg-white/70 px-1 rounded font-black">{n}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Summary table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800">
              By {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
              {isRange && <span className="ml-2 text-[10px] font-semibold text-violet-400 normal-case tracking-normal">totals across range</span>}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Click to expand employee records</p>
          </div>
          <span className="px-2.5 py-1 bg-violet-50 text-violet-700 font-bold text-[10px] rounded-full border border-violet-200 uppercase tracking-wider">{grouped.length} groups</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                {[
                  { h: groupBy.toUpperCase(), cls: 'px-6 w-1/4 text-left' },
                  { h: isRange ? 'EMPS' : 'TOTAL', cls: 'px-4 text-center' },
                  { h: 'PRESENT',  cls: 'px-4 text-center' },
                  { h: 'ABSENT',   cls: 'px-4 text-center' },
                  { h: 'LEAVE',    cls: 'px-4 text-center' },
                  { h: 'WO',       cls: 'px-4 text-center' },
                  { h: 'LATE IN',  cls: 'px-4 text-center' },
                  { h: 'REMARKS',  cls: 'px-4 text-center' },
                  { h: 'ATT %',    cls: 'px-6 text-right'  },
                ].map(c => (
                  <th key={c.h} className={`py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${c.cls}`}>{c.h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {grouped.map(grp => {
                const open = !!expanded[grp.name];
                return (
                  <React.Fragment key={grp.name}>
                    <tr onClick={() => toggle(grp.name)} className="hover:bg-slate-50/60 cursor-pointer transition-colors group">
                      <td className="px-6 py-3.5 flex items-center gap-2 font-bold text-slate-700">
                        {open ? <ChevronUp className="w-3.5 h-3.5 text-violet-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-400 transition-colors" />}
                        <span className="group-hover:text-violet-700 transition-colors text-sm">{grp.name}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600 font-semibold text-sm">{grp.total}</td>
                      <td className="px-4 py-3.5 text-center"><span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{grp.present} ({grp.presentPct}%)</span></td>
                      <td className="px-4 py-3.5 text-center"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${grp.absent > 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-300 bg-slate-50'}`}>{grp.absent}</span></td>
                      <td className="px-4 py-3.5 text-center"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${grp.leave > 0 ? 'text-orange-600 bg-orange-50' : 'text-slate-300 bg-slate-50'}`}>{grp.leave}</span></td>
                      <td className="px-4 py-3.5 text-center"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${grp.off > 0 ? 'text-sky-600 bg-sky-50' : 'text-slate-300 bg-slate-50'}`}>{grp.off}</span></td>
                      <td className="px-4 py-3.5 text-center"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${grp.late > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-300 bg-slate-50'}`}>{grp.late}</span></td>
                      <td className="px-4 py-3.5 text-center"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${grp.withRemarks > 0 ? 'text-blue-600 bg-blue-50' : 'text-slate-300 bg-slate-50'}`}>{grp.withRemarks}</span></td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-slate-700">{grp.presentPct}%</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${grp.presentPct >= 80 ? 'bg-emerald-500' : grp.presentPct >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${grp.presentPct}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
  
                    {open && (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 bg-slate-50/50">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                            {grp.name} · {isRange ? `${grp.uniqueEmpCount} employees` : `${grp.records.length} records`}
                          </p>

                          {isRange ? (
                            /* Range: per-employee attendance log */
                            <div className="space-y-2">
                              {grp.employeeList.map(emp => {
                                const pC = emp.recs.filter(r => typeInfo(r.type).cat === 'present').length;
                                const aC = emp.recs.filter(r => typeInfo(r.type).cat === 'absent').length;
                                const lC = emp.recs.filter(r => typeInfo(r.type).cat === 'leave').length;
                                const oC = emp.recs.filter(r => typeInfo(r.type).cat === 'off').length;
                                const durTotal = emp.recs.reduce((s, r) => s + parseDurationHours(r.duration), 0);
                                const durN = emp.recs.filter(r => typeInfo(r.type).cat === 'present' && parseDurationHours(r.duration) > 0).length;
                                const first = emp.recs[0];
                                return (
                                  <div key={emp.code} className="bg-white rounded-xl border border-slate-200/70 shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 border-b border-slate-100">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-bold text-slate-800 text-sm">{first?.name || '—'}</span>
                                        <span className="text-[10px] font-bold text-slate-400 font-mono">{emp.code}</span>
                                        {first?.department && <span className="text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded">{first.department}</span>}
                                        {first?.designation && <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{first.designation}</span>}
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">{pC}P</span>
                                        {aC > 0 && <span className="text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">{aC}A</span>}
                                        {lC > 0 && <span className="text-[10px] font-black bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded">{lC}L</span>}
                                        {oC > 0 && <span className="text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded">{oC}W</span>}
                                        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">avg {fmtAvgDur(durTotal, durN)}</span>
                                      </div>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                      {emp.recs.map((rec, ri) => {
                                        const ti = typeInfo(rec.type);
                                        const dh = parseDurationHours(rec.duration);
                                        const isShort = ti.cat === 'present' && dh > 0 && dh < 7;
                                        const isLate = ti.cat === 'present' && parseTimeMinutes(rec.inTime) > LATE_MINS;
                                        const rk = remarkKey(rec.remarks);
                                        const rs = rk ? REMARK_STYLE[rk] : null;
                                        return (
                                          <div key={ri} className={`flex items-center gap-3 px-4 py-1.5 text-xs ${isShort ? 'bg-amber-50/40' : ''}`}>
                                            <span className="font-bold text-slate-500 w-20 flex-shrink-0">{rec.date}</span>
                                            <span className={`w-14 flex-shrink-0 font-bold ${isLate ? 'text-amber-600' : 'text-slate-600'}`}>{ti.cat === 'present' && !rec.inTime.toLowerCase().includes('unswipe') ? rec.inTime : '—'}</span>
                                            <span className="text-slate-300">→</span>
                                            <span className="w-14 flex-shrink-0 text-slate-600 font-bold">{ti.cat === 'present' && !rec.outTime.toLowerCase().includes('unswipe') ? rec.outTime : '—'}</span>
                                            <span className={`w-12 flex-shrink-0 font-black ${isShort ? 'text-amber-600' : dh >= 9 ? 'text-emerald-600' : 'text-slate-600'}`}>{rec.duration ? rec.duration+'h' : '—'}</span>
                                            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${ti.cls}`}>{rec.type?.trim().toUpperCase() || '—'}</span>
                                            <div className="flex gap-1 flex-1 flex-wrap">
                                              {isLate && <span className="text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-1 py-0.5 rounded flex items-center gap-0.5"><AlertTriangle className="w-2 h-2" />Late</span>}
                                              {isShort && <span className="text-[9px] font-black bg-orange-100 text-orange-700 border border-orange-200 px-1 py-0.5 rounded flex items-center gap-0.5"><TrendingDown className="w-2 h-2" />Short</span>}
                                              {rs && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${rs.cls}`}>{rs.label}</span>}
                                              {!rk && rec.remarks?.trim() && <span className="text-[9px] text-slate-400 italic truncate max-w-[120px]">"{rec.remarks}"</span>}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            /* Single date: card grid */
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                              {grp.records.map((rec, i) => {
                                const ti = typeInfo(rec.type);
                                const dh = parseDurationHours(rec.duration);
                                const isShort = ti.cat === 'present' && dh > 0 && dh < 7;
                                const isLate = ti.cat === 'present' && parseTimeMinutes(rec.inTime) > LATE_MINS;
                                const rk = remarkKey(rec.remarks);
                                const rs = rk ? REMARK_STYLE[rk] : null;
                                return (
                                  <div key={i} className={`bg-white rounded-xl border p-3.5 flex flex-col gap-2 hover:shadow-sm transition-all ${isShort ? 'border-amber-200' : 'border-slate-100'}`}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate">{rec.name || '—'}</p>
                                        <p className="text-[10px] font-bold text-slate-400 font-mono">{rec.code}</p>
                                      </div>
                                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${ti.cls}`}>{rec.type?.trim().toUpperCase() || '—'}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {rec.department && <span className="text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded">{rec.department}</span>}
                                      {rec.designation && <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{rec.designation}</span>}
                                    </div>
                                    {ti.cat === 'present' && (
                                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${rec.inTime.toLowerCase().includes('unswipe') ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-700'}`}>
                                        <Clock className={`w-3 h-3 flex-shrink-0 ${isLate ? 'text-amber-500' : 'text-emerald-500'}`} />
                                        <span className={isLate ? 'font-bold text-amber-700' : ''}>{rec.inTime}</span>
                                        <span className="text-slate-300">→</span>
                                        <span>{rec.outTime}</span>
                                        {rec.duration && <><span className="text-slate-200 mx-0.5">|</span><span className={`font-black ${isShort ? 'text-amber-600' : dh >= 9 ? 'text-emerald-600' : ''}`}>{rec.duration}h</span></>}
                                      </div>
                                    )}
                                    {(isLate || isShort || rs || (rec.shiftName && rec.shiftName !== 'General Shift')) && (
                                      <div className="flex flex-wrap gap-1">
                                        {isLate && <span className="text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />Late In</span>}
                                        {isShort && <span className="text-[9px] font-black bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded flex items-center gap-0.5"><TrendingDown className="w-2.5 h-2.5" />Short Hrs</span>}
                                        {rs && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${rs.cls}`}>{rs.label}</span>}
                                        {rec.shiftName && rec.shiftName !== 'General Shift' && <span className="text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">{rec.shiftName}</span>}
                                      </div>
                                    )}
                                    {rec.remarks?.trim() && (
                                      <p className="text-[10px] text-slate-500 italic bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 leading-relaxed">"{rec.remarks}"</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
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

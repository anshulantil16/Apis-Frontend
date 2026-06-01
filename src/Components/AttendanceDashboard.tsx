import React, { useState, useMemo } from 'react';
import {
  Users, UserCheck, CalendarOff, Coffee, CheckSquare, Search,
  Download, MapPin, User, Clock, ChevronDown, ChevronUp, SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react';

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

interface AttendanceRecord {
  zone: string; subzone: string; reportingTo: string; status: string;
  attendance: string; attendanceTime: string; attendanceImage: string;
  presentType: string; eodTime: string; location: string; userType: string;
  userName: string; userId: string; empId: string; designation: string;
  leaveDetails: string; forDate: string; raw: Record<string, unknown>;
}

export function AttendanceDashboard({ rawData }: { rawData: unknown[] }) {
  const normalized = useMemo<AttendanceRecord[]>(() => {
    if (!rawData?.length) return [];
    return (rawData as Record<string, unknown>[]).map(row => {
      const keys = Object.keys(row);
      const get = (...patterns: string[]): string => {
        const k = keys.find(k => {
          const lk = k.toLowerCase().replace(/[\s_-]/g, '');
          return patterns.some(p => {
            const lp = p.toLowerCase().replace(/[\s_-]/g, '');
            return lp === 'attendance' ? lk === 'attendance' : lk.includes(lp);
          });
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

  const kpi = useMemo(() => {
    let present = 0, leave = 0, wo = 0, eod = 0, invalidPunch = 0;
    filtered.forEach(r => {
      if (isPresent(r)) present++;
      else if (isLeave(r)) leave++;
      else if (isWO(r)) wo++;
      if (r.eodTime) eod++;
      if (missingFieldPunch(r)) invalidPunch++;
    });
    const total = filtered.length;
    return {
      total, present, leave, wo, eod, invalidPunch,
      presentPct: total ? Math.round(present / total * 100) : 0,
      leavePct:   total ? Math.round(leave   / total * 100) : 0,
      woPct:      total ? Math.round(wo      / total * 100) : 0,
      eodPct:     present ? Math.round(eod   / present * 100) : 0,
    };
  }, [filtered]);

  const grouped = useMemo(() => {
    const g: Record<string, { name: string; total: number; present: number; leave: number; wo: number; eod: number; invalidPunch: number; records: AttendanceRecord[] }> = {};
    filtered.forEach(r => {
      const key = String(r[groupBy] || 'Not Assigned').trim() || 'Not Assigned';
      if (!g[key]) g[key] = { name: key, total: 0, present: 0, leave: 0, wo: 0, eod: 0, invalidPunch: 0, records: [] };
      g[key].total++;
      if (isPresent(r)) g[key].present++;
      else if (isLeave(r)) g[key].leave++;
      else if (isWO(r)) g[key].wo++;
      if (r.eodTime) g[key].eod++;
      if (missingFieldPunch(r)) g[key].invalidPunch++;
      g[key].records.push(r);
    });
    return Object.values(g).map(g => ({
      ...g,
      presentPct: g.total ? Math.round(g.present / g.total * 100) : 0,
      eodPct: g.present ? Math.round(g.eod / g.present * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [filtered, groupBy]);

  const toggle = (name: string) => setExpandedGroups(p => ({ ...p, [name]: !p[name] }));

  const exportCSV = () => {
    const hdr = [groupBy.toUpperCase(), 'Total', 'Present', 'Present %', 'Leave', 'WO', 'EOD', 'EOD %'];
    const rows = grouped.map(g => [g.name, g.total, g.present, `${g.presentPct}%`, g.leave, g.wo, g.eod, `${g.eodPct}%`]);
    const csv = '﻿' + [hdr, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `Attendance_${groupBy}_${selectedDate || 'All'}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="space-y-5">

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
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
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/15 hover:scale-[1.02] active:scale-95 transition-all">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Active',  value: kpi.total,        sub: 'Total workforce',          pct: null,             icon: Users,         iconCls: 'bg-slate-100 text-slate-600',    valCls: 'text-slate-800',   grad: 'from-white to-slate-50',    ring: 'border-slate-200' },
          { label: 'Present',       value: kpi.present,      sub: 'Marked attendance',        pct: kpi.presentPct,   icon: UserCheck,     iconCls: 'bg-emerald-100 text-emerald-600',valCls: 'text-emerald-700', grad: 'from-white to-emerald-50/60',ring: 'border-emerald-200' },
          { label: 'On Leave',      value: kpi.leave,        sub: 'Approved leave',           pct: kpi.leavePct,     icon: CalendarOff,   iconCls: 'bg-rose-100 text-rose-600',      valCls: 'text-rose-700',    grad: 'from-white to-rose-50/60',   ring: 'border-rose-200' },
          { label: 'Weekly Off',    value: kpi.wo,           sub: 'Rest day',                 pct: kpi.woPct,        icon: Coffee,        iconCls: 'bg-sky-100 text-sky-600',        valCls: 'text-sky-700',     grad: 'from-white to-sky-50/60',    ring: 'border-sky-200' },
          { label: 'EOD Done',      value: kpi.eod,          sub: 'Of present employees',     pct: kpi.eodPct,       icon: CheckSquare,   iconCls: 'bg-indigo-100 text-indigo-600',  valCls: 'text-indigo-700',  grad: 'from-white to-indigo-50/60', ring: 'border-indigo-200' },
          { label: 'Invalid Punch', value: kpi.invalidPunch, sub: 'Missing in / out',         pct: null,             icon: AlertTriangle, iconCls: 'bg-red-100 text-red-600',        valCls: 'text-red-700',     grad: 'from-white to-red-50/60',    ring: 'border-red-200' },
        ].map(c => (
          <div key={c.label} className={`bg-gradient-to-br ${c.grad} rounded-2xl border ${c.ring} p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${c.iconCls} shadow-sm`}>
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

      {/* ── Summary table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
                {['Group', 'Total', 'Present', 'Leave', 'WO', 'EOD Done', 'Attendance %'].map((h, i) => (
                  <th key={h} className={`py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider ${i === 0 ? 'px-6 w-1/3' : i === 6 ? 'px-6 text-right' : 'px-4 text-center'}`}>{h}</th>
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
                        <td colSpan={7} className="px-6 py-4 bg-slate-50/50">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                            {grp.name} · {grp.records.length} employees
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                            {grp.records.map((rec, i) => {
                              const present = isPresent(rec), leave = isLeave(rec), wo = isWO(rec);
                              const mp = missingFieldPunch(rec);
                              return (
                                <div key={i} className={`bg-white rounded-xl border p-4 flex gap-3 hover:shadow-md transition-all ${
                                  mp ? 'border-red-300 bg-red-50/40 ring-1 ring-red-200' : 'border-slate-150 hover:border-slate-200'
                                }`}>
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
                                      <span className={`flex items-center gap-1 ${mp === 'no_in' ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                        <Clock className={`w-3 h-3 ${mp === 'no_in' ? 'text-red-500' : 'text-emerald-500'}`} />
                                        {isValidTime(rec.attendanceTime)
                                          ? rec.attendanceTime
                                          : mp === 'no_in'
                                            ? 'No In Punch'
                                            : '—'}
                                      </span>
                                      {(isValidTime(rec.eodTime) || mp === 'no_out') && (
                                        <span className={`flex items-center gap-1 ${mp === 'no_out' ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                          <Clock className={`w-3 h-3 ${mp === 'no_out' ? 'text-red-500' : 'text-indigo-500'}`} />
                                          {isValidTime(rec.eodTime)
                                            ? rec.eodTime
                                            : 'No Out Punch'}
                                        </span>
                                      )}
                                      {rec.location && getMapsLink(rec.location)
                                        ? <a href={getMapsLink(rec.location)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-amber-600 font-bold hover:underline"><MapPin className="w-3 h-3" />Map</a>
                                        : rec.location ? <span className="flex items-center gap-1 text-slate-400"><MapPin className="w-3 h-3" />{rec.location}</span> : null}
                                    </div>
                                    {mp && (
                                      <span className="text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-lg w-fit flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {mp === 'no_out' ? 'Missing Out Punch' : 'Missing In Punch'}
                                      </span>
                                    )}
                                    {!mp && rec.designation && <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg font-bold w-fit">{rec.designation}</span>}
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

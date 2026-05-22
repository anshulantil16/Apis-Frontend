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

  const hasPunch = (t: string) => !!t?.trim() && t.trim() !== '' && t.trim() !== '0:00' && t.trim() !== '00:00';

  const missingFieldPunch = (r: AttendanceRecord): 'no_out' | 'no_in' | null => {
    if (!isPresent(r)) return null;
    const hasIn  = hasPunch(r.attendanceTime);
    const hasOut = hasPunch(r.eodTime);
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
          { label: 'Total Active',   value: kpi.total,        sub: 'Workforce',                  border: 'border-t-2 border-slate-200',   icon: Users,          iconCls: 'bg-slate-100 text-slate-500',    valCls: '' },
          { label: 'Present',        value: kpi.present,      sub: `${kpi.presentPct}%`,          border: 'border-t-2 border-emerald-400', icon: UserCheck,      iconCls: 'bg-emerald-50 text-emerald-500', valCls: 'text-emerald-700' },
          { label: 'On Leave',       value: kpi.leave,        sub: `${kpi.leavePct}%`,            border: 'border-t-2 border-rose-400',    icon: CalendarOff,    iconCls: 'bg-rose-50 text-rose-500',       valCls: '' },
          { label: 'Weekly Off',     value: kpi.wo,           sub: `${kpi.woPct}%`,               border: 'border-t-2 border-sky-400',     icon: Coffee,         iconCls: 'bg-sky-50 text-sky-500',         valCls: '' },
          { label: 'EOD Completed',  value: kpi.eod,          sub: `${kpi.eodPct}% of present`,   border: 'border-t-2 border-indigo-400',  icon: CheckSquare,    iconCls: 'bg-indigo-50 text-indigo-500',   valCls: '' },
          { label: 'Invalid Punch',  value: kpi.invalidPunch, sub: 'Missing in or out',           border: 'border-t-2 border-red-500',     icon: AlertTriangle,  iconCls: 'bg-red-50 text-red-500',         valCls: 'text-red-600' },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-2xl border border-slate-100 ${c.border} p-4 shadow-sm hover:shadow-md transition-all`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${c.iconCls}`}>
              <c.icon className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.label}</p>
            <p className={`text-2xl font-black text-slate-800 mt-0.5 ${c.valCls}`}>{c.value}</p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{c.sub}</p>
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
          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold text-[10px] rounded-full border border-amber-200 uppercase tracking-wider">{grouped.length} groups</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                {['Group', 'Total', 'Present', 'Leave', 'WO', 'EOD Done', 'Attendance %'].map((h, i) => (
                  <th key={h} className={`py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${i === 0 ? 'px-6 w-1/3' : i === 6 ? 'px-6 text-right' : 'px-4 text-center'}`}>{h}</th>
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
                          <span className="flex items-center gap-0.5 text-[9px] font-black bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">
                            ⚠ {grp.invalidPunch} invalid
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
                        <td colSpan={7} className="px-6 py-4 bg-slate-50/50">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                            {grp.name} · {grp.records.length} employees
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                            {grp.records.map((rec, i) => {
                              const present = isPresent(rec), leave = isLeave(rec), wo = isWO(rec);
                              const mp = missingFieldPunch(rec);
                              return (
                                <div key={i} className={`bg-white rounded-xl border p-3.5 flex gap-3 hover:shadow-sm transition-all ${
                                  mp ? 'border-red-300 bg-red-50/30' : 'border-slate-100'
                                }`}>
                                  {rec.attendanceImage && (
                                    <a href={rec.attendanceImage} target="_blank" rel="noopener noreferrer"
                                      className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
                                      <img src={rec.attendanceImage} alt={rec.userName} className="w-full h-full object-cover" />
                                    </a>
                                  )}
                                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-xs truncate">{rec.userName}</p>
                                        <p className="text-[9px] text-slate-400 font-bold">{rec.empId || rec.userId || '—'}</p>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        {mp && <span className="text-[9px] font-black bg-red-100 text-red-700 border border-red-300 px-1 py-0.5 rounded-full flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />INVALID</span>}
                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                          present ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                          leave   ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                          wo      ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                                    'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}>
                                          {present ? 'P' : leave ? 'L' : wo ? 'WO' : rec.attendance || '?'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-medium">
                                      {rec.reportingTo && <span className="flex items-center gap-0.5 text-slate-400"><User className="w-2.5 h-2.5" />{rec.reportingTo}</span>}
                                      <span className={`flex items-center gap-0.5 ${mp === 'no_in' ? 'text-red-500 font-black' : 'text-slate-400'}`}>
                                        <Clock className={`w-2.5 h-2.5 ${mp === 'no_in' ? 'text-red-400' : 'text-emerald-400'}`} />
                                        {rec.attendanceTime || <span className="text-red-500 font-black">NO IN PUNCH</span>}
                                      </span>
                                      {(rec.eodTime || mp === 'no_out') && (
                                        <span className={`flex items-center gap-0.5 ${mp === 'no_out' ? 'text-red-500 font-black' : 'text-slate-400'}`}>
                                          <Clock className={`w-2.5 h-2.5 ${mp === 'no_out' ? 'text-red-400' : 'text-indigo-400'}`} />
                                          {rec.eodTime || <span className="text-red-500 font-black">NO OUT PUNCH</span>}
                                        </span>
                                      )}
                                      {rec.location && getMapsLink(rec.location)
                                        ? <a href={getMapsLink(rec.location)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-amber-500 font-bold"><MapPin className="w-2.5 h-2.5" />Map</a>
                                        : rec.location ? <span className="flex items-center gap-0.5 text-slate-400"><MapPin className="w-2.5 h-2.5" />{rec.location}</span> : null}
                                    </div>
                                    {mp && (
                                      <span className="text-[9px] font-black bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded w-fit flex items-center gap-0.5">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        {mp === 'no_out' ? 'Missing Out Punch' : 'Missing In Punch'}
                                      </span>
                                    )}
                                    {!mp && rec.designation && <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold w-fit">{rec.designation}</span>}
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

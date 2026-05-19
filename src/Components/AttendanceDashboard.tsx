import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  CalendarOff, 
  Coffee, 
  CheckSquare, 
  Search, 
  Download, 
  MapPin, 
  User, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal
} from 'lucide-react';

const getImageUrl = (htmlStr: string): string => {
  if (!htmlStr) return '';
  const trimmed = htmlStr.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const srcMatch = trimmed.match(/src\s*=\s*['"]([^'"]+)['"]/i);
  if (srcMatch && srcMatch[1]) {
    return srcMatch[1];
  }
  const hrefMatch = trimmed.match(/href\s*=\s*['"]([^'"]+)['"]/i);
  if (hrefMatch && hrefMatch[1]) {
    return hrefMatch[1];
  }
  return '';
};

const getMapsLink = (loc: string): string => {
  if (!loc) return '';
  const trimmed = loc.trim();
  const isCoordinates = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(trimmed);
  if (isCoordinates) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
  }
  return '';
};

interface AttendanceDashboardProps {
  rawData: any[];
}

interface AttendanceRecord {
  zone: string;
  subzone: string;
  reportingTo: string;
  status: string;
  attendance: string;
  attendanceTime: string;
  attendanceImage: string;
  presentType: string;
  eodTime: string;
  location: string;
  userType: string;
  userName: string;
  userId: string;
  empId: string;
  designation: string;
  leaveDetails: string;
  forDate: string;
  raw: Record<string, any>;
}

export function AttendanceDashboard({ rawData }: AttendanceDashboardProps) {
  // Normalize the columns from uploaded sheet
  const normalizedData = useMemo<AttendanceRecord[]>(() => {
    if (!rawData || rawData.length === 0) return [];

    return rawData.map(row => {
      const keys = Object.keys(row);
      
      const getVal = (patterns: string[]): string => {
        const foundKey = keys.find(k => {
          const lk = k.toLowerCase().replace(/[\s_-]/g, '');
          return patterns.some(p => {
            const lp = p.toLowerCase().replace(/[\s_-]/g, '');
            // For columns like "attendance", we want to avoid matching "attendance time" or "attendance image"
            if (lp === 'attendance') {
              return lk === 'attendance';
            }
            return lk.includes(lp);
          });
        });
        return foundKey ? String(row[foundKey]).trim() : '';
      };

      return {
        zone: getVal(['zone']),
        subzone: getVal(['subzone', 'sub zone']),
        reportingTo: getVal(['reporting to', 'reporting manager', 'reportingto', 'manager']),
        status: getVal(['status']),
        attendance: getVal(['attendance']),
        attendanceTime: getVal(['attendance time', 'attendancetime']),
        attendanceImage: getImageUrl(getVal(['attendance image', 'attendanceimage', 'image', 'photo'])),
        presentType: getVal(['present type', 'presenttype']),
        eodTime: getVal(['eod time', 'eodtime', 'eod']),
        location: getVal(['location', 'state', 'hq', 'district']),
        userType: getVal(['user type', 'usertype']),
        userName: getVal(['user name', 'username', 'employee name', 'name']),
        userId: getVal(['user id', 'userid']),
        empId: getVal(['emp id', 'empid', 'employee code', 'emp code']),
        designation: getVal(['designation']),
        leaveDetails: getVal(['leave details', 'leavedetails']),
        forDate: getVal(['for date', 'date']),
        raw: row
      };
    });
  }, [rawData]);

  // List of unique dates in the sheet
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    normalizedData.forEach(r => {
      if (r.forDate) dates.add(r.forDate);
    });
    return Array.from(dates).sort();
  }, [normalizedData]);

  // Selectable Date filter (defaults to first date found)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return uniqueDates[0] || '';
  });

  // Keep selectedDate in sync when uniqueDates load
  React.useEffect(() => {
    if (uniqueDates.length > 0 && !selectedDate) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates, selectedDate]);

  // Group By State (e.g. 'zone', 'subzone', 'reportingTo', 'location', 'userType', 'designation')
  const [groupByColumn, setGroupByColumn] = useState<keyof AttendanceRecord>('zone');

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Expanded group rows in summary table
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Filtered data based on selected Date & Search query
  const filteredData = useMemo(() => {
    return normalizedData.filter(r => {
      const matchDate = selectedDate ? r.forDate === selectedDate : true;
      const matchSearch = searchQuery 
        ? (
            r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.reportingTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.subzone.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.location.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : true;
      return matchDate && matchSearch;
    });
  }, [normalizedData, selectedDate, searchQuery]);

  // Overall calculations for KPI cards
  const summaryKPIs = useMemo(() => {
    let totalActive = 0;
    let present = 0;
    let leave = 0;
    let wo = 0;
    let eod = 0;

    // Determine if status column is helpful
    const hasStatusCol = filteredData.some(r => r.status !== '');

    filteredData.forEach(r => {
      // Total Active calculation
      const isActive = hasStatusCol 
        ? r.status.toLowerCase() === 'active' 
        : true; // default all to active if status col isn't active or missing
      
      if (isActive) {
        totalActive++;
      } else {
        // If employee is inactive, skip from active metrics or count separately
        // Usually we count active workers for the day
        totalActive++;
      }

      // Attendance check
      const attLower = r.attendance.toLowerCase();
      const typeLower = r.presentType.toLowerCase();

      if (attLower.includes('present') || typeLower.includes('present') || attLower === 'p') {
        present++;
      } else if (attLower.includes('leave') || attLower === 'l' || r.leaveDetails !== '') {
        leave++;
      } else if (attLower.includes('wo') || attLower.includes('weekly') || attLower.includes('off')) {
        wo++;
      }

      // EOD Submitted check
      if (r.eodTime && r.eodTime !== '') {
        eod++;
      }
    });

    return {
      totalActive,
      present,
      leave,
      wo,
      eod,
      presentPercent: totalActive ? Math.round((present / totalActive) * 100) : 0,
      leavePercent: totalActive ? Math.round((leave / totalActive) * 100) : 0,
      woPercent: totalActive ? Math.round((wo / totalActive) * 100) : 0,
      eodPercent: present ? Math.round((eod / present) * 100) : 0 // % of present workers who did EOD
    };
  }, [filteredData]);

  // Grouped Summary Data
  const groupedData = useMemo(() => {
    const groups: Record<string, {
      name: string;
      totalActive: number;
      present: number;
      leave: number;
      wo: number;
      eod: number;
      records: AttendanceRecord[];
    }> = {};

    filteredData.forEach(r => {
      const groupValue = String(r[groupByColumn] || 'Not Assigned').trim();
      const groupKey = groupValue || 'Not Assigned';

      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: groupKey,
          totalActive: 0,
          present: 0,
          leave: 0,
          wo: 0,
          eod: 0,
          records: []
        };
      }

      const grp = groups[groupKey];
      grp.totalActive++;

      const attLower = r.attendance.toLowerCase();
      const typeLower = r.presentType.toLowerCase();

      if (attLower.includes('present') || typeLower.includes('present') || attLower === 'p') {
        grp.present++;
      } else if (attLower.includes('leave') || attLower === 'l' || r.leaveDetails !== '') {
        grp.leave++;
      } else if (attLower.includes('wo') || attLower.includes('weekly') || attLower.includes('off')) {
        grp.wo++;
      }

      if (r.eodTime && r.eodTime !== '') {
        grp.eod++;
      }

      grp.records.push(r);
    });

    return Object.values(groups).map(g => {
      return {
        ...g,
        presentPercent: g.totalActive ? Math.round((g.present / g.totalActive) * 100) : 0,
        leavePercent: g.totalActive ? Math.round((g.leave / g.totalActive) * 100) : 0,
        woPercent: g.totalActive ? Math.round((g.wo / g.totalActive) * 100) : 0,
        eodPercent: g.present ? Math.round((g.eod / g.present) * 100) : 0
      };
    }).sort((a, b) => b.totalActive - a.totalActive);
  }, [filteredData, groupByColumn]);

  const toggleGroupExpand = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const exportSummaryCSV = () => {
    const csvHeaders = [
      groupByColumn.toUpperCase(),
      'Total Strength',
      'Present Count',
      'Present %',
      'Leave Count',
      'Leave %',
      'Weekly Off (WO)',
      'EOD Completed',
      'EOD Completed %'
    ];
    
    const csvRows = groupedData.map(g => [
      g.name,
      g.totalActive,
      g.present,
      `${g.presentPercent}%`,
      g.leave,
      `${g.leavePercent}%`,
      g.wo,
      g.eod,
      `${g.eodPercent}%`
    ]);
    
    // Add BOM for Excel UTF-8 display compatibility
    const csvContent = "\uFEFF" + [csvHeaders.join(','), ...csvRows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `Apis_Attendance_Summary_By_${groupByColumn}_${selectedDate || 'All'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
      
      {/* Filters Toolbar */}
      <div className="bg-white/90 backdrop-blur-2xl p-6 rounded-3xl border border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.03)] flex flex-col xl:flex-row gap-4 items-center justify-between">
        
        {/* Search & Group */}
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-1 max-w-4xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by Employee, Manager, Location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl w-full text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder-slate-400 text-sm md:text-base transition-all"
            />
          </div>
          
          <div className="flex gap-2 min-w-[280px]">
            <div className="flex items-center bg-slate-50 px-4 rounded-2xl border border-slate-200/80">
              <SlidersHorizontal className="w-5 h-5 text-slate-400 mr-2" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Group By</span>
            </div>
            <select
              value={groupByColumn}
              onChange={(e) => setGroupByColumn(e.target.value as keyof AttendanceRecord)}
              className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm md:text-base cursor-pointer"
            >
              <option value="zone">Zone</option>
              <option value="subzone">Sub Zone</option>
              <option value="reportingTo">Reporting Manager</option>
              <option value="location">State / Location</option>
              <option value="userType">User Type</option>
              <option value="designation">Designation</option>
            </select>
          </div>
        </div>

        {/* Date Selector & Export */}
        <div className="flex flex-wrap md:flex-nowrap gap-3 w-full xl:w-auto justify-end">
          {uniqueDates.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 pr-1">Date</span>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm cursor-pointer shadow-sm flex-1 md:flex-none"
              >
                {uniqueDates.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={exportSummaryCSV}
            className="flex items-center justify-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl transition-all shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 hover:scale-[1.02] active:scale-95 text-sm md:text-base w-full md:w-auto"
          >
            <Download className="w-5 h-5" />
            <span>Export Summary CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Dash Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: Active Strength */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] flex items-center space-x-4 hover:shadow-md transition-shadow group">
          <div className="p-4 bg-slate-100 text-slate-600 rounded-2xl group-hover:bg-slate-200 transition-colors">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Active</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{summaryKPIs.totalActive}</h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">Workforce Strength</p>
          </div>
        </div>

        {/* KPI 2: Present */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] flex items-center space-x-4 hover:shadow-md transition-shadow group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
          <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:bg-emerald-100 transition-colors">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Present</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{summaryKPIs.present}</h3>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded">
                {summaryKPIs.presentPercent}%
              </span>
              <span className="text-[11px] font-semibold text-slate-400">Attendance</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Leave */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] flex items-center space-x-4 hover:shadow-md transition-shadow group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
          <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl group-hover:bg-rose-100 transition-colors">
            <CalendarOff className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">On Leave</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{summaryKPIs.leave}</h3>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 font-bold text-[10px] rounded">
                {summaryKPIs.leavePercent}%
              </span>
              <span className="text-[11px] font-semibold text-slate-400">Absence</span>
            </div>
          </div>
        </div>

        {/* KPI 4: WO */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] flex items-center space-x-4 hover:shadow-md transition-shadow group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-sky-500"></div>
          <div className="p-4 bg-sky-50 text-sky-500 rounded-2xl group-hover:bg-sky-100 transition-colors">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Weekly Off</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{summaryKPIs.wo}</h3>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="px-1.5 py-0.5 bg-sky-100 text-sky-700 font-bold text-[10px] rounded">
                {summaryKPIs.woPercent}%
              </span>
              <span className="text-[11px] font-semibold text-slate-400">Scheduled WO</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Last Day EOD */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] flex items-center space-x-4 hover:shadow-md transition-shadow group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
          <div className="p-4 bg-indigo-50 text-indigo-500 rounded-2xl group-hover:bg-indigo-100 transition-colors">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">EOD Completed</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{summaryKPIs.eod}</h3>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded">
                {summaryKPIs.eodPercent}%
              </span>
              <span className="text-[11px] font-semibold text-slate-400">of Present Staff</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Aggregation Summary Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_40px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              Summarized by {groupByColumn.charAt(0).toUpperCase() + String(groupByColumn).slice(1)}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Showing active workforce distribution and KPI fulfillment per group. Click any row to view employee records.
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full uppercase tracking-wider">
            {groupedData.length} Grouped Units
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-1/4">
                  {groupByColumn.toUpperCase()} NAME
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                  TOTAL STRENGTH
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                  PRESENT
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                  LEAVE
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                  WO
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                  EOD SUBMITTED
                </th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                  ATTENDANCE RATIO
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedData.map((group) => {
                const isExpanded = !!expandedGroups[group.name];
                return (
                  <React.Fragment key={group.name}>
                    {/* Header Row */}
                    <tr 
                      onClick={() => toggleGroupExpand(group.name)}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-8 py-5 font-bold text-slate-700 flex items-center space-x-2">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                        )}
                        <span className="group-hover:text-amber-600 transition-colors">{group.name}</span>
                      </td>
                      <td className="px-6 py-5 text-center text-slate-700 font-semibold">
                        {group.totalActive}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs">
                          {group.present} ({group.presentPercent}%)
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${
                          group.leave > 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-400 bg-slate-100'
                        }`}>
                          {group.leave}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${
                          group.wo > 0 ? 'text-sky-600 bg-sky-50' : 'text-slate-400 bg-slate-100'
                        }`}>
                          {group.wo}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`font-bold px-2.5 py-1 rounded-full text-xs ${
                          group.eodPercent >= 80 
                            ? 'text-indigo-600 bg-indigo-50' 
                            : group.eod > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-400 bg-slate-100'
                        }`}>
                          {group.eod} ({group.eodPercent}%)
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-slate-700">{group.presentPercent}%</span>
                          <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5 border border-slate-200/30">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                group.presentPercent >= 80 
                                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                                  : group.presentPercent >= 50 
                                    ? 'bg-gradient-to-r from-amber-400 to-amber-500' 
                                    : 'bg-gradient-to-r from-rose-400 to-rose-500'
                              }`}
                              style={{ width: `${group.presentPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Drilldown Records */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="px-8 py-4 bg-slate-50/70 border-t border-b border-slate-200/50">
                          <div className="space-y-3">
                            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                              <Users className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                              Employee Attendance Logs: {group.name} ({group.records.length} Employees)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {group.records.map((rec, i) => {
                                const att = rec.attendance.toLowerCase();
                                const type = rec.presentType.toLowerCase();
                                const isPresent = att.includes('present') || type.includes('present') || att === 'p';
                                const isLeave = att.includes('leave') || att === 'l' || rec.leaveDetails !== '';
                                const isWO = att.includes('wo') || att.includes('weekly') || att.includes('off');

                                return (
                                  <div 
                                    key={i} 
                                    className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-start space-x-3.5 hover:shadow transition-shadow group"
                                  >
                                    {rec.attendanceImage && (
                                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 shadow-sm hover:scale-105 transition-transform duration-300 bg-slate-50">
                                        <a href={rec.attendanceImage} target="_blank" rel="noopener noreferrer" title="View Full Clock-in Image">
                                          <img 
                                            src={rec.attendanceImage} 
                                            alt={rec.userName} 
                                            className="w-full h-full object-cover cursor-zoom-in"
                                          />
                                        </a>
                                      </div>
                                    )}

                                    <div className="flex-1 min-w-0 space-y-1">
                                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                        <span className="font-bold text-slate-800 text-sm truncate">{rec.userName}</span>
                                        <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                          ID: {rec.empId || rec.userId || 'N/A'}
                                        </span>
                                        {rec.designation && (
                                          <span className="text-[9px] text-amber-800 font-bold bg-amber-50 border border-amber-200/40 px-1.5 py-0.5 rounded">
                                            {rec.designation}
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="text-[11px] font-semibold text-slate-500 flex items-center flex-wrap gap-x-2">
                                        <span className="flex items-center">
                                          <User className="w-3 h-3 text-slate-400 mr-1" />
                                          Mgr: {rec.reportingTo || 'N/A'}
                                        </span>
                                        {(rec.raw['Phone Number'] || rec.raw['phone_number']) && (
                                          <span className="text-slate-400 font-normal">
                                            • Tel: {rec.raw['Phone Number'] || rec.raw['phone_number']}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Times / Locations */}
                                      <div className="pt-1.5 space-y-1 text-[11px]">
                                        {rec.attendanceTime && (
                                          <div className="text-slate-500 flex items-center">
                                            <Clock className="w-3 h-3 text-emerald-400 mr-1.5" />
                                            <span>In: {rec.attendanceTime}</span>
                                          </div>
                                        )}
                                        <div className="text-slate-500 flex items-center">
                                          <CheckSquare className={`w-3 h-3 mr-1.5 ${rec.eodTime ? 'text-indigo-400' : 'text-slate-300'}`} />
                                          <span>EOD: {rec.eodTime || <span className="text-slate-300">Not Submitted</span>}</span>
                                        </div>
                                        {rec.location && (
                                          <div className="text-slate-500 flex items-center">
                                            <MapPin className="w-3 h-3 text-rose-400 mr-1.5" />
                                            {getMapsLink(rec.location) ? (
                                              <a 
                                                href={getMapsLink(rec.location)} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-amber-600 hover:text-amber-700 underline font-semibold truncate"
                                                title="Open in Google Maps"
                                              >
                                                Location: {rec.location.split(',')[0].slice(0, 8)}... (Map)
                                              </a>
                                            ) : (
                                              <span className="truncate" title={rec.location}>{rec.location}</span>
                                            )}
                                          </div>
                                        )}
                                        {(rec.raw['Variance Kms'] !== undefined && rec.raw['Variance Kms'] !== '') && (
                                          <div className="text-slate-500 flex items-center">
                                            <SlidersHorizontal className="w-3 h-3 text-sky-400 mr-1.5" />
                                            <span>Variance: {rec.raw['Variance Kms']} km</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Badge Status */}
                                    <div className="flex flex-col items-end justify-between h-full space-y-3.5 text-right self-stretch flex-shrink-0">
                                      <div className="flex flex-col items-end space-y-1">
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${
                                          isPresent 
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                            : isLeave 
                                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                              : isWO
                                                ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                        }`}>
                                          {isPresent ? 'Present' : isLeave ? 'Leave' : isWO ? 'WO' : rec.attendance || 'Absent'}
                                        </span>
                                        {rec.presentType && (
                                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50 px-1 border border-slate-100 rounded">
                                            {rec.presentType}
                                          </span>
                                        )}
                                      </div>

                                      {rec.raw['IMEI'] && (
                                        <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1 rounded border border-slate-200/50">
                                          IMEI: {rec.raw['IMEI']}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
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

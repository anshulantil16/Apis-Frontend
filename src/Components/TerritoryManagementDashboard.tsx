// @ts-nocheck
import { useState, useMemo } from 'react';
import {
  Users, Briefcase, Search, ChevronDown, ChevronUp, SlidersHorizontal,
  Map, Navigation, Download, TrendingUp, Activity,
} from 'lucide-react';

export function TerritoryManagementDashboard({ rawData }: { rawData: any }) {
  const [selectedDesignations, setSelectedDesignations] = useState<Set<string>>(new Set());
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());
  const [selectedRMs, setSelectedRMs] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [expandedRM, setExpandedRM] = useState<Record<string, boolean>>({});
  const [expandedZone, setExpandedZone] = useState<Record<string, boolean>>({});
  const [expandedDesignation, setExpandedDesignation] = useState<Record<string, boolean>>({});

  // Validate data structure
  if (!rawData || !rawData.filter_options || !rawData.summary) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-lg font-bold text-slate-900">No Data</p>
          <p className="text-sm text-slate-500 mt-2">Upload employee data to get started</p>
        </div>
      </div>
    );
  }

  const filtered = useMemo(() => {
    let records = rawData.data || [];

    if (selectedDesignations.size > 0) {
      records = records.filter(r => selectedDesignations.has(r.designation));
    }
    if (selectedStates.size > 0) {
      records = records.filter(r => selectedStates.has(r.state));
    }
    if (selectedZones.size > 0) {
      records = records.filter(r => selectedZones.has(r.zone));
    }
    if (selectedRMs.size > 0) {
      records = records.filter(r => selectedRMs.has(r.rm));
    }
    if (search) {
      const q = search.toLowerCase();
      records = records.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.designation.toLowerCase().includes(q) ||
        r.rm.toLowerCase().includes(q)
      );
    }

    return records;
  }, [rawData.data, selectedDesignations, selectedStates, selectedZones, selectedRMs, search]);

  const stats = useMemo(() => {
    const rmCount: Record<string, number> = {};
    const zoneCount: Record<string, number> = {};
    const designationCount: Record<string, number> = {};

    filtered.forEach(r => {
      rmCount[r.rm] = (rmCount[r.rm] || 0) + 1;
      zoneCount[r.zone] = (zoneCount[r.zone] || 0) + 1;
      designationCount[r.designation] = (designationCount[r.designation] || 0) + 1;
    });

    return { rmCount, zoneCount, designationCount };
  }, [filtered]);

  const toggleFilter = (set: Set<string>, value: string) => {
    const newSet = new Set(set);
    if (newSet.has(value)) newSet.delete(value);
    else newSet.add(value);
    return newSet;
  };

  const toggleExpand = (key: string, type: string) => {
    if (type === 'rm') setExpandedRM(p => ({ ...p, [key]: !p[key] }));
    else if (type === 'zone') setExpandedZone(p => ({ ...p, [key]: !p[key] }));
    else if (type === 'designation') setExpandedDesignation(p => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-3xl font-black text-slate-900">Territory Management</h2>
        <p className="text-sm text-slate-500">Sales organization structure · Regional distribution · Team analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: filtered.length, icon: Users, border: 'border-t-2 border-blue-400', iconCls: 'bg-blue-50 text-blue-500' },
          { label: 'Unique Designations', value: Object.keys(stats.designationCount).length, icon: Briefcase, border: 'border-t-2 border-purple-400', iconCls: 'bg-purple-50 text-purple-500' },
          { label: 'Zones', value: Object.keys(stats.zoneCount).length, icon: Map, border: 'border-t-2 border-green-400', iconCls: 'bg-green-50 text-green-500' },
          { label: 'Managers', value: Object.keys(stats.rmCount).length, icon: Navigation, border: 'border-t-2 border-orange-400', iconCls: 'bg-orange-50 text-orange-500' },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-2xl border border-slate-100 ${c.border} p-4 shadow-sm hover:shadow-md transition-all`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.iconCls}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <SlidersHorizontal className="w-4 h-4" />
          Multi-Select Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Designation Filter */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">Designation</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {rawData.filter_options.designations.map(d => (
                <label key={d} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedDesignations.has(d)}
                    onChange={() => setSelectedDesignations(toggleFilter(selectedDesignations, d))}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <span className="text-sm text-slate-700 flex-1 truncate">{d}</span>
                  <span className="text-xs text-slate-400 font-semibold">({rawData.breakdown.by_designation[d] || 0})</span>
                </label>
              ))}
            </div>
          </div>

          {/* State Filter */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">State</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {rawData.filter_options.states.map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedStates.has(s)}
                    onChange={() => setSelectedStates(toggleFilter(selectedStates, s))}
                    className="w-4 h-4 rounded accent-green-500"
                  />
                  <span className="text-sm text-slate-700 flex-1 truncate">{s}</span>
                  <span className="text-xs text-slate-400 font-semibold">({rawData.breakdown.by_state[s] || 0})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Zone Filter */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">Zone</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {rawData.filter_options.zones.map(z => (
                <label key={z} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedZones.has(z)}
                    onChange={() => setSelectedZones(toggleFilter(selectedZones, z))}
                    className="w-4 h-4 rounded accent-purple-500"
                  />
                  <span className="text-sm text-slate-700 flex-1 truncate">{z}</span>
                  <span className="text-xs text-slate-400 font-semibold">({rawData.breakdown.by_zone[z] || 0})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Manager Filter */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">Manager</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {rawData.filter_options.rms.filter(rm => rm).map(rm => (
                <label key={rm} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedRMs.has(rm)}
                    onChange={() => setSelectedRMs(toggleFilter(selectedRMs, rm))}
                    className="w-4 h-4 rounded accent-orange-500"
                  />
                  <span className="text-sm text-slate-700 flex-1 truncate">{rm}</span>
                  <span className="text-xs text-slate-400 font-semibold">({rawData.breakdown.by_rm[rm] || 0})</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by name, code, designation, manager..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm font-semibold text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Breakdown Sections */}
      <div className="space-y-3">
        {/* By Manager */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button
            onClick={() => toggleExpand('rm', 'rm')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors border-b border-slate-50"
          >
            <div className="flex items-center gap-3">
              <Navigation className="w-4 h-4 text-orange-500" />
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800">By Manager</p>
                <p className="text-xs text-slate-400 mt-0.5">{Object.keys(stats.rmCount).length} reporting managers</p>
              </div>
            </div>
            {expandedRM.rm ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {expandedRM.rm && (
            <div className="px-6 py-4 space-y-2">
              {Object.entries(stats.rmCount).map(([rm, count]) => (
                <div key={rm} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <span className="text-sm font-semibold text-slate-700">{rm || '(Unassigned)'}</span>
                  <span className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full border border-orange-200">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Zone */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button
            onClick={() => toggleExpand('zone', 'zone')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors border-b border-slate-50"
          >
            <div className="flex items-center gap-3">
              <Map className="w-4 h-4 text-green-500" />
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800">By Zone</p>
                <p className="text-xs text-slate-400 mt-0.5">{Object.keys(stats.zoneCount).length} zones</p>
              </div>
            </div>
            {expandedZone.zone ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {expandedZone.zone && (
            <div className="px-6 py-4 space-y-2">
              {Object.entries(stats.zoneCount).map(([zone, count]) => (
                <div key={zone} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <span className="text-sm font-semibold text-slate-700">{zone}</span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Designation */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button
            onClick={() => toggleExpand('designation', 'designation')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors border-b border-slate-50"
          >
            <div className="flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-purple-500" />
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800">By Designation</p>
                <p className="text-xs text-slate-400 mt-0.5">{Object.keys(stats.designationCount).length} designations</p>
              </div>
            </div>
            {expandedDesignation.designation ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {expandedDesignation.designation && (
            <div className="px-6 py-4 space-y-2">
              {Object.entries(stats.designationCount).map(([designation, count]) => (
                <div key={designation} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <span className="text-sm font-semibold text-slate-700">{designation}</span>
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-200">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Employee Directory */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Employee Directory</h3>
              <p className="text-xs text-slate-400 mt-0.5">Showing {Math.min(filtered.length, 50)} of {filtered.length} employees</p>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">{filtered.length} total</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">HQ</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zone</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manager</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.slice(0, 50).map(r => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-3.5 text-xs font-semibold text-slate-700">{r.code}</td>
                  <td className="px-6 py-3.5 text-xs font-semibold text-slate-800">{r.name}</td>
                  <td className="px-6 py-3.5"><span className="text-xs font-bold px-2 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">{r.designation}</span></td>
                  <td className="px-6 py-3.5 text-xs text-slate-600">{r.hq}</td>
                  <td className="px-6 py-3.5"><span className="text-xs font-bold px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">{r.zone}</span></td>
                  <td className="px-6 py-3.5 text-xs text-slate-700">{r.rm || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

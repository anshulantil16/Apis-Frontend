// @ts-nocheck
import { useState, useMemo } from 'react';
import {
  Users, Briefcase, Search, ChevronDown, ChevronUp, SlidersHorizontal,
  Map, Navigation, TrendingUp, Activity, Zap, Target, Globe,
} from 'lucide-react';
import { TOOL_STYLES } from './toolStyles';

export function TerritoryManagementDashboard({ rawData }: { rawData: any }) {
  const [selectedDesignations, setSelectedDesignations] = useState<Set<string>>(new Set());
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());
  const [selectedRMs, setSelectedRMs] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [expandedRM, setExpandedRM] = useState<Record<string, boolean>>({});
  const [expandedZone, setExpandedZone] = useState<Record<string, boolean>>({});
  const [expandedDesignation, setExpandedDesignation] = useState<Record<string, boolean>>({});

  if (!rawData || !rawData.filter_options || !rawData.summary) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mb-4 mx-auto">
            <Globe className="w-10 h-10 text-indigo-500" />
          </div>
          <p className="text-lg font-bold text-slate-900">Ready to Explore</p>
          <p className="text-sm text-slate-500 mt-1">Upload your territory data to begin</p>
        </div>
      </div>
    );
  }

  const filtered = useMemo(() => {
    let records = rawData.data || [];
    if (selectedDesignations.size > 0) records = records.filter(r => selectedDesignations.has(r.designation));
    if (selectedStates.size > 0) records = records.filter(r => selectedStates.has(r.state));
    if (selectedZones.size > 0) records = records.filter(r => selectedZones.has(r.zone));
    if (selectedRMs.size > 0) records = records.filter(r => selectedRMs.has(r.rm));
    if (search) {
      const q = search.toLowerCase();
      records = records.filter(r =>
        r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) ||
        r.designation.toLowerCase().includes(q) || r.rm.toLowerCase().includes(q)
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
    newSet.has(value) ? newSet.delete(value) : newSet.add(value);
    return newSet;
  };

  const toggleExpand = (key: string, type: string) => {
    if (type === 'rm') setExpandedRM(p => ({ ...p, [key]: !p[key] }));
    else if (type === 'zone') setExpandedZone(p => ({ ...p, [key]: !p[key] }));
    else if (type === 'designation') setExpandedDesignation(p => ({ ...p, [key]: !p[key] }));
  };

  const KPICard = ({ label, value, icon: Icon, gradient, trend, delay }) => (
    <div className={`tp-reveal tp-tilt relative overflow-hidden rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer`}
      style={{ animationDelay: `${delay || 0}ms` }}>
      <div className={`absolute inset-0 ${gradient} opacity-90 group-hover:opacity-100 transition-opacity`}></div>
      <div className="absolute inset-0 bg-grid-white/[0.05]"></div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="tp-pop-in p-3 bg-white/20 backdrop-blur-md rounded-xl">
            <Icon className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold bg-white/30 backdrop-blur-md px-2.5 py-1 rounded-full">{trend}%</span>
        </div>
        <p className="text-sm font-medium text-white/80 mb-1">{label}</p>
        <p className="text-4xl font-black">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-8">
      <style>{TOOL_STYLES}</style>
      {/* Animated Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-3xl rounded-full"></div>
        <div className="relative">
          <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
            Territory Command Center
          </h1>
          <p className="text-slate-600 mt-3 text-lg">Real-time sales organization analytics & team distribution insights</p>
        </div>
      </div>

      {/* Mega KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label="Total Force"
          value={filtered.length}
          icon={Users}
          gradient="bg-gradient-to-br from-blue-600 to-cyan-600"
          trend="+12"
          delay={0}
        />
        <KPICard
          label="Role Matrix"
          value={Object.keys(stats.designationCount).length}
          icon={Briefcase}
          gradient="bg-gradient-to-br from-purple-600 to-pink-600"
          trend="+8"
          delay={60}
        />
        <KPICard
          label="Geographic Zones"
          value={Object.keys(stats.zoneCount).length}
          icon={Map}
          gradient="bg-gradient-to-br from-emerald-600 to-teal-600"
          trend="+15"
          delay={120}
        />
        <KPICard
          label="Leadership Units"
          value={Object.keys(stats.rmCount).length}
          icon={Navigation}
          gradient="bg-gradient-to-br from-orange-600 to-red-600"
          trend="+5"
          delay={180}
        />
      </div>

      {/* Advanced Filters Section */}
      <div className="tp-reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 shadow-2xl border border-slate-700/50" style={{ animationDelay: '120ms' }}>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Smart Filters</h3>
              <p className="text-slate-400 text-xs mt-0.5">Multi-dimensional territory segmentation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: 'Role', data: rawData.filter_options.designations, selected: selectedDesignations, setter: setSelectedDesignations, color: 'from-purple-600 to-pink-600' },
              { title: 'Territory', data: rawData.filter_options.states, selected: selectedStates, setter: setSelectedStates, color: 'from-green-600 to-emerald-600' },
              { title: 'Zone', data: rawData.filter_options.zones, selected: selectedZones, setter: setSelectedZones, color: 'from-blue-600 to-cyan-600' },
              { title: 'Manager', data: rawData.filter_options.rms.filter(r => r), selected: selectedRMs, setter: setSelectedRMs, color: 'from-orange-600 to-red-600' },
            ].map((filter, idx) => (
              <div key={idx} className="tp-reveal tp-tilt bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 hover:border-slate-600/50 transition-all" style={{ animationDelay: `${idx * 60}ms` }}>
                <p className="text-white text-xs font-bold uppercase tracking-wider mb-3">{filter.title}</p>
                <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                  {filter.data.map(item => (
                    <label key={item} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-700/50 rounded-lg transition-colors group">
                      <input
                        type="checkbox"
                        checked={filter.selected.has(item)}
                        onChange={() => filter.setter(toggleFilter(filter.selected, item))}
                        className="w-4 h-4 rounded accent-indigo-500"
                      />
                      <span className="text-sm text-slate-300 flex-1 group-hover:text-white transition-colors">{item}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${filter.color} text-white`}>
                        {filter.data === rawData.filter_options.designations ? rawData.breakdown.by_designation[item] :
                         filter.data === rawData.filter_options.states ? rawData.breakdown.by_state[item] :
                         filter.data === rawData.filter_options.zones ? rawData.breakdown.by_zone[item] :
                         rawData.breakdown.by_rm[item] || 0}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Premium Search */}
          <div className="mt-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative flex items-center gap-3 bg-slate-800 px-5 py-3 rounded-xl">
                <Search className="w-5 h-5 text-indigo-400" />
                <input
                  type="text"
                  placeholder="Search name, code, role, manager..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-white placeholder-slate-400 font-semibold"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Cards - Glassmorphism */}
      <div className="space-y-4">
        {[
          { title: 'Manager Leadership', data: stats.rmCount, icon: Navigation, color: 'from-orange-500 to-red-500', expanded: expandedRM, toggleKey: 'rm' },
          { title: 'Zone Distribution', data: stats.zoneCount, icon: Map, color: 'from-green-500 to-emerald-500', expanded: expandedZone, toggleKey: 'zone' },
          { title: 'Role Hierarchy', data: stats.designationCount, icon: Briefcase, color: 'from-purple-500 to-pink-500', expanded: expandedDesignation, toggleKey: 'designation' },
        ].map((section, idx) => (
          <div key={idx} className="tp-reveal group relative" style={{ animationDelay: `${idx * 60}ms` }}>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all">
              <button
                onClick={() => toggleExpand(section.toggleKey, section.toggleKey)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 bg-gradient-to-br ${section.color} rounded-lg`}>
                    <section.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold text-lg">{section.title}</p>
                    <p className="text-slate-400 text-xs mt-1">{Object.keys(section.data).length} categories</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-indigo-400">
                    {Object.values(section.data).reduce((a, b) => a + b, 0)}
                  </span>
                  {expanded[section.toggleKey] ?
                    <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" /> :
                    <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                  }
                </div>
              </button>

              {expanded[section.toggleKey] && (
                <div className="px-6 py-4 border-t border-white/10 space-y-2 bg-gradient-to-b from-white/5 to-transparent">
                  {Object.entries(section.data)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between group/item p-3 rounded-lg hover:bg-white/5 transition-colors">
                        <span className="text-slate-200 font-semibold">{key || '(Unassigned)'}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${section.color} transition-all`}
                              style={{width: `${(count / Math.max(...Object.values(section.data))) * 100}%`}}
                            ></div>
                          </div>
                          <span className={`text-sm font-bold px-3 py-1 rounded-full bg-gradient-to-r ${section.color} text-white min-w-12 text-center`}>
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Premium Employee Table */}
      <div className="tp-reveal relative group" style={{ animationDelay: '180ms' }}>
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
        <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-white/20 transition-all shadow-2xl">
          <div className="px-8 py-6 border-b border-white/10 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-xl">Employee Roster</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Showing {Math.min(filtered.length, 50)} of {filtered.length} personnel
                </p>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg text-sm">
                {filtered.length}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-8 py-4 text-left text-xs font-bold text-indigo-300 uppercase tracking-widest">Code</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-indigo-300 uppercase tracking-widest">Name</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-indigo-300 uppercase tracking-widest">Role</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-indigo-300 uppercase tracking-widest">HQ</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-indigo-300 uppercase tracking-widest">Zone</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-indigo-300 uppercase tracking-widest">Manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.slice(0, 50).map((r, idx) => (
                  <tr key={r.id} className="tp-reveal hover:bg-white/5 transition-colors group/row cursor-pointer" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
                    <td className="px-8 py-4 text-slate-300 font-semibold">{r.code}</td>
                    <td className="px-8 py-4 text-white font-semibold">{r.name}</td>
                    <td className="px-8 py-4">
                      <span className="px-3 py-1.5 bg-gradient-to-r from-purple-600/40 to-pink-600/40 text-purple-200 text-xs font-bold rounded-lg border border-purple-500/30 group-hover/row:border-purple-500/60 transition-all">
                        {r.designation}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-slate-400">{r.hq}</td>
                    <td className="px-8 py-4">
                      <span className="px-3 py-1.5 bg-gradient-to-r from-green-600/40 to-emerald-600/40 text-green-200 text-xs font-bold rounded-lg border border-green-500/30">
                        {r.zone}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-slate-300">{r.rm || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

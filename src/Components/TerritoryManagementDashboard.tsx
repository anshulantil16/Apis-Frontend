import { useState, useMemo } from 'react';
import {
  Users, Briefcase, User, Search,
  ChevronDown, ChevronUp, SlidersHorizontal, Map, Navigation,
} from 'lucide-react';

interface OrgRecord {
  id: number;
  sno: number;
  code: string;
  name: string;
  designation: string;
  hq: string;
  state: string;
  zone: string;
  rm: string;
}

interface DashboardData {
  summary: {
    total_employees: number;
    unique_designations: number;
    unique_zones: number;
    unique_states: number;
  };
  breakdown: {
    by_rm: Record<string, number>;
    by_designation: Record<string, number>;
    by_zone: Record<string, number>;
    by_state: Record<string, number>;
  };
  filter_options: {
    designations: string[];
    states: string[];
    zones: string[];
    rms: string[];
  };
  data: OrgRecord[];
  record_count: number;
}

export function TerritoryManagementDashboard({ rawData }: { rawData: DashboardData | null }) {
  const [selectedDesignations, setSelectedDesignations] = useState<Set<string>>(new Set());
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());
  const [selectedRMs, setSelectedRMs] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [expandedRM, setExpandedRM] = useState<Record<string, boolean>>({});
  const [expandedZone, setExpandedZone] = useState<Record<string, boolean>>({});
  const [expandedDesignation, setExpandedDesignation] = useState<Record<string, boolean>>({});

  if (!rawData) return <div className="p-6 text-center text-gray-500">Loading...</div>;

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

  return (
    <div className="space-y-6 p-6 bg-white">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Territory Management</h2>
        <p className="text-gray-600">Organizational structure · Sales team distribution · Zone and RM analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Employees</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{filtered.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Unique Designations</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{Object.keys(stats.designationCount).length}</p>
            </div>
            <Briefcase className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Zones</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{Object.keys(stats.zoneCount).length}</p>
            </div>
            <Map className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Reporting Managers</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">{Object.keys(stats.rmCount).length}</p>
            </div>
            <Navigation className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <SlidersHorizontal className="w-4 h-4" />
          Multi-Select Filters
        </div>

        <div className="grid grid-cols-4 gap-4">
          {/* Designation Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Designation</label>
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {rawData.filter_options.designations.map(d => (
                <label key={d} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDesignations.has(d)}
                    onChange={() => setSelectedDesignations(toggleFilter(selectedDesignations, d))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">{d}</span>
                  <span className="text-xs text-gray-400">({(rawData.breakdown.by_designation[d] || 0)})</span>
                </label>
              ))}
            </div>
          </div>

          {/* State Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">State</label>
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {rawData.filter_options.states.map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStates.has(s)}
                    onChange={() => setSelectedStates(toggleFilter(selectedStates, s))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">{s}</span>
                  <span className="text-xs text-gray-400">({(rawData.breakdown.by_state[s] || 0)})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Zone Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Zone</label>
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {rawData.filter_options.zones.map(z => (
                <label key={z} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedZones.has(z)}
                    onChange={() => setSelectedZones(toggleFilter(selectedZones, z))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">{z}</span>
                  <span className="text-xs text-gray-400">({(rawData.breakdown.by_zone[z] || 0)})</span>
                </label>
              ))}
            </div>
          </div>

          {/* RM Filter */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Reporting Manager</label>
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {rawData.filter_options.rms.map(rm => (
                <label key={rm} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRMs.has(rm)}
                    onChange={() => setSelectedRMs(toggleFilter(selectedRMs, rm))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">{rm}</span>
                  <span className="text-xs text-gray-400">({(rawData.breakdown.by_rm[rm] || 0)})</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, code, designation, RM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm"
          />
        </div>
      </div>

      {/* Analytics Sections */}
      <div className="grid grid-cols-2 gap-4">
        {/* By Reporting Manager */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-orange-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-orange-600" />
              Employees by Reporting Manager
            </h3>
          </div>
          <div className="space-y-2 p-4">
            {Object.entries(stats.rmCount)
              .sort((a, b) => b[1] - a[1])
              .map(([rm, count]) => (
                <div
                  key={rm}
                  onClick={() => setExpandedRM({ ...expandedRM, [rm]: !expandedRM[rm] })}
                  className="cursor-pointer p-2 hover:bg-gray-50 rounded border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">{rm}</span>
                    <div className="flex items-center gap-2">
                      <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-1 rounded">
                        {count} employees
                      </span>
                      {expandedRM[rm] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                  {expandedRM[rm] && (
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      {filtered
                        .filter(r => r.rm === rm)
                        .map(r => (
                          <div key={r.id} className="flex justify-between">
                            <span>{r.name}</span>
                            <span className="text-gray-400">{r.designation}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* By Zone */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Map className="w-4 h-4 text-green-600" />
              Employees by Zone
            </h3>
          </div>
          <div className="space-y-2 p-4">
            {Object.entries(stats.zoneCount)
              .sort((a, b) => b[1] - a[1])
              .map(([zone, count]) => (
                <div
                  key={zone}
                  onClick={() => setExpandedZone({ ...expandedZone, [zone]: !expandedZone[zone] })}
                  className="cursor-pointer p-2 hover:bg-gray-50 rounded border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">{zone}</span>
                    <div className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                        {count} employees
                      </span>
                      {expandedZone[zone] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                  {expandedZone[zone] && (
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      {filtered
                        .filter(r => r.zone === zone)
                        .map(r => (
                          <div key={r.id} className="flex justify-between">
                            <span>{r.name}</span>
                            <span className="text-gray-400">{r.state}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* By Designation */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-purple-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-purple-600" />
            Employees by Designation
          </h3>
        </div>
        <div className="space-y-2 p-4">
          {Object.entries(stats.designationCount)
            .sort((a, b) => b[1] - a[1])
            .map(([designation, count]) => (
              <div
                key={designation}
                onClick={() => setExpandedDesignation({ ...expandedDesignation, [designation]: !expandedDesignation[designation] })}
                className="cursor-pointer p-2 hover:bg-gray-50 rounded border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-900">{designation}</span>
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">
                      {count} employees
                    </span>
                    {expandedDesignation[designation] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
                {expandedDesignation[designation] && (
                  <div className="mt-2 text-xs text-gray-600 space-y-1 grid grid-cols-3 gap-2">
                    {filtered
                      .filter(r => r.designation === designation)
                      .map(r => (
                        <div key={r.id}>
                          <span>{r.name}</span>
                          <div className="text-gray-400">{r.zone} · {r.rm}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Employee Directory ({filtered.length} records)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Name</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Code</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Designation</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Zone</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">State</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">RM</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">HQ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">{r.name}</td>
                  <td className="px-4 py-2 text-gray-600">{r.code}</td>
                  <td className="px-4 py-2 text-gray-600">{r.designation}</td>
                  <td className="px-4 py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{r.zone}</span></td>
                  <td className="px-4 py-2 text-gray-600">{r.state}</td>
                  <td className="px-4 py-2 text-gray-600 font-medium">{r.rm}</td>
                  <td className="px-4 py-2 text-gray-600">{r.hq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 50 && (
          <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-t">
            Showing 50 of {filtered.length} records
          </div>
        )}
      </div>
    </div>
  );
}

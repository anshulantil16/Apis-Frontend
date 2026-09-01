import { useState, useRef } from 'react';
import {
  Download, AlertCircle, Building2, FileSpreadsheet, HeartPulse, Users,
  LayoutDashboard, Sparkles,
} from 'lucide-react';
import { FileUploadZone } from '../../Components/FileUploadZone';
import { ColumnPills } from '../../Components/ColumnPills';
import { PreviewTable } from '../../Components/PreviewTable';
import { AttendanceDashboard } from '../../Components/AttendanceDashboard';
import { DelhiAttendanceDashboard } from '../../Components/DelhiAttendanceDashboard';
import { TerritoryManagementDashboard } from '../../Components/TerritoryManagementDashboard';
import { TOOL_STYLES } from '../../Components/toolStyles';

type ToolId = 'joining' | 'medical' | 'payroll' | 'attendance' | 'delhi' | 'territory';

/* Pointer handlers come from the shared kit: it measures once per
   hover and batches its writes, where this file's old private copy
   measured inside every mousemove and forced a synchronous layout. */
import { onTilt3dMove, onTilt3dLeave } from '../../ui';

/* The sidebar and page header come from IntranetShell — this page renders only
   its own centre content, starting with the tool switcher below. */
const TOOLS: {
  id: ToolId; label: string; sub: string | null;
  activeCls: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'joining',    label: 'Joining Forms',    sub: null,              icon: Users,           activeCls: 'from-amber-500 to-orange-500 shadow-amber-500/25'  },
  { id: 'medical',    label: 'Medical Reports',  sub: null,              icon: HeartPulse,      activeCls: 'from-rose-500 to-red-500 shadow-rose-500/25'       },
  { id: 'payroll',    label: 'Payroll Exports',  sub: null,              icon: FileSpreadsheet, activeCls: 'from-sky-500 to-blue-500 shadow-sky-500/25'        },
  { id: 'attendance', label: 'Field Attendance', sub: 'BIZOM',           icon: LayoutDashboard, activeCls: 'from-orange-500 to-amber-500 shadow-orange-500/25' },
  { id: 'delhi',      label: 'Delhi / HO',       sub: 'Pocket HRMS',     icon: Building2,       activeCls: 'from-violet-500 to-purple-600 shadow-violet-500/25'},
  { id: 'territory',  label: 'Territory Mgmt',   sub: 'Sales Org Chart', icon: Users,           activeCls: 'from-indigo-500 to-violet-600 shadow-indigo-500/25'},
];

const TOOL_META: Record<ToolId, { title: string; desc: string; bar: string; badge: string }> = {
  joining:    { title: 'Joining Form Processor',       desc: 'Extract employee profiles from raw HR joining forms',                      bar: 'bg-amber-500',  badge: 'bg-amber-50  text-amber-700  border-amber-200'  },
  medical:    { title: 'Medical Report Extractor',     desc: 'Parse batch medical examination responses',                                bar: 'bg-rose-500',   badge: 'bg-rose-50   text-rose-700   border-rose-200'   },
  payroll:    { title: 'Payroll Data Manager',         desc: 'Filter and consolidate monthly payroll exports',                           bar: 'bg-sky-500',    badge: 'bg-sky-50    text-sky-700    border-sky-200'    },
  attendance: { title: 'Field Attendance Dashboard',   desc: 'BIZOM format · aggregate by zone, sub-zone, manager, or location',         bar: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  delhi:      { title: 'Delhi / HO Attendance',        desc: 'Pocket HRMS format · department, punch-time and leave analytics',          bar: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  territory:  { title: 'Territory Management',         desc: 'Sales team org chart · zone, designation, RM, and state distribution',     bar: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

export function DataExtractorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<unknown[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [activeTool, setActiveTool] = useState<ToolId>('joining');
  const [territoryDashData, setTerritoryDashData] = useState<any>(null);
  const [salesData, setSalesData] = useState<unknown[]>([]);
  const [salesExporting, setSalesExporting] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleFileSelect = (f: File | null) => {
    if (!f && abortRef.current) { abortRef.current.abort(); abortRef.current = null; setLoading(false); }
    setFile(f); setError(null); setHeaders([]); setData([]); setSelectedColumns(new Set());
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setError(null);
    abortRef.current = new AbortController();
    const fd = new FormData(); fd.append('file', file);
    const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    try {
      // Territory tool uses its own upload endpoint
      if (activeTool === 'territory') {
        const res = await fetch(`${API}/api/territory/upload/`, { method: 'POST', body: fd, signal: abortRef.current.signal });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to upload file');
        setTerritoryDashData(result); // Result already has summary, breakdown, filter_options, data
        setData([{ uploaded: true }]); // Mark as uploaded to show dashboard
      } else {
        fd.append('tool', activeTool);
        const res = await fetch(`${API}/api/user_management/upload-excel/`, { method: 'POST', body: fd, signal: abortRef.current.signal });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to process file');
        setHeaders(result.headers); setData(result.data); setSelectedColumns(new Set(result.headers));
        setSalesData(result.sales_data || []);
        setStats(result.stats || null);
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : String(err));
    } finally { setLoading(false); abortRef.current = null; }
  };

  const handleExport = async () => {
    if (!data.length) return;
    setLoading(true); setError(null);
    const filtered = data.map(row => {
      const r: Record<string, unknown> = {};
      selectedColumns.forEach(c => { r[c] = (row as Record<string, unknown>)[c]; });
      return r;
    });
    const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${API}/api/user_management/export-excel/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: filtered }),
      });
      if (!res.ok) throw new Error('Failed to export file');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `Apis_${activeTool.toUpperCase()}_${file?.name || 'export.xlsx'}` });
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setLoading(false); }
  };

  const handleSalesExport = async () => {
    if (!salesData.length) return;
    setSalesExporting(true); setError(null);
    const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${API}/api/user_management/export-excel/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: salesData }),
      });
      if (!res.ok) throw new Error('Failed to export Sales Report');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `Apis_SALES_${file?.name || 'export.xlsx'}` });
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setSalesExporting(false); }
  };

  const toggleColumn = (col: string) => {
    const s = new Set(selectedColumns);
    if (s.has(col)) { s.delete(col); } else { s.add(col); }
    setSelectedColumns(s);
  };

  const switchTool = (id: ToolId) => {
    setActiveTool(id); setFile(null); setData([]); setHeaders([]); setSelectedColumns(new Set()); setError(null); setTerritoryDashData(null); setSalesData([]); setStats(null);
  };


  const meta = TOOL_META[activeTool];
  const isDashboard = activeTool === 'attendance' || activeTool === 'delhi' || activeTool === 'territory';

  return (
    <div className="p-6">
      <style>{TOOL_STYLES}</style>

      <div className="max-w-[1440px] mx-auto space-y-5">
        {/* Tool switcher — the six data tools live here now that the sidebar
            belongs to the shell and is shared by every product. */}
        <div className="tp-reveal ih-inview flex flex-wrap gap-2">
          {TOOLS.map((t, i) => {
            const Icon = t.icon;
            const active = activeTool === t.id;
            return (
              <button key={t.id} onClick={() => switchTool(t.id)}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`tp-reveal ih-sheen flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[13px] font-bold
                            transition-all duration-300 border ${
                  active
                    ? `bg-gradient-to-r ${t.activeCls} text-white border-transparent shadow-lg -translate-y-0.5 hover:shadow-lg`
                    : 'bg-white/80 backdrop-blur-xl text-slate-500 border-slate-200 hover:text-slate-800 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-lg'
                }`}>
                <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${active ? 'scale-110' : ''}`} />
                <span className="text-left leading-tight">
                  {t.label}
                  {t.sub && (
                    <span className={`block text-[9px] font-black uppercase tracking-wider ${active ? 'opacity-70' : 'text-slate-400'}`}>
                      {t.sub}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active tool caption */}
        <div className="tp-reveal ih-inview flex items-center justify-between gap-4" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-3.5">
            <div className={`w-1 h-7 rounded-full ${meta.bar} ih-pulse-glow`} />
            <div>
              <h1 className="ih-grad-text text-sm font-black leading-tight bg-gradient-to-r from-slate-900 via-amber-600 to-orange-600">{meta.title}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${meta.badge}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current ih-pulse-glow" />Active
          </span>
        </div>


            {(activeTool === 'joining' || activeTool === 'medical' || isDashboard) ? (
              <>
                {/* Upload zone */}
                {data.length === 0 && (
                  <div
                    onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                    className="tp-reveal ih-inview ih-tilt3d ih-spotlight rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm p-7 transition-shadow duration-300 hover:shadow-md">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">Upload File</p>
                    <FileUploadZone file={file} loading={loading} isProcessed={data.length > 0}
                      onFileSelect={handleFileSelect} onProcess={handleUpload} />
                    {error && (
                      <div className="mt-4 flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-rose-800">Processing Error</p>
                          <p className="text-xs text-rose-600 mt-0.5">{error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {data.length > 0 && (
                  (activeTool === 'joining' || activeTool === 'medical') ? (
                    <div className="tp-reveal ih-inview rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm overflow-hidden">
                      {/* Header bar */}
                      <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Review &amp; Export</p>
                          <p className="text-sm font-semibold text-slate-700 mt-0.5">
                            <span className="text-amber-600 font-black">{data.length}</span> records extracted from {file?.name}
                          </p>
                          {stats && (
                            <p className="text-xs text-slate-500 mt-1">
                              <span className="font-bold text-slate-700">{stats.rows_in_file}</span> rows in file →{' '}
                              <span className="font-bold text-emerald-600">{stats.medical_employees}</span> employees in
                              {' '}<span className="font-semibold">both</span> reports
                              {stats.excluded_not_done > 0 && (
                                <> · <span className="font-bold text-amber-600">{stats.excluded_not_done} skipped</span> (HR Remarks not “Done”)</>
                              )}
                              {!stats.counts_match && (
                                <span className="ml-1 font-black text-rose-600">
                                  ⚠ MISMATCH: Sales has {stats.sales_employees}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setFile(null); setData([]); setHeaders([]); setTerritoryDashData(null); setSalesData([]); setStats(null); }}
                            className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">
                            ← Re-upload
                          </button>
                          <button onClick={handleExport} disabled={loading || selectedColumns.size === 0}
                            className="ih-sheen flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-xl transition-all disabled:opacity-50 shadow-md shadow-amber-500/15 hover:-translate-y-0.5 hover:shadow-lg active:scale-95">
                            {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            {activeTool === 'medical' ? 'Download Medical Data' : 'Download Excel'}
                          </button>
                          {activeTool === 'medical' && salesData.length > 0 && (
                            <button onClick={handleSalesExport} disabled={salesExporting}
                              className="ih-sheen flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black text-xs rounded-xl transition-all disabled:opacity-50 shadow-md shadow-sky-500/15 hover:-translate-y-0.5 hover:shadow-lg active:scale-95">
                              {salesExporting ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                              Download Sales Data
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Column selector */}
                      <div className="px-6 py-4 border-b border-slate-50">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Select columns to include</p>
                        <ColumnPills headers={headers} selectedColumns={selectedColumns} onToggleColumn={toggleColumn} />
                      </div>
                      {/* Preview */}
                      <div className="bg-slate-50/40">
                        <PreviewTable data={data.slice(0, 10)} selectedColumns={selectedColumns} totalRows={data.length} />
                      </div>
                    </div>
                  ) : (
                    <div className="tp-reveal space-y-4">
                      {/* Active sheet bar */}
                      <div className="ih-inview bg-white/80 backdrop-blur-xl flex items-center justify-between px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 ih-pulse-glow flex-shrink-0" />
                          <span className="text-sm font-bold text-slate-700">{file?.name}</span>
                          <span className="text-xs text-slate-400">· {data.length} rows</span>
                        </div>
                        <button onClick={() => { setFile(null); setData([]); setHeaders([]); setTerritoryDashData(null); setSalesData([]); setStats(null); }}
                          className="px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-all border border-rose-200">
                          New Sheet
                        </button>
                      </div>
                      {activeTool === 'delhi'
                        ? <DelhiAttendanceDashboard rawData={data} />
                        : activeTool === 'territory'
                        ? <TerritoryManagementDashboard rawData={territoryDashData} />
                        : <AttendanceDashboard rawData={data} />
                      }
                    </div>
                  )
                )}
              </>
            ) : (
              <div
                onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                className="tp-reveal ih-inview ih-tilt3d ih-spotlight rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-80 text-center p-12">
                <div className="tp-pop-in ih-float w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="ih-grad-text text-lg font-black mb-2 bg-gradient-to-r from-slate-900 via-amber-600 to-orange-600">Module In Development</h3>
                <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                  The <span className="font-bold text-slate-700">{meta.title}</span> module is being engineered. Check back soon.
                </p>
              </div>
            )}

      </div>
    </div>
  );
}

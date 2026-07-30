import { useState, useRef } from 'react';
import {
  Download, AlertCircle, Building2, FileSpreadsheet, HeartPulse, Users,
  TrendingUp, LayoutDashboard, LogOut, Settings, Sparkles, ChevronRight, BarChart3, Plane,
} from 'lucide-react';
import { FileUploadZone } from '../Components/FileUploadZone';
import { ColumnPills } from '../Components/ColumnPills';
import { PreviewTable } from '../Components/PreviewTable';
import { AttendanceDashboard } from '../Components/AttendanceDashboard';
import { DelhiAttendanceDashboard } from '../Components/DelhiAttendanceDashboard';
import { TerritoryManagementDashboard } from '../Components/TerritoryManagementDashboard';

type ToolId = 'joining' | 'medical' | 'payroll' | 'attendance' | 'delhi' | 'territory';

interface DataExtractorPageProps {
  onNavigateToPerformance?: () => void;
  onNavigateToAppraisal?: () => void;
  onNavigateToEOM?: () => void;
  onNavigateToPMS?: () => void;
  onNavigateToOfferLetters?: () => void;
  onNavigateToTADA?: () => void;
}

const TOOLS: {
  id: ToolId; label: string; sub: string | null;
  accentBg: string; accentText: string; accentBorder: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'joining',    label: 'Joining Forms',      sub: null,              icon: Users,           accentBg: 'bg-amber-500/10',  accentText: 'text-amber-400',  accentBorder: 'border-amber-500'  },
  { id: 'medical',    label: 'Medical Reports',    sub: null,              icon: HeartPulse,      accentBg: 'bg-rose-500/10',   accentText: 'text-rose-400',   accentBorder: 'border-rose-500'   },
  { id: 'payroll',    label: 'Payroll Exports',    sub: null,              icon: FileSpreadsheet, accentBg: 'bg-sky-500/10',    accentText: 'text-sky-400',    accentBorder: 'border-sky-500'    },
  { id: 'attendance', label: 'Field Attendance',   sub: 'BIZOM',           icon: LayoutDashboard, accentBg: 'bg-amber-500/10',  accentText: 'text-amber-400',  accentBorder: 'border-amber-500'  },
  { id: 'delhi',      label: 'Delhi / HO',         sub: 'Pocket HRMS',     icon: Building2,       accentBg: 'bg-violet-500/10', accentText: 'text-violet-400', accentBorder: 'border-violet-500' },
  { id: 'territory',  label: 'Territory Mgmt',     sub: 'Sales Org Chart', icon: Users,           accentBg: 'bg-indigo-500/10', accentText: 'text-indigo-400', accentBorder: 'border-indigo-500' },
];

const TOOL_META: Record<ToolId, { title: string; desc: string; bar: string; badge: string }> = {
  joining:    { title: 'Joining Form Processor',       desc: 'Extract employee profiles from raw HR joining forms',                      bar: 'bg-amber-500',  badge: 'bg-amber-50  text-amber-700  border-amber-200'  },
  medical:    { title: 'Medical Report Extractor',     desc: 'Parse batch medical examination responses',                                bar: 'bg-rose-500',   badge: 'bg-rose-50   text-rose-700   border-rose-200'   },
  payroll:    { title: 'Payroll Data Manager',         desc: 'Filter and consolidate monthly payroll exports',                           bar: 'bg-sky-500',    badge: 'bg-sky-50    text-sky-700    border-sky-200'    },
  attendance: { title: 'Field Attendance Dashboard',   desc: 'BIZOM format · aggregate by zone, sub-zone, manager, or location',         bar: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  delhi:      { title: 'Delhi / HO Attendance',        desc: 'Pocket HRMS format · department, punch-time and leave analytics',          bar: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  territory:  { title: 'Territory Management',         desc: 'Sales team org chart · zone, designation, RM, and state distribution',     bar: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

const HUB_MODE = import.meta.env.VITE_APP_MODE === 'hub';

export function DataExtractorPage({ onNavigateToPerformance, onNavigateToAppraisal, onNavigateToEOM, onNavigateToPMS, onNavigateToOfferLetters, onNavigateToTADA }: DataExtractorPageProps) {
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
    setActiveTool(id); setFile(null); setData([]); setHeaders([]); setSelectedColumns(new Set()); setError(null); setTerritoryDashData(null); setSalesData([]);
  };

  const meta = TOOL_META[activeTool];
  const isDashboard = activeTool === 'attendance' || activeTool === 'delhi' || activeTool === 'territory';

  return (
    <div className="flex h-screen bg-[#f5f7fa] font-sans overflow-hidden">

      {/* ── Dark sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-60 bg-[#0a0d14] flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-white/[0.06]">
          <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
            <img src="/logo.png" alt="APIS" className="w-full h-full object-contain drop-shadow-lg" />
          </div>
          <div>
            <p className="text-white font-black text-sm tracking-tight leading-none">APIS INDIA</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Enterprise Hub</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2.5 overflow-y-auto">
          {!HUB_MODE && (
            <>
              <p className="px-2.5 pt-4 pb-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Data Tools</p>
              {TOOLS.map(t => {
                const Icon = t.icon;
                const active = activeTool === t.id;
                return (
                  <button key={t.id} onClick={() => switchTool(t.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-all mb-0.5 ${
                      active
                        ? `${t.accentBg} ${t.accentText} border-l-2 ${t.accentBorder} !pl-[8px]`
                        : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                    }`}>
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="leading-tight truncate">{t.label}</p>
                      {t.sub && <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${active ? 'opacity-60' : 'text-slate-700'}`}>{t.sub}</p>}
                    </div>
                  </button>
                );
              })}
              <div className="my-2.5 border-t border-white/[0.06]" />
            </>
          )}
          {HUB_MODE && <div className="pt-4" />}
          {!HUB_MODE && (
            <>
              <p className="px-2.5 pb-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Performance</p>
              {onNavigateToPerformance && (
              <button onClick={onNavigateToPerformance}
                className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold text-slate-500 hover:bg-violet-500/10 hover:text-violet-400 transition-all group">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <div>
                    <p>Performance Hub</p>
                    <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mt-0.5 group-hover:text-violet-700">Goals &amp; Reviews</p>
                  </div>
                </div>
                <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-80" />
              </button>
              )}
            </>
          )}
          {HUB_MODE && (
            <p className="px-2.5 pb-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Hubs</p>
          )}
          <button onClick={onNavigateToAppraisal}
            className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold text-slate-500 hover:bg-blue-500/10 hover:text-blue-400 transition-all group">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <div>
                <p>Appraisal Hub</p>
                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mt-0.5 group-hover:text-blue-700">Annual Appraisal</p>
              </div>
            </div>
            <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-80" />
          </button>
          <button onClick={onNavigateToEOM}
            className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all group">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-3.5 h-3.5" />
              <div>
                <p>EOM Hub</p>
                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mt-0.5 group-hover:text-emerald-700">Employee of the Month</p>
              </div>
            </div>
            <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-80" />
          </button>
          {!HUB_MODE && (
          <>
          <button onClick={onNavigateToPMS}
            className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold text-slate-500 hover:bg-violet-500/10 hover:text-violet-400 transition-all group">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-3.5 h-3.5" />
              <div>
                <p>PMS Simulator</p>
                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mt-0.5 group-hover:text-violet-700">Performance & Salary Sim</p>
              </div>
            </div>
            <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-80" />
          </button>
          {onNavigateToOfferLetters && (
          <button onClick={onNavigateToOfferLetters}
            className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all group">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <div>
                <p>Offer Letters</p>
                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mt-0.5 group-hover:text-rose-700">Generate & Send</p>
              </div>
            </div>
            <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-80" />
          </button>
          )}
          {onNavigateToTADA && (
          <button onClick={onNavigateToTADA}
            className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold text-slate-500 hover:bg-sky-500/10 hover:text-sky-400 transition-all group">
            <div className="flex items-center gap-2.5">
              <Plane className="w-3.5 h-3.5" />
              <div>
                <p>TA/DA Portal</p>
                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mt-0.5 group-hover:text-sky-700">Travel & Allowance</p>
              </div>
            </div>
            <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-80" />
          </button>
          )}
          </>
          )}
        </nav>

        {/* Bottom */}
        <div className="p-2.5 border-t border-white/[0.06] space-y-0.5">
          <a href="#" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-600 hover:bg-white/5 hover:text-slate-300 text-[13px] font-semibold transition-all">
            <Settings className="w-3.5 h-3.5" /><span>Settings</span>
          </a>
          <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-600 hover:bg-rose-500/10 hover:text-rose-400 text-[13px] font-semibold transition-all">
            <LogOut className="w-3.5 h-3.5" /><span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {HUB_MODE && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="text-center">
              <img src="/logo.png" alt="APIS" className="w-16 h-16 object-contain mx-auto mb-4 drop-shadow-lg" />
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">APIS INDIA</h1>
              <p className="text-sm text-slate-500 mt-1">Select a hub from the sidebar to get started</p>
            </div>
            <div className="flex gap-4">
              <button onClick={onNavigateToAppraisal}
                className="flex flex-col items-center gap-3 px-8 py-6 bg-white rounded-2xl shadow-md border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all group">
                <TrendingUp className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <p className="font-black text-slate-800 text-sm">Appraisal Hub</p>
                  <p className="text-xs text-slate-400 mt-0.5">Annual Appraisal</p>
                </div>
              </button>
              <button onClick={onNavigateToEOM}
                className="flex flex-col items-center gap-3 px-8 py-6 bg-white rounded-2xl shadow-md border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all group">
                <Sparkles className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <p className="font-black text-slate-800 text-sm">EOM Hub</p>
                  <p className="text-xs text-slate-400 mt-0.5">Employee of the Month</p>
                </div>
              </button>
            </div>
          </div>
        )}
        {!HUB_MODE && <>

        {/* Compact page header */}
        <header className="bg-white border-b border-slate-100 px-7 py-3.5 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className={`w-1 h-7 rounded-full ${meta.bar}`} />
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight">{meta.title}</h1>
              <p className="text-xs text-slate-400 mt-0.5">{meta.desc}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${meta.badge}`}>
            Active
          </span>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1440px] mx-auto space-y-5">

            {(activeTool === 'joining' || activeTool === 'medical' || isDashboard) ? (
              <>
                {/* Upload zone */}
                {data.length === 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-7">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">Upload File</p>
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
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      {/* Header bar */}
                      <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Review &amp; Export</p>
                          <p className="text-sm font-semibold text-slate-700 mt-0.5">
                            <span className="text-amber-600 font-black">{data.length}</span> records extracted from {file?.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setFile(null); setData([]); setHeaders([]); setTerritoryDashData(null); setSalesData([]); }}
                            className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">
                            ← Re-upload
                          </button>
                          <button onClick={handleExport} disabled={loading || selectedColumns.size === 0}
                            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 shadow-md shadow-amber-500/15 hover:scale-[1.02] active:scale-95">
                            {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            {activeTool === 'medical' ? 'Download Medical Data' : 'Download Excel'}
                          </button>
                          {activeTool === 'medical' && salesData.length > 0 && (
                            <button onClick={handleSalesExport} disabled={salesExporting}
                              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 shadow-md shadow-sky-500/15 hover:scale-[1.02] active:scale-95">
                              {salesExporting ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                              Download Sales Data
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Column selector */}
                      <div className="px-6 py-4 border-b border-slate-50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Select columns to include</p>
                        <ColumnPills headers={headers} selectedColumns={selectedColumns} onToggleColumn={toggleColumn} />
                      </div>
                      {/* Preview */}
                      <div className="bg-slate-50/40">
                        <PreviewTable data={data.slice(0, 10)} selectedColumns={selectedColumns} totalRows={data.length} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Active sheet bar */}
                      <div className="bg-white flex items-center justify-between px-5 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                          <span className="text-sm font-bold text-slate-700">{file?.name}</span>
                          <span className="text-xs text-slate-400">· {data.length} rows</span>
                        </div>
                        <button onClick={() => { setFile(null); setData([]); setHeaders([]); setTerritoryDashData(null); setSalesData([]); }}
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
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-80 text-center p-12">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">Module In Development</h3>
                <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                  The <span className="font-bold text-slate-700">{meta.title}</span> module is being engineered. Check back soon.
                </p>
              </div>
            )}

          </div>
        </div>
        </>}
      </main>
    </div>
  );
}

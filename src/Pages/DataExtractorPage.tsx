import { useState } from 'react';
import { Download, AlertCircle, Building2, LayoutDashboard, Settings, LogOut, FileSpreadsheet, HeartPulse, Users, Sparkles } from 'lucide-react';
import { FileUploadZone } from '../Components/FileUploadZone';
import { ColumnPills } from '../Components/ColumnPills';
import { PreviewTable } from '../Components/PreviewTable';

export function DataExtractorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<unknown[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  
  // New state for the active tool
  const [activeTool, setActiveTool] = useState<'joining' | 'medical' | 'payroll'>('joining');

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    setError(null);
    if (selectedFile) {
      setHeaders([]);
      setData([]);
      setSelectedColumns(new Set());
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${API_BASE_URL}/api/user_management/upload-excel/`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process file');
      }

      setHeaders(result.headers);
      setData(result.data);
      setSelectedColumns(new Set(result.headers));
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (data.length === 0) return;

    setLoading(true);
    setError(null);

    const filteredData = data.map((row) => {
      const filteredRow: Record<string, unknown> = {};
      const record = row as Record<string, unknown>;
      selectedColumns.forEach(col => {
        filteredRow[col] = record[col];
      });
      return filteredRow;
    });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${API_BASE_URL}/api/user_management/export-excel/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: filteredData }),
      });

      if (!response.ok) {
        throw new Error('Failed to export file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Apis_${activeTool.toUpperCase()}_Filtered_${file?.name || 'export.xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (col: string) => {
    const newSelection = new Set(selectedColumns);
    if (newSelection.has(col)) {
      newSelection.delete(col);
    } else {
      newSelection.add(col);
    }
    setSelectedColumns(newSelection);
  };

  const displayData = data.slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row selection:bg-amber-200 selection:text-amber-900">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 flex flex-col shadow-lg z-20 sticky top-0 h-screen">
        <div className="p-6 flex items-center space-x-4 border-b border-slate-100 bg-white">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white p-2.5 rounded-xl shadow-md shadow-amber-500/20">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">APIS INDIA</h2>
            <div className="flex items-center space-x-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Enterprise Hub</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Data Tools</p>
          
          <button 
            onClick={() => { setActiveTool('joining'); setFile(null); setData([]); }}
            className={`flex items-center space-x-3 px-4 py-3.5 rounded-2xl font-semibold transition-all duration-300 w-full text-left group
              ${activeTool === 'joining' 
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 shadow-sm border border-amber-200/50' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
          >
            <Users className={`w-5 h-5 ${activeTool === 'joining' ? 'text-amber-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
            <span>Joining Forms</span>
          </button>
          
          <button 
            onClick={() => { setActiveTool('medical'); setFile(null); setData([]); }}
            className={`flex items-center space-x-3 px-4 py-3.5 rounded-2xl font-semibold transition-all duration-300 w-full text-left group
              ${activeTool === 'medical' 
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 shadow-sm border border-amber-200/50' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
          >
            <HeartPulse className={`w-5 h-5 ${activeTool === 'medical' ? 'text-amber-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
            <span>Medical Reports</span>
          </button>

          <button 
            onClick={() => { setActiveTool('payroll'); setFile(null); setData([]); }}
            className={`flex items-center space-x-3 px-4 py-3.5 rounded-2xl font-semibold transition-all duration-300 w-full text-left group
              ${activeTool === 'payroll' 
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 shadow-sm border border-amber-200/50' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
          >
            <FileSpreadsheet className={`w-5 h-5 ${activeTool === 'payroll' ? 'text-amber-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
            <span>Payroll Exports</span>
          </button>

          <div className="my-6 border-t border-slate-100"></div>
          
          <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">System</p>
          <a href="#" className="flex items-center space-x-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-2xl font-semibold transition-colors">
            <LayoutDashboard className="w-5 h-5 text-slate-400" />
            <span>Dashboard Hub</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-2xl font-semibold transition-colors">
            <Settings className="w-5 h-5 text-slate-400" />
            <span>Settings</span>
          </a>
        </nav>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100">
          <button className="flex items-center justify-center space-x-3 px-4 py-3 w-full text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl font-bold transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[url('/grid-bg.svg')] bg-center">
        
        {/* Hero Banner */}
        <div className="relative h-56 md:h-72 bg-slate-900 overflow-hidden flex-shrink-0 shadow-xl">
          <div className="absolute inset-0">
            <img 
              src="/dashboard-bg.png" 
              alt="Apis India Background" 
              className="w-full h-full object-cover opacity-30 mix-blend-color-dodge transition-transform duration-1000 scale-105 hover:scale-100"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
          
          {/* Magic glow effect */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse"></div>

          <div className="relative h-full flex flex-col justify-end p-8 md:p-14 text-white">
            <div className="flex items-center space-x-3 mb-3">
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                Active Module
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 flex items-center gap-4">
              {activeTool === 'joining' && 'Joining Form Processor'}
              {activeTool === 'medical' && 'Medical Report Extractor'}
              {activeTool === 'payroll' && 'Payroll Data Manager'}
              <Sparkles className="text-amber-400 w-8 h-8 animate-pulse" />
            </h1>
            <p className="text-slate-300 max-w-3xl text-base md:text-lg font-medium leading-relaxed">
              {activeTool === 'joining' && "Upload raw HR Joining Forms. The system will automatically detect and extract all 'Done' profiles into a clean, ready-to-share dataset."}
              {activeTool === 'medical' && "Upload batch Medical Examination responses. Seamlessly extract flagged health metrics and employee details in one click."}
              {activeTool === 'payroll' && "Consolidate and filter monthly payroll exports. Select specific columns to generate specialized financial reports."}
            </p>
          </div>
        </div>

        {/* Scrollable Content (Wider Layout) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 lg:p-14">
          <div className="w-full max-w-[1400px] mx-auto space-y-8"> {/* Changed from max-w-5xl to max-w-[1400px] to fill space */}
            
            {activeTool === 'joining' ? (
              <>
                {/* Upload Section */}
                <div className="bg-white/90 backdrop-blur-2xl p-8 md:p-10 rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-white relative overflow-hidden group hover:shadow-[0_8px_50px_rgb(245,158,11,0.12)] transition-all duration-500">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 bg-[length:200%_auto] animate-gradient"></div>
                  
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-slate-800">
                      1. Upload Joining Forms Excel
                    </h3>
                    <p className="text-slate-500 mt-1">Our intelligent extraction engine will process the file instantly.</p>
                  </div>

                  <FileUploadZone 
                    file={file}
                    loading={loading}
                    isProcessed={data.length > 0}
                    onFileSelect={handleFileSelect}
                    onProcess={handleUpload}
                  />

                  {error && (
                    <div className="mt-8 p-5 bg-red-50 text-red-700 rounded-2xl flex items-start space-x-4 border border-red-100 shadow-sm">
                      <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-red-800">Processing Error</h4>
                        <p className="mt-1 text-sm font-medium">{error}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Data Preview Section */}
                {data.length > 0 && (
                  <div className="bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-white overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-700">
                    
                    <div className="p-8 md:p-10 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-br from-slate-50 to-white">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800">2. Review & Export</h2>
                        <p className="text-base text-slate-500 mt-2">
                          Successfully extracted <span className="font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md">{data.length} records</span> from the raw file.
                        </p>
                      </div>
                      <button
                        onClick={handleExport}
                        disabled={loading || selectedColumns.size === 0}
                        className="flex items-center justify-center space-x-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-lg rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:scale-100 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/30 w-full lg:w-auto transform"
                      >
                        {loading ? (
                          <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Download className="w-6 h-6 animate-bounce-subtle" />
                        )}
                        <span>Download Final Excel</span>
                      </button>
                    </div>

                    <div className="bg-white p-8 border-b border-slate-50">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Select columns to include in export</h4>
                      <ColumnPills 
                        headers={headers}
                        selectedColumns={selectedColumns}
                        onToggleColumn={toggleColumn}
                      />
                    </div>

                    <div className="p-4 md:p-8 bg-slate-50/50">
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <PreviewTable 
                          data={displayData}
                          selectedColumns={selectedColumns}
                          totalRows={data.length}
                        />
                      </div>
                    </div>

                  </div>
                )}
              </>
            ) : (
              <div className="bg-white/90 backdrop-blur-2xl p-12 md:p-20 rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-white text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="bg-slate-100 p-6 rounded-full mb-6">
                  <Sparkles className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-3xl font-extrabold text-slate-800 mb-4">Module In Development</h3>
                <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                  The automated extraction logic for {activeTool === 'medical' ? 'Medical Reports' : 'Payroll Exports'} is currently being engineered by our team. Check back soon for updates!
                </p>
              </div>
            )}

          </div>
        </div>
      </main>

    </div>
  );
}

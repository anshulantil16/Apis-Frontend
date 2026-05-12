import React, { useState } from 'react';
import { Download, AlertCircle, Building2, LayoutDashboard, Settings, LogOut, FileSpreadsheet } from 'lucide-react';
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

    try {
      const response = await fetch('http://localhost:8000/api/user_management/upload-excel/', {
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

    try {
      const response = await fetch('http://localhost:8000/api/user_management/export-excel/', {
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
      a.download = `Apis_Filtered_${file?.name || 'export.xlsx'}`;
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
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-100">
          <div className="bg-amber-500 text-white p-2 rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">APIS INDIA</h2>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Internal Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <a href="#" className="flex items-center space-x-3 px-4 py-3 bg-amber-50 text-amber-700 rounded-xl font-medium">
            <FileSpreadsheet className="w-5 h-5" />
            <span>Data Extractor</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl font-medium transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span>Overview</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl font-medium transition-colors">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </a>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button className="flex items-center space-x-3 px-4 py-3 w-full text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl font-medium transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Hero Banner */}
        <div className="relative h-48 md:h-64 bg-slate-900 overflow-hidden flex-shrink-0">
          <div className="absolute inset-0">
            <img 
              src="/dashboard-bg.png" 
              alt="Apis India Background" 
              className="w-full h-full object-cover opacity-40 mix-blend-overlay"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
          <div className="relative h-full flex flex-col justify-end p-8 md:p-12 text-white">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">HR Data Processing</h1>
            <p className="text-slate-300 max-w-xl text-sm md:text-base">
              Securely upload your raw sheets, let the system filter 'Done' remarks automatically, and download the clean dataset in seconds.
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Upload Section */}
            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
              
              <FileUploadZone 
                file={file}
                loading={loading}
                isProcessed={data.length > 0}
                onFileSelect={handleFileSelect}
                onProcess={handleUpload}
              />

              {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start space-x-3 border border-red-100">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            {/* Data Preview Section */}
            {data.length > 0 && (
              <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between bg-slate-50/50 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Review & Export</h2>
                    <p className="text-sm text-slate-500 mt-1">Found <span className="font-bold text-amber-600">{data.length} profiles</span> marked as 'Done'</p>
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={loading || selectedColumns.size === 0}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-md shadow-amber-500/20 w-full md:w-auto"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    <span>Download Clean Excel</span>
                  </button>
                </div>

                <div className="bg-white">
                  <ColumnPills 
                    headers={headers}
                    selectedColumns={selectedColumns}
                    onToggleColumn={toggleColumn}
                  />
                </div>

                <div className="p-2 md:p-0">
                  <PreviewTable 
                    data={displayData}
                    selectedColumns={selectedColumns}
                    totalRows={data.length}
                  />
                </div>

              </div>
            )}

          </div>
        </div>
      </main>

    </div>
  );
}

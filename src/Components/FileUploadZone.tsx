import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, X, ArrowRight } from 'lucide-react';

interface FileUploadZoneProps {
  file: File | null;
  loading: boolean;
  isProcessed: boolean;
  onFileSelect: (file: File | null) => void;
  onProcess: () => void;
}

export function FileUploadZone({ file, loading, isProcessed, onFileSelect, onProcess }: FileUploadZoneProps) {
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) onFileSelect(accepted[0]);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  if (!file) {
    return (
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 select-none
          ${isDragActive
            ? 'border-amber-400 bg-amber-50/60 scale-[1.01]'
            : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50/60 bg-slate-50/30'
          }`}
      >
        <input {...getInputProps()} />
        <div className={`mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-amber-100' : 'bg-white border border-slate-200 shadow-sm'}`}>
          <UploadCloud className={`w-6 h-6 transition-colors ${isDragActive ? 'text-amber-600' : 'text-slate-400'}`} />
        </div>
        <p className="text-sm font-bold text-slate-700">
          {isDragActive ? 'Drop it here' : 'Drag & drop your file here'}
        </p>
        <p className="text-xs text-slate-400 mt-1.5 font-medium">
          or <span className="text-amber-600 font-bold underline underline-offset-2">click to browse</span> · .xlsx .xls .csv
        </p>
      </div>
    );
  }

  const sizeMB = (file.size / 1024 / 1024).toFixed(2);

  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{file.name}</p>
          <p className="text-xs text-slate-400 font-medium mt-0.5">{sizeMB} MB · ready to process</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onFileSelect(null)}
          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
          title="Remove file"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={onProcess}
          disabled={loading || isProcessed}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 shadow-sm active:scale-95"
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isProcessed ? (
            <span className="text-emerald-400">✓</span>
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
          <span>{isProcessed ? 'Processed' : 'Process'}</span>
        </button>
      </div>
    </div>
  );
}

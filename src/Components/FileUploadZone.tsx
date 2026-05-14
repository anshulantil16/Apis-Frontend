import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, Trash2, CheckCircle } from 'lucide-react';

interface FileUploadZoneProps {
  file: File | null;
  loading: boolean;
  isProcessed: boolean;
  onFileSelect: (file: File | null) => void;
  onProcess: () => void;
}

export function FileUploadZone({ 
  file, 
  loading, 
  isProcessed, 
  onFileSelect, 
  onProcess 
}: FileUploadZoneProps) {
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  if (!file) {
    return (
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300
          ${isDragActive ? 'border-amber-500 bg-amber-50 shadow-inner' : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50 hover:shadow-md'}`}
      >
        <input {...getInputProps()} />
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-full ${isDragActive ? 'bg-amber-100' : 'bg-slate-100'} transition-colors`}>
            <UploadCloud className={`w-10 h-10 ${isDragActive ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
        </div>
        <h3 className="text-xl font-bold text-slate-800">Drag & drop your raw Excel here</h3>
        <p className="text-sm text-slate-500 mt-2 font-medium">Supports .xlsx and .xls formats</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-2 rounded-2xl border-amber-100 bg-amber-50/30 gap-4">
      <div className="flex items-center space-x-4">
        <div className="p-4 bg-white rounded-xl shadow-sm border border-amber-100">
          <FileSpreadsheet className="w-8 h-8 text-amber-600" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-lg">{file.name}</h4>
          <p className="text-sm font-medium text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      </div>
      <div className="flex items-center space-x-3 w-full md:w-auto">
        <button 
          onClick={() => onFileSelect(null)}
          className="p-3 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100"
          title="Remove file"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <button
          onClick={onProcess}
          disabled={loading || isProcessed}
          className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-md"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isProcessed ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <UploadCloud className="w-5 h-5" />
          )}
          <span>{isProcessed ? 'Processed' : 'Process Data'}</span>
        </button>
      </div>
    </div>
  );
}

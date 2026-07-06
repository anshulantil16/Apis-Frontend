import { useState } from 'react';
import { Upload, Download, Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const _API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PMS_API = `${_API_BASE}/api/pms`;

interface UploadResult {
  employee_id: string;
  name: string;
  status: 'sent' | 'pending' | 'generated_no_email' | 'failed';
  message: string;
}

export function OfferLetterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [sendEmails, setSendEmails] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const downloadTemplate = async () => {
    try {
      const response = await fetch(`${PMS_API}/offer-letter/template/`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'OfferLetter_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download template');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file');
      return;
    }

    setLoading(true);
    setResults([]);
    setErrors([]);
    setUploadComplete(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('send_emails', sendEmails.toString());

      const response = await fetch(`${PMS_API}/offer-letter/upload/`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Upload failed');
        setErrors([data.detail || 'Unknown error']);
        return;
      }

      setResults(data.results || []);
      setErrors(data.errors || []);
      setUploadComplete(true);
      setFile(null);
    } catch (error) {
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">📄 Offer Letter Generator</h1>
          <p className="text-slate-600">Generate and send personalized CTC revision letters to all employees</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Upload Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-lg">
              {/* Steps */}
              <div className="mb-8 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Download Template</h3>
                    <p className="text-sm text-slate-600">Get the Excel template with all required columns</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Fill Employee Data</h3>
                    <p className="text-sm text-slate-600">Add CTC, ratings, and effective dates for each employee</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Upload & Generate</h3>
                    <p className="text-sm text-slate-600">System creates PDFs and optionally sends emails</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-8">
                {/* Download Button */}
                <button
                  onClick={downloadTemplate}
                  className="w-full mb-6 py-3 px-6 rounded-2xl border-2 border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Excel Template
                </button>

                {/* Upload Form */}
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                      Upload Completed Template
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer text-sm text-slate-600"
                      />
                      {file && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-sm text-slate-600">{file.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                    <input
                      type="checkbox"
                      id="sendEmails"
                      checked={sendEmails}
                      onChange={(e) => setSendEmails(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="sendEmails" className="flex-1 cursor-pointer">
                      <span className="font-bold text-slate-900 text-sm">📧 Send emails to employees</span>
                      <p className="text-xs text-slate-600 mt-0.5">Letters will be attached as PDFs and sent immediately</p>
                    </label>
                  </div>

                  {/* Upload Button */}
                  <button
                    type="submit"
                    disabled={!file || loading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Generate Letters
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right: Info Panel */}
          <div>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg">
              <h3 className="font-bold text-lg mb-4">✨ How It Works</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-bold mb-1">📋 Template Columns</p>
                  <p className="opacity-90">Employee ID, Name, Email, Current/New CTC, Effective Date, Ratings, Remarks</p>
                </div>
                <div>
                  <p className="font-bold mb-1">📄 Generated Letters</p>
                  <p className="opacity-90">Professional PDFs with CTC breakdown, increment details, and promotion info</p>
                </div>
                <div>
                  <p className="font-bold mb-1">✉️ Email Delivery</p>
                  <p className="opacity-90">Optional automatic sending to employee email addresses</p>
                </div>
                <div>
                  <p className="font-bold mb-1">📊 Tracking</p>
                  <p className="opacity-90">See status of each letter (pending, sent, or failed)</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <p className="text-xs opacity-75">💡 Tip: Download the template first to see required columns and formatting</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {uploadComplete && (
          <div className="mt-8 space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-900 mb-4">📊 Upload Results</h2>

              {errors.length > 0 && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200">
                  <div className="flex items-start gap-3 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-red-600 text-sm">Errors ({errors.length})</p>
                      <div className="space-y-1 mt-2">
                        {errors.map((err, i) => (
                          <p key={i} className="text-sm text-red-600">• {err}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Table */}
              {results.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left py-3 px-4 font-bold text-slate-700">Employee ID</th>
                        <th className="text-left py-3 px-4 font-bold text-slate-700">Name</th>
                        <th className="text-left py-3 px-4 font-bold text-slate-700">Status</th>
                        <th className="text-left py-3 px-4 font-bold text-slate-700">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {results.map((result, i) => (
                        <tr key={i} className={`${
                          result.status === 'sent' ? 'bg-green-50' :
                          result.status === 'pending' ? 'bg-amber-50' :
                          result.status === 'generated_no_email' ? 'bg-blue-50' :
                          'bg-red-50'
                        }`}>
                          <td className="py-3 px-4 font-mono text-xs">{result.employee_id}</td>
                          <td className="py-3 px-4">{result.name}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              result.status === 'sent' ? 'bg-green-200 text-green-800' :
                              result.status === 'pending' ? 'bg-amber-200 text-amber-800' :
                              result.status === 'generated_no_email' ? 'bg-blue-200 text-blue-800' :
                              'bg-red-200 text-red-800'
                            }`}>
                              {result.status === 'sent' ? <Mail className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                              {result.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{result.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => {
                    setUploadComplete(false);
                    setResults([]);
                    setErrors([]);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all"
                >
                  Reset
                </button>
                <button
                  onClick={downloadTemplate}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Template Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

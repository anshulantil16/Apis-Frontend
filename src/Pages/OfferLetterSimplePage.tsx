import { useState } from 'react';
import { Download, Upload, Send, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const _API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PMS_API = `${_API_BASE}/api/pms`;

export function OfferLetterSimplePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [sendEmails, setSendEmails] = useState(true);

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
    } catch (err) {
      setError('Failed to download template');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);
    setResults([]);

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
        setError(data.error || 'Upload failed');
        return;
      }

      setResults(data.results || []);
      setSuccess(true);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">📄 Offer Letters</h1>
          <p className="text-slate-600">Download template, fill data, and send letters to employees</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          {!success ? (
            <>
              {/* Step 1: Download */}
              <div className="mb-8">
                <h2 className="text-lg font-bold text-slate-900 mb-3">Step 1: Download Template</h2>
                <button
                  onClick={downloadTemplate}
                  className="w-full py-3 px-4 rounded-xl border-2 border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Excel Template
                </button>
                <p className="text-xs text-slate-500 mt-2">Includes: Employee ID, Title, Name, Email, Designations, Current/New CTC, Performance Assessment, Effective Date, etc.</p>
              </div>

              {/* Step 2: Upload */}
              <div className="mb-8">
                <h2 className="text-lg font-bold text-slate-900 mb-3">Step 2: Fill & Upload</h2>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Select your completed Excel file:
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => {
                        setFile(e.target.files?.[0] || null);
                        setError('');
                      }}
                      className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600"
                    />
                    {file && (
                      <p className="text-sm text-green-600 font-semibold mt-2">✓ {file.name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <input
                      type="checkbox"
                      id="sendEmails"
                      checked={sendEmails}
                      onChange={(e) => setSendEmails(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="sendEmails" className="flex-1 cursor-pointer">
                      <span className="font-bold text-slate-900 text-sm">Send letters to employee emails</span>
                      <p className="text-xs text-slate-600 mt-1">Uncheck to only generate PDFs without sending</p>
                    </label>
                  </div>

                  {error && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!file || loading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Generating & Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Generate Letters & Send
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              {/* Success Results */}
              <div className="text-center mb-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Success!</h2>
                <p className="text-slate-600">Offer letters generated and sent to employees</p>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-4 font-bold text-slate-700">Employee</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-700">Status</th>
                      <th className="text-left py-3 px-4 font-bold text-slate-700">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-semibold text-slate-900">{r.name}</p>
                            <p className="text-xs text-slate-500">{r.employee_id}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            r.status === 'sent'
                              ? 'bg-green-100 text-green-800'
                              : r.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {r.status === 'sent' ? '✓ Sent' : r.status === 'pending' ? '⏳ Pending' : '✓ Generated'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => {
                  setSuccess(false);
                  setResults([]);
                  setFile(null);
                  setError('');
                }}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Another File
              </button>
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 rounded-xl bg-blue-50 border border-blue-200">
          <h3 className="font-bold text-slate-900 mb-3">📋 What to include in the Excel file:</h3>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>✓ Employee ID, Employee Name, Email Address</li>
            <li>✓ Title (Mr./Ms.) — used in the salutation</li>
            <li>✓ Current CTC, New CTC, Effective Date (YYYY-MM-DD)</li>
            <li>✓ Current &amp; New Designation — a <b>Promotion Letter</b> is generated automatically when the designation changes, otherwise a <b>Salary Revision Letter</b></li>
            <li>✓ Performance Assessment (e.g. "Strong Performer") — shown in the letter</li>
            <li>✓ Increment %, Promotion %, Performance Rating, Grade Label (optional)</li>
            <li>✓ <b>Annexure-A salary break-up</b> (green columns): Basic, HRA, allowances &amp; reimbursements as <b>Monthly</b>; PF, ESI, Mediclaim, Bonus, Variable &amp; Gift as <b>Annual</b>. <b>Leave a component blank</b> if the employee isn't eligible — it won't appear in their letter.</li>
            <li>✓ Employee detail columns for Annexure: Function, Cadre, Grade, Date of Joining, Work Location</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

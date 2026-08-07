import { useState, useEffect, useCallback } from 'react';
import {
  Download, Upload, Send, CheckCircle, AlertCircle, Loader, XCircle,
  History, Trash2, Search, RefreshCw, FileWarning, UserPlus,
} from 'lucide-react';

const _API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PMS_API = `${_API_BASE}/api/pms`;

const WARNING_TYPES = [
  { value: 'verbal', label: 'Verbal Warning' },
  { value: 'first', label: 'First Written Warning' },
  { value: 'second', label: 'Second Written Warning' },
  { value: 'final', label: 'Final Warning' },
  { value: 'show_cause', label: 'Show Cause Notice' },
];

const badgeFor = (status: string) =>
  status === 'sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';

const labelFor = (status: string) =>
  status === 'sent' ? '✓ Sent' : status === 'failed' ? '✕ Failed' : '✓ Generated';

/* ────────────────────────────────────────────────────────────────────────── */
/* Single-employee form — the usual way a warning is issued (one at a time).   */
/* ────────────────────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  employee_code: '', employee_name: '', salutation: 'Mr.',
  designation: '', department: '', work_location: '', reporting_manager: '',
  email_address: '', cc_emails: '',
  warning_type: 'first', warning_type_label: '',
  subject: '', incident_date: '', incident_description: '',
  previous_warning_ref: '', corrective_action: '', response_due_days: '',
  letter_date: new Date().toISOString().slice(0, 10),
  issued_by: '', issued_by_designation: '', remarks: '',
};

/* Numbered section heading — gives the long form a clear sense of progress. */
function SectionHead({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-red-600
                      text-white text-xs font-black flex items-center justify-center
                      shadow-md shadow-rose-500/25 flex-shrink-0">
        {n}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-black text-slate-800 tracking-tight leading-none">{title}</h3>
        {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent ml-2" />
    </div>
  );
}

/* Declared at module scope on purpose: a component declared inside the panel
   would be a NEW component type on every render, so React would unmount and
   remount the input and the field would lose focus after each keystroke. */
const INPUT_CLS =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm ' +
  'text-slate-800 placeholder:text-slate-400 transition-all ' +
  'hover:border-slate-300 focus:outline-none focus:bg-white focus:border-rose-400 ' +
  'focus:ring-4 focus:ring-rose-500/10';

const LABEL_CLS =
  'block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5';

function Field({ label, value, onChange, type = 'text', ph = '', req = false }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; ph?: string; req?: boolean;
}) {
  return (
    <div>
      <label className={LABEL_CLS}>
        {label}{req && <span className="text-rose-500"> *</span>}
      </label>
      <input
        type={type} value={value} placeholder={ph}
        onChange={e => onChange(e.target.value)}
        className={INPUT_CLS}
      />
    </div>
  );
}

function Area({ label, value, onChange, ph = '', rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; ph?: string; rows?: number;
}) {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <textarea
        value={value} placeholder={ph} rows={rows}
        onChange={e => onChange(e.target.value)}
        className={`${INPUT_CLS} resize-y leading-relaxed`}
      />
    </div>
  );
}

function SingleLetterPanel() {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [sendEmail, setSendEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<any>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_code.trim() || !form.employee_name.trim()) {
      setErr('Employee Code and Employee Name are required.');
      return;
    }
    if (sendEmail && !form.email_address.trim()) {
      setErr('Email address is required when "send email" is enabled.');
      return;
    }
    setBusy(true); setErr(''); setResult(null);
    try {
      const res = await fetch(`${PMS_API}/warning-letter/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, send_email: sendEmail ? 'true' : 'false' }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to generate letter');
      setResult(d);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed to generate letter');
    } finally { setBusy(false); }
  };

  // Helpers that RETURN elements of the stable module-scope Field/Area types.
  // Called as functions, never rendered as <F/> — a locally-declared component
  // would be a new type each render and would drop input focus per keystroke.
  const F = (label: string, k: keyof typeof EMPTY_FORM,
             opts: { type?: string; ph?: string; req?: boolean } = {}) => (
    <Field key={k} label={label} value={form[k]} onChange={v => set(k, v)}
      type={opts.type} ph={opts.ph} req={opts.req} />
  );
  const TA = (label: string, k: keyof typeof EMPTY_FORM,
              opts: { ph?: string; rows?: number } = {}) => (
    <Area key={k} label={label} value={form[k]} onChange={v => set(k, v)}
      ph={opts.ph} rows={opts.rows} />
  );

  if (result) {
    return (
      <div className="text-center py-8">
        <div className={`w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center
          ${result.emailed ? 'bg-emerald-50 ring-8 ring-emerald-500/10'
            : result.generated ? 'bg-blue-50 ring-8 ring-blue-500/10'
              : 'bg-rose-50 ring-8 ring-rose-500/10'}`}>
          {result.generated
            ? <CheckCircle className={`w-10 h-10 ${result.emailed ? 'text-emerald-500' : 'text-blue-500'}`} />
            : <XCircle className="w-10 h-10 text-rose-500" />}
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1.5">{result.message}</h3>
        {result.error && <p className="text-sm text-rose-600 mb-2">{result.error}</p>}
        {result.cc?.length > 0 && (
          <p className="text-xs text-slate-500 mb-1">
            <span className="font-bold text-slate-600">Cc:</span> {result.cc.join(', ')}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 mt-7">
          {result.pdf_url && (
            <a href={`${_API_BASE}${result.pdf_url}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-white
                         text-sm font-bold hover:bg-slate-900 transition-all hover:-translate-y-0.5">
              <FileWarning className="w-4 h-4" />View PDF
            </a>
          )}
          <button
            onClick={() => { setResult(null); setForm({ ...EMPTY_FORM }); setSendEmail(false); }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white
                       text-sm font-bold shadow-lg shadow-rose-500/25 transition-all
                       hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-500/30">
            Issue Another Letter
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {err && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-rose-800">{err}</p>
        </div>
      )}

      <section>
        <SectionHead n={1} title="Employee Details" hint="Who the letter is addressed to" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {F('Employee Code', 'employee_code', { req: true, ph: 'EMP001' })}
          {F('Employee Name', 'employee_name', { req: true, ph: 'Rahul Sharma' })}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Title</label>
            <select value={form.salutation} onChange={e => set('salutation', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-red-400">
              <option>Mr.</option><option>Ms.</option><option>Mrs.</option><option>Mr./Ms.</option>
            </select>
          </div>
          {F('Designation', 'designation', { ph: 'Sales Officer' })}
          {F('Department', 'department', { ph: 'Sales' })}
          {F('Work Location', 'work_location', { ph: 'Delhi HO' })}
          {F('Reporting Manager', 'reporting_manager', { ph: 'Suresh Patel' })}
        </div>
      </section>

      <section>
        <SectionHead n={2} title="Warning Details" hint="Be specific — a vague disciplinary letter is hard to defend" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Warning Type</label>
            <select value={form.warning_type} onChange={e => set('warning_type', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-red-400">
              {WARNING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {F('Custom Heading (optional)', 'warning_type_label', { ph: 'Overrides the heading above' })}
          <div className="sm:col-span-2">
            {F('Subject', 'subject', { ph: 'Habitual Late Attendance' })}
          </div>
          {F('Incident Date', 'incident_date', { ph: '12-05-2026' })}
          {F('Response Due (days)', 'response_due_days', { type: 'number', ph: '0 = no deadline' })}
          <div className="sm:col-span-2">
            {TA('Incident Description', 'incident_description',
              { rows: 4, ph: 'What happened, when, and how often. One point per line.' })}
          </div>
          <div className="sm:col-span-2">
            {F('Previous Warning Reference', 'previous_warning_ref',
              { ph: 'First Written Warning dated 10 March 2026' })}
          </div>
          <div className="sm:col-span-2">
            {TA('Corrective Action Expected', 'corrective_action', { ph: 'One action per line.' })}
          </div>
          <div className="sm:col-span-2">
            {TA('Additional Remarks', 'remarks', { rows: 2 })}
          </div>
        </div>
      </section>

      <section>
        <SectionHead n={3} title="Issue &amp; Delivery" hint="Sent from the HR account" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {F('Letter Date', 'letter_date', { type: 'date' })}
          {F('Employee Email', 'email_address', { type: 'email', ph: 'rahul@apisindia.com' })}
          <div className="sm:col-span-2">
            {F('Cc (comma separated)', 'cc_emails', { ph: 'manager@apisindia.com, hod@apisindia.com' })}
            <p className="text-[11px] text-slate-500 mt-1">
              Sent from the HR account, To the employee, Cc these addresses. The employee is never Cc'd twice.
            </p>
          </div>
          {F('Issued By (optional)', 'issued_by', { ph: 'Defaults to Pankaj Tripathi' })}
          {F('Issued By Designation (optional)', 'issued_by_designation')}
        </div>
        <label className="flex items-center gap-2 mt-4 cursor-pointer">
          <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)}
            className="w-4 h-4 accent-red-600" />
          <span className="text-sm text-slate-700">
            Email the letter to the employee now
            <span className="text-slate-400"> (otherwise it is only generated &amp; stored)</span>
          </span>
        </label>
      </section>

      <button type="submit" disabled={busy}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
                   bg-gradient-to-br from-rose-500 to-red-600 text-white font-bold
                   shadow-lg shadow-rose-500/25 transition-all
                   hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-500/30
                   disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none">
        {busy ? <><Loader className="w-5 h-5 animate-spin" />Generating…</>
          : <><Send className="w-5 h-5" />{sendEmail ? 'Generate & Send Letter' : 'Generate Letter'}</>}
      </button>
    </form>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Bulk Excel upload                                                          */
/* ────────────────────────────────────────────────────────────────────────── */
function BulkUploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [sendEmails, setSendEmails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Populated only on a "missing required columns" 400 — lets the error panel
  // show exactly what WAS in the sheet, so a wrong-file upload (e.g. another
  // project's template) is obvious at a glance instead of a bare error string.
  const [columnError, setColumnError] = useState<{
    detected_columns?: string[]; required_columns?: string[]; missing_columns?: string[];
  } | null>(null);
  const [success, setSuccess] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showFailedOnly, setShowFailedOnly] = useState(false);

  const downloadTemplate = async () => {
    try {
      const res = await fetch(`${PMS_API}/warning-letter/template/`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'WarningLetter_Template.xlsx';
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { setError('Failed to download template'); }
  };

  const poll = async (batchId: string, attempt = 0) => {
    if (attempt > 1600) {
      setError('Generation is taking unusually long. Check Letters History later.');
      setLoading(false); return;
    }
    try {
      const r = await fetch(`${PMS_API}/warning-letter/batch/${batchId}/`);
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Status check failed'); setLoading(false); return; }
      setProgress(d);
      if (d.status === 'completed') {
        setResults(d.results || []); setSuccess(true); setLoading(false); setFile(null);
      } else if (d.status === 'error') {
        setError((d.errors && d.errors[0]) || 'Generation failed'); setLoading(false);
      } else {
        setTimeout(() => poll(batchId, attempt + 1), 1500);
      }
    } catch {
      setTimeout(() => poll(batchId, attempt + 1), 2500);
    }
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }
    setLoading(true); setError(''); setSuccess(false);
    setResults([]); setProgress(null); setWarnings([]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('send_emails', String(sendEmails));
      const res = await fetch(`${PMS_API}/warning-letter/upload/`, { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) {
        setColumnError(d.detected_columns ? d : null);
        throw new Error(d.error || 'Upload failed');
      }
      setColumnError(null);
      setWarnings(d.warnings || []);
      poll(d.batch_id);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Upload failed');
      setLoading(false);
    }
  };

  const shown = showFailedOnly ? results.filter(r => r.status === 'failed') : results;
  const failedCount = results.filter(r => r.status === 'failed').length;

  if (loading && progress) {
    const pct = progress.total ? Math.round((progress.processed / progress.total) * 100) : 0;
    return (
      <div className="py-6">
        <div className="text-center mb-6">
          <Loader className="w-12 h-12 text-red-500 mx-auto mb-3 animate-spin" />
          <h2 className="text-2xl font-bold text-slate-900">Generating warning letters…</h2>
          <p className="text-slate-500 text-sm mt-1">
            {progress.processed} of {progress.total} processed — please keep this page open.
          </p>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-red-500 to-rose-600 transition-all duration-500"
            style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
            <p className="text-2xl font-black text-blue-600">{progress.generated}</p>
            <p className="text-xs text-slate-500">Generated</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
            <p className="text-2xl font-black text-emerald-600">
              {progress.send_emails ? progress.emailed : '—'}</p>
            <p className="text-xs text-slate-500">Emailed</p>
          </div>
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
            <p className="text-2xl font-black text-rose-600">{progress.failed}</p>
            <p className="text-xs text-slate-500">Failed</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div>
        <div className="text-center mb-6">
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-slate-900">Done</h2>
          <p className="text-slate-500 text-sm">
            {results.length} letter(s) processed{failedCount > 0 && `, ${failedCount} failed`}
          </p>
        </div>
        {failedCount > 0 && (
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={showFailedOnly}
              onChange={e => setShowFailedOnly(e.target.checked)} className="w-4 h-4 accent-rose-600" />
            <span className="text-sm font-bold text-rose-700">Show only failed ({failedCount})</span>
          </label>
        )}
        <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 divide-y">
          {shown.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{r.name} <span className="text-slate-400">({r.employee_id})</span></p>
                <p className="text-xs text-slate-500 truncate">{r.warning_type} · {r.email || 'no email'}</p>
                {r.message && <p className="text-xs text-rose-600 mt-0.5">{r.message}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded-lg border text-xs font-bold ${badgeFor(r.status)}`}>
                  {labelFor(r.status)}
                </span>
                {r.pdf_url && (
                  <a href={`${_API_BASE}${r.pdf_url}`} target="_blank" rel="noreferrer"
                    className="text-xs font-bold text-blue-600 hover:underline">PDF</a>
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => { setSuccess(false); setResults([]); setProgress(null); setWarnings([]); }}
          className="w-full mt-4 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700">
          Upload Another File
        </button>
      </div>
    );
  }

  return (
    <div>
      {warnings.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-bold text-amber-900 mb-2">Check these before relying on this run</p>
              <ul className="space-y-1.5">
                {warnings.map((w, i) => (
                  <li key={i} className="text-sm text-amber-900 leading-relaxed">• {w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-rose-800">{error}</p>
          </div>
          {columnError && (
            <div className="mt-3 pl-6 space-y-2">
              {!!columnError.missing_columns?.length && (
                <p className="text-xs text-rose-700">
                  <span className="font-bold">Missing:</span> {columnError.missing_columns.join(', ')}
                </p>
              )}
              {!!columnError.detected_columns?.length && (
                <div>
                  <p className="text-xs font-bold text-rose-700 mb-1">
                    Columns found in your file ({columnError.detected_columns.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {columnError.detected_columns.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-rose-200
                                               text-rose-700 text-[11px] font-semibold">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 1 — template */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 mb-4">
        <div className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200 flex items-center
                        justify-center text-xs font-black text-slate-500 flex-shrink-0">1</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800">Download the template</p>
          <p className="text-[11px] text-slate-500">Includes a CC Emails column and a Warning Types reference sheet.</p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300
                     text-slate-700 text-sm font-bold hover:bg-slate-50 hover:border-slate-400
                     transition-all flex-shrink-0">
          <Download className="w-4 h-4" />Template
        </button>
      </div>

      {/* Step 2 — upload */}
      <form onSubmit={upload}>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 mb-4">
          <div className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200 flex items-center
                          justify-center text-xs font-black text-slate-500 flex-shrink-0">2</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800">Upload the filled sheet</p>
            <p className="text-[11px] text-slate-500">.xlsx or .xls</p>
          </div>
        </div>

        <label className={`block rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer
          transition-all mb-4 ${file
            ? 'border-rose-300 bg-rose-50/50'
            : 'border-slate-300 bg-slate-50/40 hover:border-rose-300 hover:bg-rose-50/30'}`}>
          <input type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { setFile(e.target.files?.[0] || null); setError(''); setColumnError(null); }} />
          <Upload className={`w-8 h-8 mx-auto mb-2 ${file ? 'text-rose-500' : 'text-slate-400'}`} />
          {file ? (
            <>
              <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {(file.size / 1024).toFixed(0)} KB · click to choose a different file
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-700">Click to choose your Excel file</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Employee ID and Name are the only required columns</p>
            </>
          )}
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer rounded-xl border border-slate-200
                          bg-white p-3.5 mb-4 hover:border-slate-300 transition-all">
          <input type="checkbox" checked={sendEmails} onChange={e => setSendEmails(e.target.checked)}
            className="w-4 h-4 accent-rose-600 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-slate-700 leading-snug">
            Email each letter to the employee
            <span className="block text-[11px] text-slate-400 mt-0.5">
              Cc is taken from the sheet's "CC Emails" column. Leave off to generate and store only.
            </span>
          </span>
        </label>

        <button type="submit" disabled={loading || !file}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
                     bg-gradient-to-br from-rose-500 to-red-600 text-white font-bold
                     shadow-lg shadow-rose-500/25 transition-all
                     hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-500/30
                     disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none">
          {loading ? <><Loader className="w-5 h-5 animate-spin" />Uploading…</>
            : <><Send className="w-5 h-5" />Generate Letters</>}
        </button>
      </form>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* History                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */
function WarningHistoryPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [err, setErr] = useState('');

  const params = useCallback(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set('search', search.trim());
    if (statusFilter) p.set('status', statusFilter);
    if (typeFilter) p.set('warning_type', typeFilter);
    return p;
  }, [search, statusFilter, typeFilter]);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const p = params(); p.set('limit', '200');
      const res = await fetch(`${PMS_API}/warning-letter/history/?${p.toString()}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to load history');
      setRows(d.results || []);
      setSummary(d.summary || { total: 0, sent: 0, failed: 0, pending: 0 });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const clearDb = async () => {
    if (!confirm(`This permanently deletes ALL ${summary.total} warning letter record(s) and their PDF files. Appraisal letters are NOT affected. This cannot be undone. Continue?`)) return;
    setClearing(true);
    try {
      const res = await fetch(`${PMS_API}/warning-letter/history/`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to clear');
      alert(d.message || 'Cleared.');
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to clear');
    } finally { setClearing(false); }
  };

  const downloadZip = async () => {
    setZipping(true); setErr('');
    try {
      const res = await fetch(`${PMS_API}/warning-letter/download-all/?${params().toString()}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to build ZIP');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'APIS_Warning_Letters.zip';
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to build ZIP');
    } finally { setZipping(false); }
  };

  const filtered = search || statusFilter || typeFilter;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { l: 'Total', v: summary.total, txt: 'text-slate-800', bar: 'from-slate-400 to-slate-600' },
          { l: 'Sent', v: summary.sent, txt: 'text-emerald-600', bar: 'from-emerald-400 to-emerald-600' },
          { l: 'Failed', v: summary.failed, txt: 'text-rose-600', bar: 'from-rose-400 to-red-600' },
          { l: 'Pending', v: summary.pending, txt: 'text-blue-600', bar: 'from-blue-400 to-indigo-600' },
        ].map(s => (
          <div key={s.l}
            className="relative overflow-hidden rounded-2xl bg-white border border-slate-200
                       p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${s.bar}`} />
            <p className={`text-3xl font-black tabular-nums ${s.txt}`}>{s.v}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
              {s.l}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, code, email, subject…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm
                       focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
          <option value="">All types</option>
          {WARNING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300
                     text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
        <button onClick={downloadZip} disabled={zipping || summary.total === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-white
                     text-sm font-bold hover:bg-slate-900 disabled:opacity-50">
          <Download className="w-4 h-4" />{zipping ? 'Building…' : filtered ? 'Download Filtered (ZIP)' : 'Download All (ZIP)'}
        </button>
        <button onClick={clearDb} disabled={clearing || summary.total === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-300
                     text-rose-700 text-sm font-bold hover:bg-rose-50 disabled:opacity-50">
          <Trash2 className="w-4 h-4" />Clear DB
        </button>
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 mb-4">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-rose-800">{err}</p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileWarning className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No warning letters yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {['Employee', 'Type', 'Subject', 'Email / Cc', 'Date', 'Status', ''].map(h => (
                  <th key={h} className="text-left font-bold px-3 py-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <p className="font-bold text-slate-800">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.employee_id}{r.department && ` · ${r.department}`}</p>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-700">{r.warning_type_label}</td>
                  <td className="px-3 py-2 text-slate-600 max-w-[180px] truncate">{r.subject || '—'}</td>
                  <td className="px-3 py-2">
                    <p className="text-slate-600 text-xs">{r.email || '—'}</p>
                    {r.cc?.length > 0 && <p className="text-[11px] text-slate-400">Cc: {r.cc.join(', ')}</p>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">{r.letter_date || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-lg border text-xs font-bold ${badgeFor(r.status)}`}>
                      {labelFor(r.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {r.pdf_url && (
                      <a href={`${_API_BASE}${r.pdf_url}`} target="_blank" rel="noreferrer"
                        className="text-xs font-bold text-blue-600 hover:underline whitespace-nowrap">
                        View PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'single' as const, icon: UserPlus, label: 'Single Letter', sub: 'One employee' },
  { id: 'bulk' as const, icon: Upload, label: 'Bulk Upload', sub: 'From Excel' },
  { id: 'history' as const, icon: History, label: 'History', sub: 'Search & export' },
];

export function WarningLetterPage() {
  const [tab, setTab] = useState<'single' | 'bulk' | 'history'>('single');

  return (
    <div className="min-h-screen bg-[#f5f7fa] pb-16">
      {/* Hero band — light, with a soft rose wash tying it to the letter type */}
      <div className="relative overflow-hidden bg-white border-b border-slate-200">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-16 w-96 h-96 rounded-full bg-rose-400/15 blur-[100px]" />
          <div className="absolute -top-20 right-0 w-96 h-96 rounded-full bg-orange-300/15 blur-[100px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-8 pt-8 pb-20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 ring-1 ring-rose-100
                            flex items-center justify-center flex-shrink-0">
              <FileWarning className="w-6 h-6 text-rose-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Warning Letters</h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase
                                 tracking-widest bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                  Confidential
                </span>
              </div>
              <p className="text-slate-500 text-sm max-w-xl leading-relaxed">
                Issue a formal disciplinary letter to one employee, or generate them in bulk from
                Excel. Every letter is archived and can be exported.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs float over the hero's lower edge */}
      <div className={`relative z-10 -mt-12 px-8 mx-auto ${tab === 'history' ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5
                        border border-slate-200 shadow-lg shadow-slate-900/5 w-fit mb-6">
          {TABS.map(t => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all
                  ${on ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25'
                       : 'text-slate-500 hover:bg-slate-100'}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="text-left leading-none">
                  <p className="text-sm font-bold">{t.label}</p>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mt-1
                    ${on ? 'text-white/70' : 'text-slate-400'}`}>{t.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 p-8 border border-slate-200">
          {tab === 'single' && <SingleLetterPanel />}
          {tab === 'bulk' && <BulkUploadPanel />}
          {tab === 'history' && <WarningHistoryPanel />}
        </div>
      </div>
    </div>
  );
}

export default WarningLetterPage;

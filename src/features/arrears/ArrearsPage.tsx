/* Arrears Compensation Structure — download a template, fill it, upload it,
   and the system produces one statement per person and optionally mails it.

   Same shape as the Letters Generator next door on purpose: an admin who has
   run one of these should not have to learn the other. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download, Upload, FileSpreadsheet, Mail, Loader2, CheckCircle2, AlertCircle,
  X, Search, Trash2, RefreshCw, Archive, IndianRupee,
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/pms/arrears`;

const money = (n: number | undefined) =>
  n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

type Letter = {
  id: number; employee_code: string; employee_name: string; email_address: string;
  department: string; designation: string; cadre: string; grade: string; period: string;
  totals: Record<string, number>; status: string; email_sent: boolean;
  error_message: string; batch_id: string; created_at: string;
};

type Batch = {
  status: string; total: number; processed: number; generated: number;
  emailed: number; failed: number; send_emails: boolean; errors: string[];
};

const STATUS_PILL: Record<string, string> = {
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  generated: 'bg-blue-50 text-blue-700 border-blue-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  pending: 'bg-slate-50 text-slate-500 border-slate-200',
};

export function ArrearsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sendEmails, setSendEmails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [batchId, setBatchId] = useState('');
  const [batch, setBatch] = useState<Batch | null>(null);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [q, setQ] = useState('');
  const [clearing, setClearing] = useState(false);
  const [confirmCount, setConfirmCount] = useState('');
  const poll = useRef<number | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch(`${API}/history/`);
      const d = await r.json();
      setLetters(d.letters || []);
    } catch { /* the table just stays as it was */ }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  /* Polls while a run is in flight. Cleared on unmount as well as on finish —
     a timer left running after the page closes keeps hitting the server. */
  useEffect(() => {
    if (!batchId) return;
    const tick = async () => {
      try {
        const r = await fetch(`${API}/batch/${batchId}/`);
        const d: Batch = await r.json();
        setBatch(d);
        if (d.status !== 'running') {
          if (poll.current) window.clearInterval(poll.current);
          poll.current = null;
          setBusy(false);
          loadHistory();
        }
      } catch { /* keep polling; a dropped request is not a failed batch */ }
    };
    tick();
    poll.current = window.setInterval(tick, 1200);
    return () => { if (poll.current) window.clearInterval(poll.current); };
  }, [batchId, loadHistory]);

  const upload = async () => {
    if (!file) return;
    setBusy(true); setError(''); setProblems([]); setBatch(null);
    const body = new FormData();
    body.append('file', file);
    body.append('send_emails', String(sendEmails));
    try {
      const r = await fetch(`${API}/upload/`, { method: 'POST', body });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || 'That upload did not work.');
        setProblems(d.problems || []);
        setBusy(false);
        return;
      }
      setProblems(d.problems || []);
      setBatchId(d.batch_id);
    } catch {
      setError('Could not reach the server.');
      setBusy(false);
    }
  };

  const clearAll = async () => {
    try {
      const r = await fetch(`${API}/history/`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_count: confirmCount }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Could not clear those.'); return; }
      setClearing(false); setConfirmCount(''); setBatch(null); setBatchId('');
      loadHistory();
    } catch { setError('Could not reach the server.'); }
  };

  const shown = letters.filter(l => {
    if (!q.trim()) return true;
    const n = q.trim().toLowerCase();
    return [l.employee_name, l.employee_code, l.department, l.email_address]
      .some(v => (v || '').toLowerCase().includes(n));
  });

  const pct = batch && batch.total ? Math.round((batch.processed / batch.total) * 100) : 0;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

      {/* ── Step 1: the template ─────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Step 1</p>
            <h2 className="text-base font-black text-slate-800 mt-0.5">Get the template</h2>
            <p className="text-[13px] text-slate-500 mt-1 max-w-xl">
              One row per employee. The blue columns are required; the green ones are the
              arrears amounts. The example row is skipped on upload, so you can leave it.
            </p>
          </div>
          <a href={`${API}/template/`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800
                       text-white text-[13px] font-bold shadow-sm transition-colors shrink-0">
            <Download className="w-4 h-4" />Download template
          </a>
        </div>
      </div>

      {/* ── Step 2: upload ───────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Step 2</p>
        <h2 className="text-base font-black text-slate-800 mt-0.5 mb-3">Upload the filled sheet</h2>

        <label className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 cursor-pointer
          transition-colors ${file ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 hover:border-amber-300'}`}>
          <input type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { setFile(e.target.files?.[0] || null); setError(''); }} />
          <FileSpreadsheet className={`w-5 h-5 shrink-0 ${file ? 'text-amber-600' : 'text-slate-400'}`} />
          <span className="text-[13px] font-bold text-slate-700 truncate">
            {file ? file.name : 'Choose a .xlsx file'}
          </span>
          {file && (
            <button onClick={e => { e.preventDefault(); setFile(null); }}
              title="Remove file"
              className="ml-auto p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50">
              <X className="w-4 h-4" />
            </button>
          )}
        </label>

        <label className="flex items-start gap-2.5 mt-3.5 cursor-pointer">
          <input type="checkbox" checked={sendEmails} className="mt-0.5"
            onChange={e => setSendEmails(e.target.checked)} />
          <span className="text-[13px] text-slate-600">
            <b className="text-slate-800">Email each statement to the employee</b>
            <span className="block text-[11.5px] text-slate-400">
              Off means generate only — you can download them and send them yourself.
              Rows without an email address are reported rather than silently skipped.
            </span>
          </span>
        </label>

        {sendEmails && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-amber-800">
              These go straight to employees and carry salary figures. Generate without
              emailing first and check a couple of the PDFs.
            </p>
          </div>
        )}

        <button onClick={upload} disabled={!file || busy}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600
                     text-white text-[13px] font-black shadow-sm disabled:opacity-40 transition-colors">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {busy ? 'Working…' : sendEmails ? 'Generate and send' : 'Generate statements'}
        </button>

        {error && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[12.5px] font-semibold text-rose-800">{error}</p>
          </div>
        )}

        {problems.length > 0 && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-[12.5px] font-black text-amber-800 mb-1">
              {problems.length} row{problems.length === 1 ? '' : 's'} skipped
            </p>
            <ul className="space-y-0.5">
              {problems.map((p, i) => (
                <li key={i} className="text-[12px] text-amber-700">• {p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── progress ─────────────────────────────────────────────────────── */}
      {batch && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
            <p className="text-[13px] font-black text-slate-700 flex items-center gap-2">
              {batch.status === 'running'
                ? <><Loader2 className="w-4 h-4 animate-spin text-amber-500" />Generating…</>
                : <><CheckCircle2 className="w-4 h-4 text-emerald-500" />Finished</>}
            </p>
            <p className="text-[12px] font-bold text-slate-500 tabular-nums">
              {batch.processed} of {batch.total}
            </p>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-4 mt-3 text-[12px] font-bold flex-wrap">
            <span className="text-blue-600">{batch.generated} generated</span>
            {batch.send_emails && <span className="text-emerald-600">{batch.emailed} emailed</span>}
            {batch.failed > 0 && <span className="text-rose-600">{batch.failed} failed</span>}
          </div>
          {batch.errors?.length > 0 && (
            <ul className="mt-2.5 space-y-0.5">
              {batch.errors.map((e, i) => (
                <li key={i} className="text-[12px] text-rose-600">• {e}</li>
              ))}
            </ul>
          )}
          {batch.status !== 'running' && batch.generated > 0 && (
            <a href={`${API}/download-all/?batch_id=${batchId}`}
              className="inline-flex items-center gap-2 mt-3.5 px-4 py-2 rounded-xl bg-slate-900
                         hover:bg-slate-800 text-white text-[12.5px] font-bold transition-colors">
              <Archive className="w-4 h-4" />Download all {batch.generated} as a zip
            </a>
          )}
        </div>
      )}

      {/* ── what has been generated ──────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-wrap">
          <h2 className="text-base font-black text-slate-800">Generated statements</h2>
          <span className="text-[12px] font-bold text-slate-400">{shown.length} of {letters.length}</span>
          <div className="relative ml-auto">
            <Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search name, code, department…"
              className="w-64 border-2 border-slate-200 focus:border-amber-400 rounded-xl
                         pl-9 pr-3 py-2 text-[13px] outline-none" />
          </div>
          <button onClick={loadHistory} title="Refresh"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <RefreshCw className="w-4 h-4" />
          </button>
          {letters.length > 0 && (
            <button onClick={() => { setClearing(true); setConfirmCount(''); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold
                         text-rose-600 hover:bg-rose-50 transition-colors">
              <Trash2 className="w-4 h-4" />Clear
            </button>
          )}
        </div>

        {clearing && (
          <div className="px-5 py-4 bg-rose-50 border-b border-rose-100">
            <p className="text-[13px] font-bold text-rose-800 mb-2">
              This deletes all {letters.length} statement{letters.length === 1 ? '' : 's'} and
              their PDFs. Type <b>{letters.length}</b> to confirm.
            </p>
            <div className="flex gap-2 flex-wrap">
              <input value={confirmCount} onChange={e => setConfirmCount(e.target.value)}
                placeholder={String(letters.length)}
                className="w-28 border-2 border-rose-200 focus:border-rose-400 rounded-lg px-3 py-2
                           text-[13px] outline-none" />
              <button onClick={clearAll}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white
                           text-[12.5px] font-bold transition-colors">Delete them</button>
              <button onClick={() => setClearing(false)}
                className="px-4 py-2 rounded-lg text-[12.5px] font-bold text-slate-500
                           hover:bg-slate-100 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[860px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Employee', 'Department', 'Grade', 'Period', 'Gross', 'Deductions',
                  'In hand', 'Status', ''].map(h => (
                  <th key={h} className="text-left font-black text-slate-400 uppercase
                                         tracking-widest text-[10px] px-4 py-2.5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map(l => (
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5">
                    <p className="font-bold text-slate-800">{l.employee_name}</p>
                    <p className="text-[11px] text-slate-400">{l.employee_code}</p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{l.department || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{l.grade || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{l.period || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-700 tabular-nums">{money(l.totals?.gross)}</td>
                  <td className="px-4 py-2.5 text-slate-700 tabular-nums">{money(l.totals?.deductions)}</td>
                  <td className="px-4 py-2.5 font-black text-slate-900 tabular-nums">
                    {money(l.totals?.in_hand)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10.5px]
                                      font-black ${STATUS_PILL[l.status] || STATUS_PILL.pending}`}>
                      {l.status === 'sent' ? 'Emailed' : l.status}
                    </span>
                    {l.error_message && (
                      <p className="text-[11px] text-rose-500 mt-0.5 max-w-[220px]">{l.error_message}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <a href={`${API}/${l.id}/pdf/`}
                      className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-bold">
                      <Download className="w-3.5 h-3.5" />PDF
                    </a>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    <IndianRupee className="w-6 h-6 mx-auto mb-2 text-slate-200" />
                    {letters.length === 0
                      ? 'Nothing generated yet. Upload a filled template above.'
                      : 'Nobody matches that search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

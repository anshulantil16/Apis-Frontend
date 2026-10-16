/* CTC Calculator — linked from the sidebar's Resources section, under APIS
   Wall.

   Download the Excel template, fill in one row per candidate (name,
   category, department, designation, grade, cadre, work location, CTC) and
   upload it back here. Each upload is listed with its rows; clicking a row
   opens that candidate's compensation break-up (BreakdownModal), and the PDF
   button on the row downloads the same break-up as Annexure A. The numbers
   are worked out by the `ctc` Django app (ctc/calculator.py) — see api.ts. */
import { useEffect, useRef, useState } from 'react';
import {
  ChevronRight, Calculator, Download, UploadCloud, Loader2, FileSpreadsheet,
  Trash2, AlertTriangle, CheckCircle2, Users, RotateCcw, FileDown, Info,
} from 'lucide-react';
import {
  CtcUploadError, deleteCtcUpload, downloadCtcPdf, downloadCtcTemplate, listCtcUploads, resetCtcData,
  uploadCtcSheet, type CtcCandidate, type CtcUpload,
} from './api';
import { BreakdownModal } from './BreakdownModal';
import { SettingsPanel } from './SettingsPanel';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const fmtCtc = (v: string | null) => (v == null ? '—' : inr.format(Number(v)));
const fmtDate = (iso: string | null) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—');
const fmtWhen = (iso: string | null) => (iso
  ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '');

const COLUMNS: { label: string; render: (c: CtcUpload['candidates'][number]) => string; align?: 'right' }[] = [
  { label: 'Employee Code',  render: c => c.employeeCode || '—' },
  { label: 'Candidate Name', render: c => c.candidateName },
  { label: 'Category',       render: c => c.category || '—' },
  { label: 'Department',     render: c => c.department || '—' },
  { label: 'Designation',    render: c => c.designation || '—' },
  { label: 'Grade',          render: c => c.grade || '—' },
  { label: 'Cadre',          render: c => c.cadre || '—' },
  { label: 'Children',       render: c => String(c.numberOfChildren ?? 0) },
  { label: 'Date of Joining', render: c => fmtDate(c.dateOfJoining) },
  { label: 'Work Location',  render: c => c.workLocation || '—' },
  { label: 'CTC (Annual)',   render: c => fmtCtc(c.ctc), align: 'right' },
  { label: 'Tax Regime',     render: c => c.taxRegime || '—' },
];

export function CtcCalculatorPage({ isSuperadmin = false }: { isSuperadmin?: boolean } = {}) {
  const [uploads, setUploads] = useState<CtcUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'template' | 'upload' | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string; problems?: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /* The candidate whose break-up is open, and whose PDF is downloading. */
  const [selected, setSelected] = useState<CtcCandidate | null>(null);
  const [pdfFor, setPdfFor] = useState<number | null>(null);

  const onPdf = async (c: CtcCandidate) => {
    setPdfFor(c.id);
    const problem = await downloadCtcPdf(c.id, c.candidateName);
    setPdfFor(null);
    if (problem) setNotice({ tone: 'error', text: `${c.candidateName}: ${problem}` });
  };

  const refresh = async () => {
    try {
      setUploads(await listCtcUploads());
    } catch (e) {
      setNotice({ tone: 'error', text: (e as Error).message });
    }
  };
  useEffect(() => {
    let alive = true;
    listCtcUploads()
      .then(rows => { if (alive) setUploads(rows); })
      .catch((e: Error) => { if (alive) setNotice({ tone: 'error', text: e.message }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const onTemplate = async () => {
    setBusy('template');
    const problem = await downloadCtcTemplate();
    setBusy(null);
    if (problem) setNotice({ tone: 'error', text: problem });
  };

  const onFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';   // same file can be picked again after a fix
    if (!file) return;
    setBusy('upload'); setNotice(null);
    try {
      const done = await uploadCtcSheet(file);
      setNotice({ tone: 'ok', text: done.message });
      await refresh();
    } catch (e) {
      const err = e as CtcUploadError;
      setNotice({ tone: 'error', text: err.message, problems: err.problems });
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (u: CtcUpload) => {
    if (!window.confirm(`Remove "${u.fileName || 'this upload'}" and its ${u.rowCount} candidate(s)?`)) return;
    try {
      setNotice({ tone: 'ok', text: await deleteCtcUpload(u.id) });
      await refresh();
    } catch (e) {
      setNotice({ tone: 'error', text: (e as Error).message });
    }
  };

  const totalCandidates = uploads.reduce((n, u) => n + u.rowCount, 0);

  /* Danger zone — erase the current candidates to start a fresh set. */
  const [resetTyped, setResetTyped] = useState('');
  const [resetting, setResetting] = useState(false);
  const onReset = async () => {
    if (resetTyped !== 'RESET') return;
    const whose = isSuperadmin ? 'ALL candidates uploaded by everyone' : 'all the candidates you uploaded';
    if (!window.confirm(`This permanently deletes ${whose} (${totalCandidates} candidate`
                        + `${totalCandidates === 1 ? '' : 's'} in ${uploads.length} upload`
                        + `${uploads.length === 1 ? '' : 's'}). This cannot be undone. Continue?`)) return;
    setResetting(true); setNotice(null);
    try {
      setNotice({ tone: 'ok', text: await resetCtcData() });
      setResetTyped('');
      await refresh();
    } catch (e) {
      setNotice({ tone: 'error', text: (e as Error).message });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-full bg-[#fdfbf6] relative overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ih-drift absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-amber-300/20 blur-[130px]" />
        <div className="ih-aurora absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-orange-300/15 blur-[130px]" />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-6 py-5 space-y-6">
        {/* breadcrumb */}
        <div className="ih-fade flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
          <span>Apps</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-amber-600">CTC Calculator</span>
        </div>

        {/* hero header — same amber panel as APIS Wall / Policies */}
        <div className="ih-reveal ih-sweep relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-amber-50/60
                        border border-amber-100 shadow-sm p-6 md:p-8">
          <div className="ih-drift pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-300/25 blur-[100px]" />
          <div className="ih-aurora pointer-events-none absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-orange-200/25 blur-[100px]" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="ih-float w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
                <Calculator className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">CTC Calculator</h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white ring-1 ring-amber-200 text-[10px] font-black text-amber-600">
                    <Users className="w-3 h-3" />{totalCandidates} candidate{totalCandidates === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">Download the template, add one row per candidate, then upload it back here.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={onTemplate} disabled={busy !== null}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-amber-700 ring-1 ring-amber-300
                           hover:bg-amber-50 text-[12.5px] font-black transition-all disabled:opacity-60">
                {busy === 'template' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download template
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== null}
                className="ih-sheen inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600
                           hover:from-amber-600 hover:to-orange-700 text-white text-[12.5px] font-black shadow-md shadow-amber-200
                           transition-all disabled:opacity-60">
                {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {busy === 'upload' ? 'Uploading…' : 'Upload filled template'}
              </button>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden"
                onChange={e => onFile(e.target.files?.[0])} />
            </div>
          </div>
        </div>

        {/* result of the last action */}
        {notice && (
          <div role="status"
            className={`rounded-2xl px-4 py-3 text-[13px] font-bold ring-1 ${notice.tone === 'ok'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
            <p className="flex items-center gap-2">
              {notice.tone === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              {notice.text}
            </p>
            {notice.problems && notice.problems.length > 0 && (
              <ul className="mt-2 ml-6 list-disc space-y-0.5 text-[12px] font-semibold">
                {notice.problems.map(p => <li key={p}>{p}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* uploads */}
        {loading ? (
          <div className="rounded-3xl bg-white border border-slate-200 py-14 flex items-center justify-center gap-2 text-slate-400 text-sm font-bold">
            <Loader2 className="w-5 h-5 animate-spin" />Loading…
          </div>
        ) : uploads.length === 0 ? (
          <div className="ih-reveal rounded-3xl bg-white border border-slate-200 shadow-sm px-6 py-14 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 ring-4 ring-amber-100 flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-900">No candidates uploaded yet</h2>
            <p className="mt-1.5 max-w-md text-[13px] text-slate-500 leading-relaxed">
              Download the template, fill in Employee Code, Candidate Name, Category, Department,
              Designation, Grade, Cadre, Number of Children, Date of Joining, Work Location, CTC and Tax Regime for
              each candidate, pick Yes / No for the Gross Earnings items (cadres D, C and M only),
              then upload it. Click a candidate to see
              their salary break-up.
            </p>
          </div>
        ) : (
          uploads.map(u => (
            <section key={u.id} className="ih-reveal rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-amber-50/40">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4.5 h-4.5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-slate-800 truncate">{u.fileName || 'Upload'}</p>
                    <p className="text-[11px] text-slate-400 font-semibold">
                      {u.rowCount} candidate{u.rowCount === 1 ? '' : 's'} · {u.uploadedBy} · {fmtWhen(u.uploadedAt)}
                    </p>
                  </div>
                </div>
                {u.canDelete && (
                  <button type="button" onClick={() => onDelete(u)} title="Remove this upload"
                    className="w-8 h-8 shrink-0 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/80">
                      <th className="text-left px-4 py-2.5">Sr.No</th>
                      {COLUMNS.map(c => (
                        <th key={c.label} className={`px-4 py-2.5 whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
                      ))}
                      <th className="text-center px-4 py-2.5">Break-up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {u.candidates.map((c, i) => (
                      <tr key={c.id} onClick={() => setSelected(c)} title="View salary break-up"
                        className="cursor-pointer hover:bg-amber-50/60 transition-colors">
                        <td className="px-4 py-2.5 text-slate-400 font-bold">{String(i + 1).padStart(2, '0')}</td>
                        {COLUMNS.map(col => (
                          <td key={col.label}
                            className={`px-4 py-2.5 whitespace-nowrap ${col.align === 'right' ? 'text-right font-mono font-bold text-slate-800' : ''}
                                        ${col.label === 'Candidate Name' ? 'font-black text-slate-900' : 'text-slate-600 font-semibold'}`}>
                            {col.render(c)}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-center whitespace-nowrap">
                          <button type="button" title={`Download ${c.candidateName}'s break-up as PDF`}
                            onClick={e => { e.stopPropagation(); onPdf(c); }} disabled={pdfFor === c.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 ring-1 ring-amber-200
                                       text-amber-700 text-[11px] font-black hover:bg-amber-100 transition-all disabled:opacity-60">
                            {pdfFor === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}

        <SettingsPanel onSaved={text => setNotice({ tone: 'ok', text })} />

        {/* Danger Zone — same look as Help Desk / TA-DA: set apart in red so
            it can't be mistaken for a normal action, and only armed once
            RESET is typed. */}
        {uploads.length > 0 && (
          <div className="rounded-2xl bg-rose-50/60 border-2 border-rose-200 p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <h3 className="text-sm font-black text-rose-700 tracking-tight">Danger Zone</h3>
            </div>
            <p className="text-[12px] text-rose-600/80 mb-4 ml-[42px]">
              {isSuperadmin
                ? 'Permanently deletes every candidate uploaded by anyone, so a fresh set can be uploaded. Cannot be undone.'
                : "Permanently deletes all the candidates you have uploaded, so a fresh set can be uploaded. Other people's uploads are not touched. Cannot be undone."}
            </p>
            <div className="flex flex-wrap items-center gap-2 ml-[42px]">
              <input value={resetTyped} onChange={e => setResetTyped(e.target.value)}
                placeholder='Type "RESET" to enable'
                className="px-3 py-2 rounded-lg bg-white border border-rose-200 text-slate-800 text-sm
                           focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-400/10" />
              <button type="button" onClick={onReset} disabled={resetTyped !== 'RESET' || resetting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 text-white
                           text-[12px] font-black hover:bg-rose-700 hover:-translate-y-0.5 transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0">
                {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                {resetting ? 'Resetting…' : 'Reset candidate data'}
              </button>
            </div>
          </div>
        )}

        <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-slate-400 font-semibold pb-2 text-center">
          <Info className="w-3.5 h-3.5 shrink-0" />
          Break-ups follow APIS's Salary Fixation Model 2026 (P &amp; C). Click any candidate to see theirs.
        </p>
      </div>

      {selected && <BreakdownModal key={selected.id} candidate={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default CtcCalculatorPage;

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, Loader2, Award, FileText, Upload } from 'lucide-react';
import { EOM_API } from '../../../Pages/EOMPage';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SmartFields {
  specific: string; measurable: string; achievable: string;
  relevant: string; timebound: string;
}
interface EvidenceRow { desc: string; source: string; }

// ─── Helpers ───────────────────────────────────────────────────────────────────

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const STEPS = ['Your Details', 'Part A', 'Part B — SMART', 'Part C & Submit'];

const SMART_META = [
  { key: 'specific',   letter: 'S', label: 'Specific',   question: 'What exactly did you do? In which area or process?' },
  { key: 'measurable', letter: 'M', label: 'Measurable',  question: 'What are the before and after numbers? What is the unit of measurement? Share pictures, system or process enhancements.' },
  { key: 'achievable', letter: 'A', label: 'Achievable',  question: 'Why was this above your normal job scope? What extra initiative did you take?' },
  { key: 'relevant',   letter: 'R', label: 'Relevant',    question: 'How does this connect to APIS goals (growth, quality, cost, customer, safety)?' },
  { key: 'timebound',  letter: 'T', label: 'Time-Bound',  question: 'When exactly was this completed? Confirm it was within the nomination month.' },
] as const;

const TRACK_OPTIONS = [
  { value: 'sales',     label: 'Sales',     color: 'emerald' },
  { value: 'non_sales', label: 'HO',        color: 'teal'    },
  { value: 'plant',     label: 'Plant',     color: 'cyan'    },
];

const MONTH_NAMES = ['','January','February','March','April','May','June',
  'July','August','September','October','November','December'];

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((label, i) => {
          const idx = i + 1;
          const done    = step > idx;
          const current = step === idx;
          return (
            <div key={idx} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all
                ${done    ? 'bg-emerald-500 text-white' :
                  current ? 'bg-emerald-100 border-2 border-emerald-500 text-emerald-700' :
                             'bg-slate-100 border border-slate-200 text-slate-400'}`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : idx}
              </div>
              <span className={`text-[11px] font-semibold hidden sm:block whitespace-nowrap
                ${done ? 'text-emerald-600' : current ? 'text-slate-800' : 'text-slate-400'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{children}</p>;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 flex items-center text-sm text-slate-700 font-medium">
        {value || <span className="text-slate-400 italic">—</span>}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props { employee: any; }

export function EOMEmployeeView({ employee }: Props) {
  const [cycles,         setCycles]         = useState<any[]>([]);
  const [selectedCycle,  setSelectedCycle]  = useState<any>(null);
  const [nomination,     setNomination]     = useState<any>(null);
  const [loadingCycles,  setLoadingCycles]  = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [msg,            setMsg]            = useState<{ text: string; ok: boolean } | null>(null);
  const [step,           setStep]           = useState(1);

  // Push browser history state when form step advances so back button works
  useEffect(() => {
    if (step > 1) history.pushState({ eom: 'form', step }, '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const s = e.state as any;
      if (s?.eom === 'form' && s.step > 1) {
        setStep(s.step - 1);
        // stop the bubble — EOMPage's popstate handler would also fire but we
        // push a 'hub' state when the employee logs in, so popping back
        // from step 1 will hit the 'hub' state and stay logged-in.
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Form state
  const [track, setTrack]                     = useState('');
  const [partA, setPartA]                     = useState('');
  const [smart, setSmart]                     = useState<SmartFields>({ specific: '', measurable: '', achievable: '', relevant: '', timebound: '' });
  const [evidence, setEvidence]               = useState<EvidenceRow[]>([{ desc: '', source: '' }, { desc: '', source: '' }]);
  const [declarationAgreed, setDeclarationAgreed] = useState(false);
  const [signatureName, setSignatureName]     = useState('');
  const [docFile,        setDocFile]          = useState<File | null>(null);
  const [docUploading,   setDocUploading]     = useState(false);

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  // ── Load active cycles ──
  useEffect(() => {
    fetch(`${EOM_API}/cycles/active/`)
      .then(r => r.json())
      .then(data => {
        setCycles(data);
        if (data.length === 1) setSelectedCycle(data[0]);
      })
      .catch(() => showMsg('Failed to load cycles.', false))
      .finally(() => setLoadingCycles(false));
  }, []);

  // ── Load existing nomination when cycle selected ──
  useEffect(() => {
    if (!selectedCycle) return;
    fetch(`${EOM_API}/nominations/${employee.employee_id}/${selectedCycle.id}/`)
      .then(async r => {
        if (r.status === 404) return null;
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setNomination(data);
        setTrack(data.track || '');
        setPartA(data.part_a_achievement || '');
        setSmart({
          specific:   data.smart_specific   || '',
          measurable: data.smart_measurable || '',
          achievable: data.smart_achievable || '',
          relevant:   data.smart_relevant   || '',
          timebound:  data.smart_timebound  || '',
        });
        setEvidence([
          { desc: data.evidence_1_description || '', source: data.evidence_1_source || '' },
          { desc: data.evidence_2_description || '', source: data.evidence_2_source || '' },
        ]);
        setDeclarationAgreed(data.declaration_agreed || false);
        setSignatureName(data.signature_name || '');
      })
      .catch(() => {});
  }, [selectedCycle, employee.employee_id]);

  const buildPayload = useCallback(() => ({
    track,
    part_a_achievement:     partA,
    smart_specific:         smart.specific,
    smart_measurable:       smart.measurable,
    smart_achievable:       smart.achievable,
    smart_relevant:         smart.relevant,
    smart_timebound:        smart.timebound,
    evidence_1_description: evidence[0].desc,
    evidence_1_source:      evidence[0].source,
    evidence_2_description: evidence[1].desc,
    evidence_2_source:      evidence[1].source,
    declaration_agreed:     declarationAgreed,
    signature_name:         signatureName,
  }), [track, partA, smart, evidence, declarationAgreed, signatureName]);

  const saveDraft = useCallback(async () => {
    if (!selectedCycle) return null;
    setSaving(true);
    try {
      const res  = await fetch(`${EOM_API}/nominations/${employee.employee_id}/${selectedCycle.id}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed.');
      setNomination(data);
      return data;
    } catch (e: any) {
      showMsg(e.message, false);
      return null;
    } finally {
      setSaving(false);
    }
  }, [selectedCycle, employee.employee_id, buildPayload]);

  const handleNext = async () => {
    if (step === 1 && !track) { showMsg('Please select your track to continue.', false); return; }
    if (step === 2) {
      const wc = wordCount(partA);
      if (wc < 150) { showMsg(`Part A needs at least 150 words (currently ${wc}).`, false); return; }
    }
    if (step === 3) {
      const empty = SMART_META.find(m => !smart[m.key].trim());
      if (empty) { showMsg(`Please fill in the ${empty.label} field.`, false); return; }
    }
    const saved = await saveDraft();
    if (saved) setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!declarationAgreed) { showMsg('Please agree to the declaration before submitting.', false); return; }
    if (!signatureName.trim()) { showMsg('Please enter your name as digital signature.', false); return; }

    const saved = await saveDraft();
    if (!saved) return;

    setSubmitting(true);
    try {
      const res  = await fetch(`${EOM_API}/nominations/${saved.id}/submit/`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');
      setNomination(data);
      showMsg('Nomination submitted successfully!', true);
    } catch (e: any) {
      showMsg(e.message, false);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submitted state ──
  if (nomination?.status && nomination.status !== 'draft' && nomination.status !== 'manager_rejected') {
    const statusLabel: Record<string, string> = {
      submitted:        'Submitted — Awaiting Manager Review',
      manager_approved: 'Manager Approved — Awaiting HOD Review',
      hod_approved:     'HOD Approved — Awaiting HR Decision',
      hr_finalized:     nomination.is_winner ? 'Congratulations! You are the Employee of the Month!' : 'HR Finalised',
    };
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-10 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5
            ${nomination.is_winner ? 'bg-yellow-100' : 'bg-emerald-100'}`}>
            <Award className={`w-8 h-8 ${nomination.is_winner ? 'text-yellow-500' : 'text-emerald-600'}`} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            {statusLabel[nomination.status] || nomination.status}
          </h2>
          {nomination.submitted_at && (
            <p className="text-xs text-slate-400 mt-1">
              Submitted on {new Date(nomination.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          {nomination.manager_remarks && (
            <div className="mt-6 text-left bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Manager Remarks</p>
              <p className="text-sm text-slate-700">{nomination.manager_remarks}</p>
            </div>
          )}
          {nomination.hod_remarks && (
            <div className="mt-3 text-left bg-violet-50 border border-violet-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-1">HOD Remarks</p>
              <p className="text-sm text-slate-700">{nomination.hod_remarks}</p>
            </div>
          )}
          {nomination.hr_remarks && (
            <div className="mt-3 text-left bg-rose-50 border border-rose-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">HR Remarks</p>
              <p className="text-sm text-slate-700">{nomination.hr_remarks}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── No active cycle ──
  if (!loadingCycles && cycles.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Award className="w-7 h-7 text-slate-400" />
        </div>
        <h2 className="text-base font-bold text-slate-700 mb-1">No Active Nomination Cycle</h2>
        <p className="text-sm text-slate-400">HR will open a cycle soon. Check back later.</p>
      </div>
    );
  }

  // ── Cycle picker (multiple open cycles) ──
  if (!selectedCycle) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <h2 className="text-base font-bold text-slate-800 mb-4">Select Nomination Cycle</h2>
        <div className="space-y-3">
          {cycles.map(c => (
            <button key={c.id} onClick={() => setSelectedCycle(c)}
              className="w-full text-left px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all">
              <p className="font-semibold text-emerald-800 text-sm">{c.name}</p>
              <p className="text-xs text-emerald-600 mt-0.5">{MONTH_NAMES[c.month]} {c.year}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const isReadonly = nomination?.status && !['draft', 'manager_rejected'].includes(nomination.status);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24">

      {/* Toast */}
      {msg && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold
          ${msg.ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Header band */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
          <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Form Ref: HR-EOM-NF-01</p>
          <h1 className="text-white font-black text-lg mt-0.5">Self-Nomination Form — Employee of the Month</h1>
          <p className="text-emerald-200 text-xs mt-1">Cycle: {selectedCycle.name}</p>
        </div>

        <div className="p-6">
          <ProgressBar step={step} />

          {/* ── Step 1: Employee details ────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">Employee Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyField label="Employee Name"   value={employee.name} />
                <ReadOnlyField label="Employee Code"   value={employee.employee_id} />
                <ReadOnlyField label="Designation"     value={employee.designation} />
                <ReadOnlyField label="Department"      value={employee.department} />
                <ReadOnlyField label="Location / Zone" value={employee.zone} />
                <ReadOnlyField label="Nomination Month" value={`${MONTH_NAMES[selectedCycle.month]} ${selectedCycle.year}`} />
                <ReadOnlyField label="Date of Submission" value={today} />
                <div>
                  <FieldLabel>Track <span className="text-rose-500">*</span></FieldLabel>
                  <div className="flex gap-2">
                    {TRACK_OPTIONS.map(t => (
                      <button key={t.value} onClick={() => !isReadonly && setTrack(t.value)}
                        className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all
                          ${track === t.value
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                            : 'border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Part A ──────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Part A — Achievement Summary</h2>
                <p className="text-xs text-slate-400 mt-1">Briefly describe what you achieved this month. Focus on the challenge or opportunity, the action you personally took, and the result. <span className="font-semibold text-slate-600">Minimum 150 words.</span></p>
              </div>
              <div>
                <textarea
                  rows={12}
                  value={partA}
                  onChange={e => setPartA(e.target.value)}
                  disabled={!!isReadonly}
                  placeholder="Describe your achievement in detail..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none disabled:bg-slate-50"
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs font-semibold ${wordCount(partA) >= 150 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {wordCount(partA)} / 150 words minimum
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Part B — SMART ─────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Part B — SMART Evidence</h2>
                <p className="text-xs text-slate-400 mt-1">Complete all five fields with specific evidence for each dimension.</p>
              </div>
              {SMART_META.map(m => (
                <div key={m.key} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                      <span className="text-white font-black text-sm">{m.letter}</span>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700">{m.letter} — {m.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{m.question}</p>
                    </div>
                  </div>
                  <div className="p-3">
                    <textarea
                      rows={3}
                      value={smart[m.key]}
                      onChange={e => setSmart(prev => ({ ...prev, [m.key]: e.target.value }))}
                      disabled={!!isReadonly}
                      placeholder="Your answer..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none disabled:bg-slate-50"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Step 4: Part C + Declaration ──────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Part C */}
              <div>
                <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">Part C — Supporting Evidence</h2>
                <p className="text-xs text-slate-400 mt-2 mb-4">List documents or evidence that support your nomination. (Optional but recommended)</p>
                {evidence.map((ev, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr_1fr] gap-3 mb-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-black flex items-center justify-center mt-1 shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <FieldLabel>Document / Evidence Description</FieldLabel>
                      <textarea rows={2} value={ev.desc} disabled={!!isReadonly}
                        onChange={e => setEvidence(prev => prev.map((r, j) => j === i ? { ...r, desc: e.target.value } : r))}
                        placeholder="e.g. Sales report screenshot, Email thread..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <FieldLabel>Source</FieldLabel>
                      <input value={ev.source} disabled={!!isReadonly}
                        onChange={e => setEvidence(prev => prev.map((r, j) => j === i ? { ...r, source: e.target.value } : r))}
                        placeholder="e.g. CRM, Email, Manager"
                        className="w-full h-[68px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Supporting Document Upload */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-1">Supporting Document</h2>
                <p className="text-xs text-slate-400 mb-4">Upload any one document to support your nomination (PDF, image, Excel, Word, etc.). Optional.</p>

                {/* Already uploaded */}
                {nomination?.support_document_name && !docFile && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-800 truncate">{nomination.support_document_name}</p>
                      <p className="text-[10px] text-emerald-600">Uploaded ✓</p>
                    </div>
                    {nomination.support_document_url && (
                      <a href={nomination.support_document_url} target="_blank" rel="noreferrer"
                        className="shrink-0 text-xs font-bold text-emerald-700 hover:underline px-3 py-1.5 rounded-lg border border-emerald-300 hover:bg-emerald-100 transition-all">
                        View
                      </a>
                    )}
                    {!isReadonly && (
                      <button type="button" onClick={async () => {
                        if (!nomination?.id) return;
                        await fetch(`${EOM_API}/nominations/${nomination.id}/upload-document/`, { method: 'DELETE' });
                        setNomination((n: any) => ({ ...n, support_document_name: '', support_document_url: null }));
                      }} className="shrink-0 text-xs font-bold text-rose-500 hover:text-rose-700 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-all">
                        Remove
                      </button>
                    )}
                  </div>
                )}

                {/* New file selected (not yet uploaded) */}
                {docFile && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-blue-800 truncate">{docFile.name}</p>
                      <p className="text-[10px] text-blue-500">{(docFile.size / 1024).toFixed(0)} KB — ready to upload</p>
                    </div>
                    <button type="button" onClick={() => setDocFile(null)}
                      className="shrink-0 text-xs font-bold text-slate-500 hover:text-rose-500 transition-colors">
                      ✕
                    </button>
                  </div>
                )}

                {!isReadonly && (
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer transition-all text-sm font-semibold text-slate-500 hover:text-emerald-700">
                      <Upload className="w-4 h-4" />
                      {docFile ? 'Change File' : 'Choose File'}
                      <input type="file" className="hidden" accept="*/*"
                        onChange={e => setDocFile(e.target.files?.[0] || null)} />
                    </label>
                    {docFile && (
                      <button type="button" disabled={docUploading}
                        onClick={async () => {
                          if (!nomination?.id || !docFile) return;
                          setDocUploading(true);
                          try {
                            const fd = new FormData();
                            fd.append('document', docFile);
                            const res = await fetch(`${EOM_API}/nominations/${nomination.id}/upload-document/`, { method: 'POST', body: fd });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Upload failed');
                            setNomination(data);
                            setDocFile(null);
                            showMsg('Document uploaded successfully!', true);
                          } catch (e: any) { showMsg(e.message, false); }
                          finally { setDocUploading(false); }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all disabled:opacity-50">
                        {docUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {docUploading ? 'Uploading…' : 'Upload'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Declaration */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
                <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-3">Employee Declaration</h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                  I confirm that all information provided is accurate, verifiable and submitted in good faith. I understand that misrepresentation will result in disqualification of my nomination.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <FieldLabel>Digital Signature (Full Name) <span className="text-rose-500">*</span></FieldLabel>
                    <input
                      value={signatureName}
                      onChange={e => setSignatureName(e.target.value)}
                      disabled={!!isReadonly}
                      placeholder="Type your full name"
                      className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 italic disabled:bg-slate-50"
                    />
                  </div>
                  <ReadOnlyField label="Date" value={today} />
                </div>

                {!isReadonly && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={declarationAgreed}
                      onChange={e => setDeclarationAgreed(e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
                    />
                    <span className="text-sm text-slate-700 font-medium">
                      I agree to the declaration above and confirm all information is accurate.
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          {!isReadonly && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              <button onClick={() => history.back()} disabled={step === 1}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              {step < 4 ? (
                <button onClick={handleNext} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Saving…' : 'Save & Continue'}
                  {!saving && <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={saving || submitting || !declarationAgreed}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all disabled:opacity-50">
                  {(saving || submitting) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                  {submitting ? 'Submitting…' : saving ? 'Saving…' : 'Submit Nomination'}
                </button>
              )}
            </div>
          )}

          {/* Step indicator footer */}
          <p className="text-center text-[11px] text-slate-400 mt-4">Step {step} of {STEPS.length}</p>
        </div>
      </div>
    </div>
  );
}

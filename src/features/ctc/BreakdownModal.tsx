/* One candidate's compensation break-up, opened by clicking their row on the
   CTC Calculator page. Laid out like P & C's Annexure A; the numbers come
   from the server (ctc/calculator.py), never worked out here, so the screen
   and the PDF can't disagree. */
import { useEffect, useState } from 'react';
import { X, Download, Loader2, AlertTriangle, Info, Calculator } from 'lucide-react';
import { downloadCtcPdf, getCtcBreakdown, type BreakdownLine, type CtcBreakdown, type CtcCandidate } from './api';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const rs = (n: number) => inr.format(n);

function Rows({ rows }: { rows: BreakdownLine[] }) {
  return (
    <>
      {rows.map(r => (
        <tr key={r.label} className="hover:bg-amber-50/30">
          <td className="px-4 py-2 text-slate-700">{r.label}</td>
          <td className="px-4 py-2 text-right font-mono text-slate-800">{rs(r.monthly)}</td>
          <td className="px-4 py-2 text-right font-mono text-slate-800">{rs(r.annual)}</td>
          <td className="px-4 py-2 text-[11px] text-slate-400">{r.note}</td>
        </tr>
      ))}
    </>
  );
}

function Total({ label, monthly, annual, grand = false }: { label: string; monthly: number; annual: number; grand?: boolean }) {
  return (
    <tr className={grand ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'bg-amber-50 text-slate-900'}>
      <td className="px-4 py-2.5 font-black">{label}</td>
      <td className="px-4 py-2.5 text-right font-mono font-black">{rs(monthly)}</td>
      <td className="px-4 py-2.5 text-right font-mono font-black">{rs(annual)}</td>
      <td />
    </tr>
  );
}

function Heading({ label }: { label: string }) {
  return (
    <tr className="bg-slate-50">
      <td colSpan={4} className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</td>
    </tr>
  );
}

export function BreakdownModal({ candidate, onClose }: { candidate: CtcCandidate; onClose: () => void }) {
  const [b, setB] = useState<CtcBreakdown | null>(null);
  const [error, setError] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getCtcBreakdown(candidate.id)
      .then(d => { if (alive) setB(d.breakdown); })
      .catch((e: Error) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [candidate.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onPdf = async () => {
    setPdfBusy(true);
    const problem = await downloadCtcPdf(candidate.id, candidate.candidateName);
    setPdfBusy(false);
    if (problem) setError(problem);
  };

  const failed = error || b?.error;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="CTC break-up"
        className="ih-pop-in relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white
                   shadow-[0_60px_120px_-30px_rgba(0,0,0,.5)] ring-1 ring-black/5 overflow-hidden">

        {/* header */}
        <div className="flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-white via-amber-50/70 to-white border-b border-amber-100 px-5 sm:px-6 py-4">
          <div className="flex items-start gap-4 pr-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Compensation Break-up · Annexure A</p>
              <h2 className="text-xl font-black text-slate-900 truncate">{candidate.candidateName}</h2>
              <p className="text-[12px] text-slate-500 mt-0.5">
                {[candidate.employeeCode, candidate.designation, candidate.department, candidate.category,
                  candidate.workLocation,
                  candidate.dateOfJoining && `Joining ${new Date(`${candidate.dateOfJoining}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
                ].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px] font-black">
                <span className="px-2 py-0.5 rounded-full bg-white ring-1 ring-amber-200 text-amber-700">Cadre {b?.cadre || candidate.cadre}{b?.cadreName ? ` · ${b.cadreName}` : ''}</span>
                <span className="px-2 py-0.5 rounded-full bg-white ring-1 ring-amber-200 text-amber-700">Grade {candidate.grade}</span>
                <span className="px-2 py-0.5 rounded-full bg-white ring-1 ring-amber-200 text-amber-700">
                  {candidate.numberOfChildren ?? 0} child{(candidate.numberOfChildren ?? 0) === 1 ? '' : 'ren'}
                </span>
                {b && !b.error && <span className="px-2 py-0.5 rounded-full bg-white ring-1 ring-amber-200 text-amber-700">VPP {b.vppPercent}%</span>}
                {b && !b.error && b.state && (
                  <span className="px-2 py-0.5 rounded-full bg-white ring-1 ring-amber-200 text-amber-700">
                    {b.state} · min wage {rs(b.minWage)}/month
                  </span>
                )}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} title="Close"
            className="absolute top-4 right-4 w-9 h-9 rounded-xl text-slate-400 hover:bg-amber-100 hover:text-slate-700 flex items-center justify-center transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto ih-scroll-clean">
          {failed ? (
            <div className="py-14 px-6 flex flex-col items-center text-center gap-2">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
              <p className="text-[13px] font-bold text-rose-700">{failed}</p>
            </div>
          ) : !b ? (
            <div className="py-14 flex items-center justify-center gap-2 text-slate-400 text-sm font-bold">
              <Loader2 className="w-5 h-5 animate-spin" />Working it out…
            </div>
          ) : (
            <div className="p-4 sm:p-5 space-y-3">
              <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10.5px] uppercase tracking-wider">
                      <th className="text-left px-4 py-2.5 font-black">Salary Component</th>
                      <th className="text-right px-4 py-2.5 font-black">Monthly</th>
                      <th className="text-right px-4 py-2.5 font-black">Annually</th>
                      <th className="text-left px-4 py-2.5 font-black">Basis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <Rows rows={b.earnings} />
                    <Total label="Gross Earnings" monthly={b.grossEarnings} annual={b.grossEarningsAnnual} />
                    {b.reimbursements.some(r => r.monthly > 0) && (
                      <><Heading label="Reimbursements" /><Rows rows={b.reimbursements.filter(r => r.monthly > 0)} /></>
                    )}
                    {b.carLease && (
                      <tr className="hover:bg-amber-50/30">
                        <td className="px-4 py-2 text-slate-700">Car Lease / Company Car Benefit</td>
                        <td colSpan={2} className="px-4 py-2 text-right font-semibold text-slate-800">As per policy</td>
                        <td className="px-4 py-2 text-[11px] text-slate-400">Car lease policy</td>
                      </tr>
                    )}
                    <Total label="Gross Salary" monthly={b.grossSalary} annual={b.grossSalaryAnnual} />
                    <Heading label="Annual Benefits" />
                    <Rows rows={b.benefits} />
                    <Total label="Total Annual Benefits" monthly={b.benefitsTotal} annual={b.benefitsTotalAnnual} />
                    <Total label="Total Salary / Compensation (Fixed)" monthly={b.fixedMonthly} annual={b.fixedAnnual} />
                    <Heading label="Other Payments (Payout on Quarterly Basis)" />
                    <Rows rows={b.otherPayments} />
                    <Total label="TOTAL CTC" monthly={b.totalCtcMonthly} annual={b.totalCtcAnnual} grand />
                  </tbody>
                </table>
              </div>
              {b.notes.map(n => (
                <p key={n} className="flex items-start gap-2 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[11.5px] font-semibold text-amber-800">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />{n}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-[11px] text-slate-400 font-semibold">Uploaded CTC {inr.format(Number(candidate.ctc || 0))} per annum</p>
          <button type="button" onClick={onPdf} disabled={pdfBusy || !b || !!failed}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600
                       hover:from-amber-600 hover:to-orange-700 text-white text-[12.5px] font-black shadow-md shadow-amber-200
                       transition-all disabled:opacity-50">
            {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

/* CTC Calculator — linked from the sidebar's Resources section, under APIS
   Wall.

   A placeholder for now. The calculator needs APIS's own CTC breakup rules
   (Basic as a share of CTC, HRA, PF, gratuity, statutory caps and so on);
   until P & C supplies them, this page says so plainly rather than showing
   numbers worked out from generic percentages that nobody here has signed
   off. */
import { ChevronRight, Calculator, Clock } from 'lucide-react';

export function CtcCalculatorPage() {
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
          <div className="relative flex items-center gap-4">
            <div className="ih-float w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">CTC Calculator</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white ring-1 ring-amber-200 text-[10px] font-black text-amber-600">
                  <Clock className="w-3 h-3" />Coming soon
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">See how a CTC breaks down into monthly take-home, allowances and deductions.</p>
            </div>
          </div>
        </div>

        <div className="ih-reveal rounded-3xl bg-white border border-slate-200 shadow-sm px-6 py-14 flex flex-col items-center text-center"
          style={{ animationDelay: '80ms' }}>
          <div className="w-16 h-16 rounded-2xl bg-amber-50 ring-4 ring-amber-100 flex items-center justify-center">
            <Calculator className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-900">The CTC Calculator is on its way</h2>
          <p className="mt-1.5 max-w-md text-[13px] text-slate-500 leading-relaxed">
            It will work out a salary breakup using APIS's own CTC structure. Until it's ready,
            please contact P &amp; C for any CTC or salary breakup questions.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CtcCalculatorPage;

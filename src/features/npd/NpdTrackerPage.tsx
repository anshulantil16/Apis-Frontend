/* NPD Master Tracker — linked from the sidebar's Resources section, under
   CTC Calculator. The page is in place; what it tracks (columns, stages,
   who updates it) is still to be supplied, so for now it says so plainly
   rather than showing an empty table. */
import { ChevronRight, ClipboardList } from 'lucide-react';

export function NpdTrackerPage() {
  return (
    <div className="min-h-full bg-[#fdfbf6] relative overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ih-drift absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-amber-300/20 blur-[130px]" />
        <div className="ih-aurora absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-orange-300/15 blur-[130px]" />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-6 py-5 space-y-6">
        <div className="ih-fade flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
          <span>Apps</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-amber-600">NPD Master Tracker</span>
        </div>

        <div className="ih-reveal ih-sweep relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-amber-50/60
                        border border-amber-100 shadow-sm p-6 md:p-8">
          <div className="ih-drift pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-300/25 blur-[100px]" />
          <div className="relative flex items-center gap-4">
            <div className="ih-float w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
              <ClipboardList className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">NPD Master Tracker</h1>
              <p className="text-sm text-slate-500 mt-1">New Product Development — every product from idea to launch, in one place.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-amber-200 bg-white/70 p-10 text-center">
          <ClipboardList className="w-10 h-10 text-amber-400 mx-auto" />
          <p className="mt-3 text-base font-black text-slate-800">The tracker is being set up</p>
          <p className="mt-1 text-sm text-slate-500">Products, stages and owners will appear here once the NPD team's tracker is added.</p>
        </div>
      </div>
    </div>
  );
}

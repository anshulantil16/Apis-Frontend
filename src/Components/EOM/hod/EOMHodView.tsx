import { BarChart3 } from 'lucide-react';

interface Props {
  user: any;
}

export function EOMHodView({ user }: Props) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-5">
          <BarChart3 className="w-8 h-8 text-violet-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">HOD Review</h2>
        <p className="text-sm text-slate-500">
          Hi <span className="font-semibold text-slate-700">{user?.name || user?.employee_id}</span>, your department nomination review is coming soon.
        </p>
        <p className="text-xs text-slate-400 mt-6 bg-slate-50 rounded-xl px-4 py-3">
          Review panel will be available once manager approvals are in.
        </p>
      </div>
    </div>
  );
}

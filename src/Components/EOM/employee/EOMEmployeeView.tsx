import { Award } from 'lucide-react';

interface Props {
  user: any;
}

export function EOMEmployeeView({ user }: Props) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <Award className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Employee Nomination</h2>
        <p className="text-sm text-slate-500">
          Hi <span className="font-semibold text-slate-700">{user?.name || user?.employee_id}</span>, your nomination form is coming soon.
        </p>
        <p className="text-xs text-slate-400 mt-6 bg-slate-50 rounded-xl px-4 py-3">
          Form fields will be configured by HR — check back shortly.
        </p>
      </div>
    </div>
  );
}

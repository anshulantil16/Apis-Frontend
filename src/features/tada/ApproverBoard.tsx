/* Manager / P&C (HR) / Finance queue - what is waiting on this user, and what they
   have already actioned. */
import { useState, useEffect } from 'react';
import {
  CheckCircle, Clock,
} from 'lucide-react';
import { API, type User } from './shared';
import { Count } from './components';
import { Detail, ReqCard } from './RequestDetail';

export function ApproverBoard({ user }: { user: User }) {
  const [data, setData] = useState<any>({ pending: [], processed: [] });
  const [sel, setSel] = useState<number | null>(null);
  const load = () => fetch(`${API}/queue/?employee_id=${user.employee_id}`).then(r => r.json()).then(setData);
  useEffect(() => { load(); }, []);
  if (sel) return <Detail id={sel} user={user} onBack={() => { setSel(null); load(); }} onActioned={load} />;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 bg-[length:200%_200%] animate-gradient text-white p-5 flex items-center gap-4 shadow-lg sheen">
        <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shrink-0"><Clock className="w-6 h-6" /></div>
        <div>
          <p className="text-white/80 text-sm font-semibold">Awaiting your review</p>
          <p className="text-3xl font-black leading-none"><Count n={data.pending.length} /> request{data.pending.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div>
        <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" />Pending Your Action ({data.pending.length})</h3>
        <div className="space-y-2 stagger">{data.pending.map((r: any) => <ReqCard key={r.id} r={r} onClick={() => setSel(r.id)} />)}
          {data.pending.length === 0 && (
            <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-slate-200 animate-pop">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-3 animate-float"><CheckCircle className="w-8 h-8 text-emerald-400" /></div>
              <p className="font-bold text-slate-500">All caught up! 🎉</p>
              <p className="text-slate-400 text-sm mt-1">Nothing is pending your action right now.</p>
            </div>
          )}</div>
      </div>
      <div>
        <h3 className="font-black text-slate-800 mb-3">Processed</h3>
        <div className="space-y-2 stagger">{data.processed.map((r: any) => <ReqCard key={r.id} r={r} onClick={() => setSel(r.id)} />)}
          {data.processed.length === 0 && <p className="text-slate-300 text-sm">None yet.</p>}</div>
      </div>
    </div>
  );
}

// ── Admin: user import ────────────────────────────────────────────────────────

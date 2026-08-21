/* One request in full: trip details, itinerary, the policy/sanctioned/claimed
   breakdown, its bills, the approval trail, and the approve/reject controls for
   whoever's stage it currently sits at. */
import { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, FileText, Receipt, Car, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Wallet,
} from 'lucide-react';
import { API, fmt, type User } from './shared';
import { Confetti, Pill, Toast } from './components';
import { PolicyBreakdown } from './PolicyBreakdown';

export function Detail({ id, user, onBack, onActioned }: { id: number; user: User; onBack: () => void; onActioned?: () => void }) {
  const [r, setR] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [party, setParty] = useState(false);
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);
  const load = () => fetch(`${API}/requests/${id}/`).then(x => x.json()).then(setR);
  useEffect(() => { load(); }, [id]);
  if (!r) return <div className="p-8 text-center text-slate-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>;

  const canAct = (user.role === 'manager' && r.status === 'submitted') || (user.role === 'hr' && r.status === 'manager_approved') || (user.role === 'finance' && r.status === 'hr_approved');
  const canPay = user.role === 'finance' && r.status === 'finance_approved';
  const act = async (action: string) => {
    setBusy(true);
    const res = await fetch(`${API}/requests/${id}/action/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: user.employee_id, action, remarks }) });
    if (res.ok) {
      await load(); if (onActioned) onActioned();
      const label = action === 'reject' ? 'Request rejected' : action === 'paid' ? 'Marked as paid 💰' : 'Approved & forwarded ✓';
      setToast({ t: label, ok: action !== 'reject' });
      if (action !== 'reject') { setParty(true); setTimeout(() => setParty(false), 1600); }
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <Confetti show={party} />
      {toast && <Toast msg={toast.t} ok={toast.ok} onClose={() => setToast(null)} />}
      <button onClick={onBack} className="flex items-center gap-1 text-slate-500 text-sm font-bold hover:text-indigo-600 transition-colors"><ChevronLeft className="w-4 h-4" />Back</button>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex justify-between items-start mb-3">
          <div><h3 className="font-black text-slate-800 text-lg">{r.type_label}</h3><p className="text-slate-400 text-sm">{r.employee_name} · {r.employee_id} · {r.department} · Level {r.level}</p></div>
          <Pill s={r.status} label={r.status_label} />
        </div>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          {r.purpose && <div><p className="text-slate-400 text-xs">Purpose</p><p className="font-semibold">{r.purpose}</p></div>}
          {r.destination_city && <div><p className="text-slate-400 text-xs">Destination</p><p className="font-semibold">{r.destination_city} <span className="text-indigo-500">(Grade {r.city_grade})</span></p></div>}
          {(r.from_date || r.to_date) && <div><p className="text-slate-400 text-xs">Dates</p><p className="font-semibold">{r.from_date} → {r.to_date}{r.number_of_days ? <span className="text-indigo-500"> ({r.number_of_days} day{r.number_of_days === 1 ? '' : 's'})</span> : null}</p></div>}
          {r.sanction_number && <div><p className="text-slate-400 text-xs">Sanction No.</p><p className="font-semibold">{r.sanction_number}</p></div>}
          {r.travel_mode && <div><p className="text-slate-400 text-xs">Mode</p><p className="font-semibold">{r.travel_mode}</p></div>}
          {r.travel_mode_date && <div><p className="text-slate-400 text-xs">Onward Journey</p><p className="font-semibold">{r.travel_mode_date}{r.travel_mode_time_pref_label ? ` · ${r.travel_mode_time_pref_label}` : ''}</p></div>}
          {r.return_mode_date && <div><p className="text-slate-400 text-xs">Return Journey</p><p className="font-semibold">{r.return_mode_date}{r.return_mode_time_pref_label ? ` · ${r.return_mode_time_pref_label}` : ''}</p></div>}
          {r.estimate_amount > 0 && <div><p className="text-slate-400 text-xs">Total Estimate</p><p className="font-black text-slate-800">₹{fmt(r.estimate_amount)}</p></div>}
          {r.advance_amount > 0 && <div><p className="text-slate-400 text-xs">Advance Required</p><p className="font-black text-indigo-600">₹{fmt(r.advance_amount)}</p></div>}
          {r.total_claimed > 0 && <div><p className="text-slate-400 text-xs">Total Claimed</p><p className="font-black text-slate-800">₹{fmt(r.total_claimed)}</p></div>}
        </div>

        {/* A claim settling a sanction: show it against what was approved, and
            net the advance, so the approver sees the money still to move. */}
        {r.sanction && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-slate-400 text-xs mb-1.5">Settles sanction #{r.sanction.id} · {r.sanction.destination_city}</p>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
              <span className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600">Sanctioned ₹{fmt(r.sanction.estimate_amount)}</span>
              <span className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600">Claimed ₹{fmt(r.total_claimed)}</span>
              {r.advance_adjusted > 0 && <span className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-amber-700">Advance ₹{fmt(r.advance_adjusted)}</span>}
              <span className={`rounded-lg px-2 py-1 border ${r.net_settlement >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                {r.net_settlement >= 0 ? 'Payable' : 'Recover'} ₹{fmt(Math.abs(r.net_settlement))}
              </span>
              {r.total_claimed > r.sanction.estimate_amount && (
                <span className="bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 text-rose-700">
                  Over sanction by ₹{fmt(r.total_claimed - r.sanction.estimate_amount)}
                </span>
              )}
            </div>
          </div>
        )}

        {r.legs?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-slate-400 text-xs mb-1.5">Itinerary · {r.legs.length} stop{r.legs.length === 1 ? '' : 's'}</p>
            <div className="space-y-1.5">
              {r.legs.map((l: any) => (
                <div key={l.seq} className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-black text-slate-700">{l.seq + 1}. {l.destination_city}</span>
                    <span className="text-indigo-500 font-semibold">grade {l.city_grade}</span>
                    <span className="text-slate-500">{l.from_date} → {l.to_date} ({l.days}d)</span>
                    {l.travel_mode && <span className="text-slate-500">· by {l.travel_mode}</span>}
                    {l.ticket_date && <span className="text-slate-400">· ticket {l.ticket_date}{l.ticket_time_pref_label ? ` ${l.ticket_time_pref_label}` : ''}</span>}
                  </div>
                  {l.travel_address && <p className="text-slate-500 mt-0.5">{l.travel_address}</p>}
                  {l.purpose && <p className="text-slate-400 mt-0.5">{l.purpose}</p>}
                  {l.mode_exception_reason && <p className="text-amber-700 mt-0.5"><b>Mode exception:</b> {l.mode_exception_reason}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {r.estimate_amount > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-slate-400 text-xs mb-1.5">Estimate breakdown</p>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {[['Ticket', r.est_ticket_amount], ['Lodging', r.est_lodging_amount], ['Food / DA', r.est_food_amount],
                ['Local', r.est_local_amount], ['Misc', r.est_misc_amount]].map(([l, v]: any) => v > 0 && (
                <span key={l} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-600">{l} ₹{fmt(v)}</span>
              ))}
            </div>
          </div>
        )}

        {r.mode_exception_reason && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Reason for travel-mode exception</p>
            <p className="text-xs text-amber-900 mt-0.5">{r.mode_exception_reason}</p>
          </div>
        )}

        {r.policy_flags?.length > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-1">
            <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Policy flags</p>
            {r.policy_flags.map((f: string, i: number) => (
              <p key={i} className="text-xs text-amber-800 font-semibold flex items-start gap-2"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{f}</p>
            ))}
          </div>
        )}
      </div>

      {/* What policy allows, what was sanctioned, what is being claimed — the
          same breakdown the employee saw while filing, so every approver in the
          chain judges the claim against the same figures. */}
      {r.settlement && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h4 className="font-black text-slate-700 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-indigo-500" />Policy · Sanctioned · Claimed
          </h4>
          <PolicyBreakdown settlement={r.settlement} />
        </div>
      )}

      {r.expense_items?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-x-auto">
          <h4 className="font-black text-slate-700 mb-3">Bills</h4>
          <table className="w-full text-xs"><thead><tr className="text-slate-400 border-b-2"><th className="text-left py-1">Category</th><th className="text-left">Date</th><th className="text-left">Detail</th><th className="text-right">Claimed</th><th className="text-right">Cap</th><th className="text-center">Bill</th><th className="text-left">Policy</th></tr></thead>
            <tbody>{r.expense_items.map((it: any) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-1.5 font-bold">{it.category_label}</td><td>{it.date}</td>
                <td>{it.description || `${it.from_location}→${it.to_location}`} {it.mode && <span className="text-slate-400">({it.mode})</span>}</td>
                <td className="text-right font-bold">₹{fmt(it.claimed_amount)}</td>
                <td className="text-right text-slate-500">{it.policy_cap != null ? `₹${fmt(it.policy_cap)}` : '—'}</td>
                <td className="text-center">{it.has_bill ? <a href={`${(import.meta.env.VITE_API_BASE_URL || '')}${it.bill_url}`} target="_blank" className="text-emerald-600 font-bold">View</a> : <span className="text-rose-400">None</span>}</td>
                <td className="text-amber-600 text-[11px]">{it.policy_flag}</td>
              </tr>))}</tbody></table>
        </div>
      )}
      {r.local_items?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-x-auto">
          <h4 className="font-black text-slate-700 mb-3">Local Journeys</h4>
          <table className="w-full text-xs"><thead><tr className="text-slate-400 border-b-2"><th className="text-left py-1">Date</th><th className="text-left">Purpose</th><th className="text-left">From→To</th><th className="text-left">Mode</th><th className="text-right">Amount</th><th className="text-left">Policy</th></tr></thead>
            <tbody>{r.local_items.map((it: any) => (<tr key={it.id} className="border-b border-slate-100"><td className="py-1.5">{it.date}</td><td>{it.purpose}</td><td>{it.from_location}→{it.to_location}</td><td>{it.mode}</td><td className="text-right font-bold">₹{fmt(it.amount)}</td><td className="text-amber-600 text-[11px]">{it.policy_flag}</td></tr>))}</tbody></table>
        </div>
      )}

      {/* Approval trail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h4 className="font-black text-slate-700 mb-3">Approval Trail</h4>
        <div className="space-y-2">
          {(r.logs || []).map((l: any, i: number) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              {l.action.includes('reject') ? <XCircle className="w-4 h-4 text-rose-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
              <span className="font-bold capitalize">{l.stage}</span><span className="text-slate-500 capitalize">{l.action}</span>
              <span className="text-slate-400">by {l.by_name}</span><span className="text-slate-300 ml-auto text-xs">{l.timestamp}</span>
              {l.remarks && <span className="text-slate-400 italic text-xs">"{l.remarks}"</span>}
            </div>
          ))}
          {(!r.logs || r.logs.length === 0) && <p className="text-slate-300 text-sm">No actions yet.</p>}
        </div>
      </div>

      {(canAct || canPay) && (
        <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-sm p-5">
          <h4 className="font-black text-slate-700 mb-2">Your Decision ({user.role.toUpperCase()})</h4>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Remarks (optional)" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm mb-3" rows={2} />
          <div className="flex gap-2">
            {canAct && <>
              <button onClick={() => act('approve')} disabled={busy} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50 transition-all"><CheckCircle className="w-4 h-4" />Approve</button>
              <button onClick={() => act('reject')} disabled={busy} className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 hover:shadow-lg hover:shadow-rose-500/30 hover:scale-105 active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50 transition-all"><XCircle className="w-4 h-4" />Reject</button>
            </>}
            {canPay && <button onClick={() => act('paid')} disabled={busy} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-700 hover:shadow-lg hover:scale-105 active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50 transition-all"><Wallet className="w-4 h-4" />Mark as Paid</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Request list card ─────────────────────────────────────────────────────────
export function ReqCard({ r, onClick }: { r: any; onClick: () => void }) {
  const Icon = r.type === 'tour_sanction' ? FileText : r.type === 'travel_expense' ? Receipt : Car;
  const grad = r.type === 'tour_sanction' ? 'from-sky-400 to-blue-500' : r.type === 'travel_expense' ? 'from-violet-400 to-indigo-500' : 'from-emerald-400 to-teal-500';
  const pending = ['submitted', 'manager_approved', 'hr_approved', 'finance_approved'].includes(r.status);
  return (
    <button onClick={onClick} className="hover-lift w-full text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-4 flex items-center gap-3 group">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform`}><Icon className="w-5 h-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-800 text-sm truncate">{r.type_label} {r.destination_city && `· ${r.destination_city}`}</p>
        <p className="text-slate-400 text-xs">{r.employee_name} · {r.created_at} {r.total_claimed > 0 && `· ₹${fmt(r.total_claimed)}`}</p>
      </div>
      {pending && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-ring shrink-0" />}
      <Pill s={r.status} label={r.status_label} />
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0" />
    </button>
  );
}

// ── Approver dashboard ────────────────────────────────────────────────────────

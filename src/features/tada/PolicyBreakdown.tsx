/* The three numbers a claim is judged on - policy entitlement, what was
   sanctioned, and what is claimed - per stop and per head. Rendered both by the
   employee filing the claim and by every approver after them. */
import {
  AlertCircle, Wallet,
} from 'lucide-react';
import { SETTLE_HEADS } from './BillCollector';

export function PolicyBreakdown({ settlement, compact = false }: { settlement: any; compact?: boolean }) {
  if (!settlement) return null;
  const money = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`;
  const t = settlement.totals || {};

  return (
    <div className="space-y-3">
      {settlement.stops.some((s: any) => s.policy_unavailable) && (
        <p className="text-xs text-amber-800 font-semibold bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Policy limits can't be worked out for this claim — it has no destination city or travel dates,
          which is what sets the city grade and the number of nights.
        </p>
      )}

      {settlement.stops.map((st: any) => (
        <div key={String(st.key)} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50/80 px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
            <p className="font-black text-slate-800 text-xs">
              {st.seq !== null ? `Stop ${st.seq + 1} · ` : ''}{st.city}
              {st.grade && <span className="text-indigo-500 font-bold"> · grade {st.grade}</span>}
            </p>
            <p className="text-[11px] text-slate-400">
              {st.from_date} → {st.to_date}{st.days ? ` · ${st.days}d / ${st.nights}n` : ''}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-3 py-1.5 text-left font-black uppercase tracking-widest">Head</th>
                  <th className="px-3 py-1.5 text-right font-black uppercase tracking-widest">Policy</th>
                  <th className="px-3 py-1.5 text-right font-black uppercase tracking-widest">Sanctioned</th>
                  <th className="px-3 py-1.5 text-right font-black uppercase tracking-widest">Claimed</th>
                  <th className="px-3 py-1.5 text-right font-black uppercase tracking-widest">vs Policy</th>
                </tr>
              </thead>
              <tbody>
                {st.rows.map((row: any) => (
                  <tr key={row.key} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-1.5 font-bold text-slate-700">{row.label}</td>
                    <td className="px-3 py-1.5 text-right text-slate-500">{money(row.policy)}</td>
                    <td className="px-3 py-1.5 text-right text-slate-500">{money(row.sanctioned)}</td>
                    <td className="px-3 py-1.5 text-right font-black text-slate-800">{money(row.claimed)}</td>
                    <td className="px-3 py-1.5 text-right">
                      {row.policy === null ? <span className="text-slate-300">—</span>
                        : row.over_policy ? <span className="font-black text-rose-600">+{money(row.over_policy)}</span>
                        : row.claimed ? <span className="font-bold text-emerald-600">within</span>
                        : <span className="text-slate-300">—</span>}
                      {!compact && row.flags?.map((f: string, i: number) => (
                        <p key={i} className="text-[10px] text-amber-700 font-semibold mt-0.5 text-left">{f}</p>
                      ))}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                  <td className="px-3 py-1.5 font-black text-slate-600">Stop total</td>
                  <td className="px-3 py-1.5 text-right font-bold text-slate-500">{money(st.totals.policy)}</td>
                  <td className="px-3 py-1.5 text-right font-bold text-slate-500">{money(st.totals.sanctioned)}</td>
                  <td className="px-3 py-1.5 text-right font-black text-slate-900">{money(st.totals.claimed)}</td>
                  <td className="px-3 py-1.5 text-right">
                    {st.totals.claimed > st.totals.policy && st.totals.policy > 0
                      ? <span className="font-black text-rose-600">+{money(st.totals.claimed - st.totals.policy)}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {settlement.unattributed?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">Not linked to a stop</p>
          {settlement.unattributed.map((x: any) => (
            <p key={x.key} className="text-xs text-amber-800 font-semibold">{x.label} {money(x.claimed)}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {[
          { l: 'Policy allows', v: money(t.policy), c: 'text-slate-700' },
          { l: 'Sanctioned', v: money(t.sanctioned), c: 'text-slate-700' },
          { l: 'Claimed', v: money(t.claimed), c: 'text-slate-900' },
          { l: 'Advance taken', v: `− ${money(settlement.advance)}`, c: 'text-amber-600' },
        ].map(x => (
          <div key={x.l} className="bg-white rounded-xl border border-slate-200 px-3 py-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{x.l}</p>
            <p className={`text-base font-black ${x.c}`}>{x.v}</p>
          </div>
        ))}
        <div className={`rounded-xl border px-3 py-2 ${settlement.net >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {settlement.net >= 0 ? 'Payable' : 'To recover'}
          </p>
          <p className={`text-base font-black ${settlement.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {money(Math.abs(settlement.net))}
          </p>
        </div>
      </div>

      {settlement.over_policy > 0 && (
        <p className="text-xs text-rose-700 font-bold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Claim is {money(settlement.over_policy)} above what policy allows for this trip.
        </p>
      )}
    </div>
  );
}

export function SettlementTable({ sanction, claimedByCat, claimTotal }: {
  sanction: any; claimedByCat: Record<string, number>; claimTotal: number;
}) {
  const money = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
  const heads = sanction.heads || {};
  const advance = sanction.advance_amount || 0;
  const net = claimTotal - advance;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100 rounded-2xl p-4 space-y-3">
      <h4 className="font-black text-slate-700 text-sm flex items-center gap-2">
        <Wallet className="w-4 h-4 text-indigo-500" />Sanctioned vs Claimed
      </h4>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-400">
              <tr>{['Head', 'Sanctioned', 'Claimed', 'Difference'].map((h, i) => (
                <th key={h} className={`px-3 py-1.5 font-black uppercase tracking-widest ${i ? 'text-right' : 'text-left'}`}>{h}</th>))}</tr>
            </thead>
            <tbody>
              {SETTLE_HEADS.map(({ k, l }) => {
                const est = heads[k] || 0, act = claimedByCat[k] || 0;
                if (!est && !act) return null;
                const diff = act - est;
                return (
                  <tr key={k} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-bold text-slate-700">{l}</td>
                    <td className="px-3 py-1.5 text-right text-slate-500">{money(est)}</td>
                    <td className="px-3 py-1.5 text-right font-bold text-slate-800">{money(act)}</td>
                    <td className={`px-3 py-1.5 text-right font-bold ${diff > 0 ? 'text-rose-600' : diff < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {diff === 0 ? '—' : `${diff > 0 ? '+' : '−'}${money(Math.abs(diff))}`}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                <td className="px-3 py-2 font-black text-slate-700">Total</td>
                <td className="px-3 py-2 text-right font-bold text-slate-600">{money(sanction.estimate_amount)}</td>
                <td className="px-3 py-2 text-right font-black text-slate-900">{money(claimTotal)}</td>
                <td className={`px-3 py-2 text-right font-black ${claimTotal > sanction.estimate_amount ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {claimTotal === sanction.estimate_amount ? '—' : `${claimTotal > sanction.estimate_amount ? '+' : '−'}${money(Math.abs(claimTotal - sanction.estimate_amount))}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {claimTotal > sanction.estimate_amount && (
        <p className="text-xs text-amber-800 font-semibold bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Claim is {money(claimTotal - sanction.estimate_amount)} over what was sanctioned — expect your approver to ask why.
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border border-slate-200 px-3 py-2">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Claimed</p>
          <p className="text-lg font-black text-slate-800">{money(claimTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-3 py-2">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Advance Taken</p>
          <p className="text-lg font-black text-amber-600">− {money(advance)}</p>
        </div>
        <div className={`rounded-xl border px-3 py-2 ${net >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{net >= 0 ? 'Payable to you' : 'You must return'}</p>
          <p className={`text-lg font-black ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(Math.abs(net))}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Pre-travel cost estimate ──────────────────────────────────────────────────
   Lodging / food / local conveyance are seeded from the policy matrices for the
   employee's band × city grade × trip length. Ticket fare and miscellaneous are
   entered by the employee — the policy defines an entitled travel *class*, not
   rupee fares. Everything stays editable; over-ceiling values are flagged for
   the approver rather than blocked. */

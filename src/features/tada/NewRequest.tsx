/* The three request forms an employee can raise: a Tour Programme Sanction
   (pre-travel), a Travelling Expenses claim (post-travel, with bills), and a
   Local Travel claim. */
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Trash2, CheckCircle, FileText, Receipt, Car, AlertCircle, RefreshCw,
} from 'lucide-react';
import { API, LOCAL_MODES, LOCAL_TYPES, TIME_PREFS, TOUR_BLANK, blankLeg, fmt, journeyNoun, tripDays, type User } from './shared';
import { CapsBanner, Confetti, Toast } from './components';
import { SelectOther, TravelModePicker } from './TravelModePicker';
import { ItineraryEditor } from './ItineraryEditor';
import { BillCollector } from './BillCollector';
import { SettlementTable } from './PolicyBreakdown';
import { EstimateBlock } from './EstimateBlock';

export function NewRequest({ user, onDone }: { user: User; onDone: () => void }) {
  const [type, setType] = useState<'tour_sanction' | 'travel_expense' | 'local_travel'>('tour_sanction');
  /* Refresh the policy caps on mount. The user object is cached in
     localStorage at login, so a session opened before a policy change would
     otherwise keep showing stale limits and mode entitlements. */
  const [caps, setCaps] = useState<any>(user.caps);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/caps/?level=${encodeURIComponent(user.level || '')}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !cancelled) setCaps(d); })
      .catch(() => { /* keep the cached caps */ });
    return () => { cancelled = true; };
  }, [user.level]);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);
  const [formKey, setFormKey] = useState(0); // bump to remount SelectOther dropdowns after reset

  // celebrate on success → confetti + toast, then hand off after a beat
  const cheer = (message: string) => {
    setToast({ t: message || 'Submitted for approval 🎉', ok: true });
    setCelebrate(true); setFormKey(k => k + 1);
    setTimeout(() => setCelebrate(false), 1600);
    setTimeout(() => onDone(), 1500);
  };

  // tour sanction
  const [tour, setTour] = useState<any>(TOUR_BLANK);
  const [est, setEst] = useState<any>(null);      // policy estimate from the server
  const [multiCity, setMultiCity] = useState(false);
  const [legs, setLegs] = useState<any[]>([blankLeg()]);
  const seededRef = useRef<any>({});   // last policy figures written into the form
  // travel expense
  const [texp, setTexp] = useState<any>({ destination_city: '', from_date: '', to_date: '', purpose: '', sanction_number: '' });
  /* Approved trips still waiting on their bills. A claim filed against one is
     settled line by line against what was sanctioned, and the advance already
     drawn is netted off — so the claim form leads with picking that trip. */
  const [claimable, setClaimable] = useState<any[]>([]);
  const [sanctionId, setSanctionId] = useState<number | null>(null);
  const sanction = useMemo(() => claimable.find(s => s.id === sanctionId) || null, [claimable, sanctionId]);

  useEffect(() => {
    if (type !== 'travel_expense') return;
    let cancelled = false;
    fetch(`${API}/requests/claimable/?employee_id=${encodeURIComponent(user.employee_id)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !cancelled) setClaimable(d.sanctions || []); })
      .catch(() => { /* claiming without a sanction stays possible */ });
    return () => { cancelled = true; };
  }, [type, user.employee_id, formKey]);   // formKey bumps after a submit, refetching the list

  // Picking a trip fills in its details so they aren't retyped.
  const pickSanction = (s: any | null) => {
    setSanctionId(s ? s.id : null);
    setTexp((p: any) => ({
      ...p,
      destination_city: s ? s.destination_city : '',
      from_date: s ? s.from_date || '' : '',
      to_date: s ? s.to_date || '' : '',
      sanction_number: s ? s.sanction_number || '' : '',
      purpose: s ? s.purpose || '' : '',
    }));
  };

  const [items, setItems] = useState<any[]>([]);
  // local travel
  const [local, setLocal] = useState<any>({ local_travel_type: 'Outdoor Duty', from_date: '', to_date: '', purpose: '' });
  const [lrows, setLrows] = useState<any[]>([{ date: '', purpose: '', from_location: '', to_location: '', mode: 'Cab', km: '', amount: '' }]);

  // Claimed so far per category, for the sanctioned-vs-claimed table.
  const claimedByCat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) m[it.category] = (m[it.category] || 0) + (parseFloat(it.claimed_amount) || 0);
    return m;
  }, [items]);
  const claimTotal = useMemo(
    () => items.reduce((s: number, it: any) => s + (parseFloat(it.claimed_amount) || 0), 0), [items]);

  /* A standalone claim must carry a destination and dates — they are what the
     policy limits are derived from, and a claim nobody can measure is not
     reviewable. Filing against a sanction inherits them instead. */
  const claimIncomplete = !sanctionId && !(texp.destination_city && texp.from_date && texp.to_date);

  /* A claim filed without a sanction still has policy limits — they just come
     from what the employee types here rather than from an approved trip. This
     fetches them so the bill form shows entitlements either way; without it a
     standalone claim showed blank policy columns and looked broken. */
  const [loosePolicy, setLoosePolicy] = useState<any>(null);
  useEffect(() => {
    if (type !== 'travel_expense' || sanctionId) { setLoosePolicy(null); return; }
    const { destination_city, from_date, to_date } = texp;
    if (!destination_city || !from_date || !to_date) { setLoosePolicy(null); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`${API}/estimate/?` + new URLSearchParams({
        employee_id: user.employee_id, city: destination_city, from_date, to_date }))
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d || cancelled) return;
          setLoosePolicy({
            travel: null, misc: null,
            lodging: d.caps?.lodging ?? null, food: d.caps?.food ?? null,
            local_transport: d.caps?.local ?? null,
          });
        })
        .catch(() => { /* advisory only */ });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [type, sanctionId, texp.destination_city, texp.from_date, texp.to_date, user.employee_id]);

  /* Bills are collected per stop. A multi-city sanction gives one section per
     leg with that leg's own sanctioned heads; a single-destination trip gives
     one section carrying the whole estimate; a standalone claim gives one
     section whose limits come from the city and dates typed above. */
  const claimStops = useMemo(() => {
    if (sanction?.legs?.length) {
      return sanction.legs.map((l: any) => ({
        seq: l.seq,
        label: `Stop ${l.seq + 1} · ${l.destination_city}`,
        sub: `${l.from_date} → ${l.to_date}${l.days ? ` · ${l.days}d` : ''}${l.city_grade ? ` · grade ${l.city_grade}` : ''}`,
        heads: l.heads || {},
        policy: l.policy_heads || {},
      }));
    }
    return [{
      seq: null,
      label: sanction ? (sanction.destination_city || 'This trip') : (texp.destination_city || 'Expenses'),
      sub: sanction ? `${sanction.from_date} → ${sanction.to_date}`
        : (texp.from_date && texp.to_date ? `${texp.from_date} → ${texp.to_date}`
           : 'Add a destination and dates above to see your policy limits'),
      heads: sanction?.heads || {},
      policy: sanction?.policy_heads || loosePolicy || {},
    }];
  }, [sanction, loosePolicy, texp.destination_city, texp.from_date, texp.to_date]);

  /* Pull the policy estimate whenever destination / dates / mode change, and
     seed the lodging-food-local fields with the policy figure. The employee can
     override them; anything above the ceiling is flagged (here and again on the
     server, which recomputes rather than trusting what the browser posts). */
  /* Carry each leg's own index so the server can hand costs back to the right
     stop — it sorts legs by date internally, and incomplete legs are filtered
     out here, so position in this array is not a stable identity. */
  const readyLegs = useMemo(
    () => legs.map((l, i) => ({ ...l, seq: i }))
              .filter(l => l.destination_city && l.from_date && l.to_date),
    [legs]);

  useEffect(() => {
    if (type !== 'tour_sanction') return;
    const { destination_city, from_date, to_date, travel_mode } = tour;
    // Multi-city costs the itinerary; single-destination costs the one city.
    if (multiCity ? readyLegs.length === 0 : (!destination_city || !from_date || !to_date)) {
      setEst(null); return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = multiCity
          ? await fetch(`${API}/estimate/`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ employee_id: user.employee_id, from_date, to_date, legs: readyLegs }),
            })
          : await fetch(`${API}/estimate/?` + new URLSearchParams({
              employee_id: user.employee_id, city: destination_city,
              from_date, to_date, mode: travel_mode || '',
            }));
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        setEst(d);
        /* Re-seed the policy-driven heads. A field counts as untouched if it is
           still empty or still holds exactly what we last seeded into it — only
           then do we overwrite. Comparing against the previous seed (rather than
           just "is it empty") is what makes the figures follow a change of dates
           or destination; keying off empty alone left the first seeded number
           frozen in place while the policy hint beside it moved on. */
        setTour((prev: any) => {
          const next = { ...prev };
          const seeded = seededRef.current;
          for (const [key, val] of [
            ['est_lodging_amount', d.lines.lodging],
            ['est_food_amount', d.lines.food],
            ['est_local_amount', d.lines.local],
          ] as [string, number][]) {
            if (prev[key] === '' || prev[key] === seeded[key]) next[key] = String(val);
          }
          // In multi-city the fare is the sum of the per-stop fares, not an input.
          if (multiCity) next.est_ticket_amount = String(d.lines.ticket);
          seededRef.current = {
            est_lodging_amount: String(d.lines.lodging),
            est_food_amount: String(d.lines.food),
            est_local_amount: String(d.lines.local),
          };
          return next;
        });
      } catch { /* estimate is advisory — a failed fetch must not block the form */ }
    }, 300);   // debounce: cities are typed character by character
    return () => { cancelled = true; clearTimeout(t); };
  }, [type, multiCity, readyLegs, tour.destination_city, tour.from_date, tour.to_date, tour.travel_mode, user.employee_id]);

  // Running total of the estimate heads — what actually goes for approval.
  const estTotal = useMemo(() => {
    const n = (v: any) => parseFloat(v) || 0;
    return n(tour.est_ticket_amount) + n(tour.est_lodging_amount) + n(tour.est_food_amount)
         + n(tour.est_local_amount) + n(tour.est_misc_amount);
  }, [tour.est_ticket_amount, tour.est_lodging_amount, tour.est_food_amount, tour.est_local_amount, tour.est_misc_amount]);

  /* An advance may run a little over the estimate — trips do — but not
     unboundedly, since this is cash released before departure. Over the
     ceiling the form blocks submission rather than warning, matching the
     server, which refuses it outright. */
  const advanceTolerance = est?.advance_tolerance ?? 0.10;
  const maxAdvance = useMemo(() => Math.round(estTotal * (1 + advanceTolerance)), [estTotal, advanceTolerance]);
  const advanceOver = estTotal > 0 && (parseFloat(tour.advance_amount) || 0) > maxAdvance;

  // Client-side mirror of policy.validate_estimate — instant feedback only.
  const estWarnings = useMemo(() => {
    if (!est) return [];
    const out: string[] = [];
    const over = (val: any, cap: number | null, label: string) => {
      if (cap != null && (parseFloat(val) || 0) > cap) out.push(`${label} is above the policy ceiling of ₹${cap.toLocaleString('en-IN')}`);
    };
    over(tour.est_lodging_amount, est.caps?.lodging, 'Lodging');
    over(tour.est_food_amount, est.caps?.food, 'Food / DA');
    over(tour.est_local_amount, est.caps?.local, 'Conveyance');
    const legFlags = (est.legs || []).flatMap((l: any) =>
      (l.mode_flags || []).map((f: string) => `${l.city || `Stop ${l.seq + 1}`}: ${f}`));
    return [...out, ...(est.itinerary_flags || []), ...legFlags, ...(est.mode_flags || [])];
  }, [est, tour.est_lodging_amount, tour.est_food_amount, tour.est_local_amount]);

  const submitTour = async () => {
    setBusy(true); setMsg(null);
    const payload: any = { ...tour, employee_id: user.employee_id };
    if (multiCity) payload.legs = readyLegs;
    const r = await fetch(`${API}/requests/tour-sanction/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await r.json(); setMsg({ t: d.message || d.error, ok: r.ok }); setBusy(false);
    if (r.ok) { setTour(TOUR_BLANK); setEst(null); setLegs([blankLeg()]); setMultiCity(false); cheer(d.message); }
  };
  const submitTexp = async () => {
    setBusy(true); setMsg(null);
    const fd = new FormData();
    const payload = { ...texp, employee_id: user.employee_id, sanction_id: sanctionId,
                      items: items.map(({ bill, ...i }) => i) };
    fd.append('payload', JSON.stringify(payload));
    fd.append('employee_id', user.employee_id);
    items.forEach((it, i) => { if (it.bill) fd.append(`bill_${i}`, it.bill); });
    const r = await fetch(`${API}/requests/travel-expense/`, { method: 'POST', body: fd });
    const d = await r.json(); setMsg({ t: d.message || d.error, ok: r.ok }); setBusy(false);
    if (r.ok) { setItems([]); pickSanction(null); cheer(d.message); }
  };
  const submitLocal = async () => {
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.append('payload', JSON.stringify({ ...local, employee_id: user.employee_id, items: lrows }));
    fd.append('employee_id', user.employee_id);
    const r = await fetch(`${API}/requests/local-travel/`, { method: 'POST', body: fd });
    const d = await r.json(); setMsg({ t: d.message || d.error, ok: r.ok }); setBusy(false);
    if (r.ok) { setLrows([{ date: '', purpose: '', from_location: '', to_location: '', mode: 'Cab', km: '', amount: '' }]); cheer(d.message); }
  };

  const inp = 'w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all bg-slate-50/50 focus:bg-white';
  const CATS = [{ k: 'travel', l: 'Travel' }, { k: 'lodging', l: 'Lodging' }, { k: 'food', l: 'Food / DA' }, { k: 'local_transport', l: 'Conveyance' }, { k: 'misc', l: 'Miscellaneous' }];

  const TYPES = [
    { k: 'tour_sanction', l: 'Tour Programme Sanction', d: 'Pre-travel approval', i: FileText, grad: 'from-sky-500 to-blue-600' },
    { k: 'travel_expense', l: 'Travelling Expenses', d: 'Post-travel claim + bills', i: Receipt, grad: 'from-violet-500 to-indigo-600' },
    { k: 'local_travel', l: 'Local Travel', d: 'City conveyance', i: Car, grad: 'from-emerald-500 to-teal-600' },
  ];
  const active = TYPES.find(t => t.k === type)!;
  const formHead = (t: typeof TYPES[number]) => (
    <div className={`bg-gradient-to-r ${t.grad} rounded-2xl p-5 flex items-center gap-4 text-white relative overflow-hidden`}>
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shrink-0"><t.i className="w-6 h-6" /></div>
      <div className="relative"><h3 className="font-black text-lg leading-tight">{t.l}</h3><p className="text-white/80 text-sm">{t.d}</p></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Confetti show={celebrate} />
      {toast && <Toast msg={toast.t} ok={toast.ok} onClose={() => setToast(null)} />}
      <CapsBanner caps={caps} />
      <div className="grid sm:grid-cols-3 gap-3 stagger">
        {TYPES.map(t => (
          <button key={t.k} onClick={() => { setType(t.k as any); setMsg(null); }}
            className={`hover-lift text-left p-4 rounded-2xl border-2 transition-all ${type === t.k ? 'border-transparent bg-gradient-to-br ' + t.grad + ' text-white shadow-lg scale-[1.03]' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${type === t.k ? 'bg-white/20' : 'bg-slate-100'}`}><t.i className={`w-5 h-5 ${type === t.k ? 'text-white' : 'text-indigo-500'}`} /></div>
            <p className="font-black text-sm leading-tight">{t.l}</p>
            <p className={`text-xs mt-0.5 ${type === t.k ? 'text-white/80' : 'text-slate-400'}`}>{t.d}</p>
          </button>
        ))}
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>{msg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg.t}</div>}

      {type === 'tour_sanction' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-rise">
          {formHead(active)}
          <div className="grid md:grid-cols-2 gap-3">
            {/* Address and city belong to a destination, so in a multi-city trip
                they live on each stop instead of once on the request. */}
            {!multiCity && <div><label className="text-xs font-bold text-slate-500 mb-1 block">Destination City{est?.city_grade && <span className="ml-1.5 text-indigo-500">· grade {est.city_grade}</span>}</label><input className={inp} value={tour.destination_city} onChange={e => setTour({ ...tour, destination_city: e.target.value })} placeholder="e.g. Mumbai" /><p className="text-[11px] text-slate-400 mt-1">City only — this sets your stay and DA limits</p></div>}
            {!multiCity && <div><label className="text-xs font-bold text-slate-500 mb-1 block">Travel Address <span className="text-slate-300">(optional)</span></label><input className={inp} value={tour.travel_address} onChange={e => setTour({ ...tour, travel_address: e.target.value })} placeholder="office / site / hotel address" /></div>}
            <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">Purpose of Journey <span className="text-slate-300">{multiCity ? '(overall — each stop can add its own)' : ''}</span></label><input className={inp} value={tour.purpose} onChange={e => setTour({ ...tour, purpose: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">From Date</label><input type="date" className={inp} value={tour.from_date} onChange={e => setTour({ ...tour, from_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">To Date</label><input type="date" className={inp} value={tour.to_date} onChange={e => setTour({ ...tour, to_date: e.target.value })} /></div>
            {tripDays(tour.from_date, tour.to_date) !== null && (
              <div className="md:col-span-2 -mt-1 flex items-center justify-between flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">{tripDays(tour.from_date, tour.to_date)} day{tripDays(tour.from_date, tour.to_date) === 1 ? '' : 's'} of travel</span>
                {est && multiCity && (
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${est.total_days === tripDays(tour.from_date, tour.to_date) ? 'text-emerald-600 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                    {est.total_days} of {tripDays(tour.from_date, tour.to_date)} days assigned to a city
                  </span>
                )}
              </div>
            )}
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Contact Number</label><input className={inp} value={tour.contact_number} onChange={e => setTour({ ...tour, contact_number: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Sanction Number <span className="text-slate-300">(from manager)</span></label><input className={inp} value={tour.sanction_number} onChange={e => setTour({ ...tour, sanction_number: e.target.value })} /></div>
            <div className="md:col-span-2 pt-1">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-bold text-slate-600">Travelling to more than one city?</p>
                  <p className="text-[11px] text-slate-400">Break the trip into stops — each is costed at its own city grade.</p>
                </div>
                <button type="button" onClick={() => {
                  const on = !multiCity;
                  setMultiCity(on);
                  // Drop the fields that belong to the mode being left, so a
                  // leftover single-city destination can't shadow the itinerary.
                  setTour((p: any) => ({ ...p,
                    destination_city: on ? '' : p.destination_city,
                    travel_address: on ? '' : p.travel_address,
                    travel_mode: on ? '' : p.travel_mode, mode_exception_reason: '' }));
                  // first stop starts when the trip does — one less thing to retype
                  if (on) setLegs(ls => ls.map((l, i) => i === 0 && !l.from_date ? { ...l, from_date: tour.from_date } : l));
                  setEst(null);
                }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${multiCity ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                  {multiCity ? '✓ Multi-city trip' : 'Add stops'}
                </button>
              </div>
            </div>

            {!multiCity && (
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 mb-1 block">Travel Mode
                {caps?.approved_travel_mode && <span className="text-slate-300 font-semibold"> · your grade allows {caps.approved_travel_mode}</span>}
              </label>
              <TravelModePicker key={formKey} className={inp} value={tour.travel_mode}
                onChange={v => setTour({ ...tour, travel_mode: v, mode_exception_reason: '' })}
                options={caps?.mode_options}
                reason={tour.mode_exception_reason}
                onReason={v => setTour({ ...tour, mode_exception_reason: v })} />
            </div>
            )}
            {!multiCity && tour.travel_mode && (
              <>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Onward {journeyNoun(tour.travel_mode)} Date <span className="text-slate-300">({tour.travel_mode})</span></label><input type="date" className={inp} value={tour.travel_mode_date} onChange={e => setTour({ ...tour, travel_mode_date: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Onward Preferred Time</label>
                  <select className={inp} value={tour.travel_mode_time_pref} onChange={e => setTour({ ...tour, travel_mode_time_pref: e.target.value })}>
                    <option value="">Select time…</option>
                    {TIME_PREFS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Return {journeyNoun(tour.travel_mode)} Date <span className="text-slate-300">({tour.travel_mode})</span></label><input type="date" className={inp} value={tour.return_mode_date} onChange={e => setTour({ ...tour, return_mode_date: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Return Preferred Time</label>
                  <select className={inp} value={tour.return_mode_time_pref} onChange={e => setTour({ ...tour, return_mode_time_pref: e.target.value })}>
                    <option value="">Select time…</option>
                    {TIME_PREFS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          {multiCity && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-black text-slate-700 text-sm">Itinerary</h4>
                <span className="text-[11px] text-slate-400">in the order you travel</span>
              </div>
              <ItineraryEditor legs={legs} setLegs={setLegs} modeOptions={caps?.mode_options} est={est} inp={inp}
                tripFrom={tour.from_date} tripTo={tour.to_date} />

              <div className="grid md:grid-cols-2 gap-3 bg-slate-50/70 border border-slate-200 rounded-2xl p-4">
                <div className="md:col-span-2"><p className="text-xs font-bold text-slate-600">Journey home</p><p className="text-[11px] text-slate-400">Your return from the last stop</p></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Return {journeyNoun(legs[legs.length - 1]?.travel_mode)} Date</label><input type="date" className={inp} value={tour.return_mode_date} min={tour.from_date} max={tour.to_date} onChange={e => setTour({ ...tour, return_mode_date: e.target.value })} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Return Preferred Time</label>
                  <select className={inp} value={tour.return_mode_time_pref} onChange={e => setTour({ ...tour, return_mode_time_pref: e.target.value })}>
                    <option value="">Select time…</option>
                    {TIME_PREFS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          <EstimateBlock est={est} tour={tour} setTour={setTour} total={estTotal} warnings={estWarnings} inp={inp}
            maxAdvance={maxAdvance} advanceOver={advanceOver} />

          <button onClick={submitTour} disabled={busy || advanceOver} className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all">{busy ? <><RefreshCw className="w-4 h-4 animate-spin" />Submitting…</> : <><CheckCircle className="w-4 h-4" />Submit for Approval</>}</button>
        </div>
      )}

      {type === 'travel_expense' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-rise">
          {formHead(active)}

          {/* Which approved trip these bills belong to. Filing against the
              sanction is what lets the approver see estimate vs actual and
              net off the advance already paid. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-black text-slate-600">Which trip are you claiming for?</p>
              {claimable.length > 0 && <span className="text-[11px] font-bold text-indigo-500">{claimable.length} approved trip{claimable.length === 1 ? '' : 's'} awaiting bills</span>}
            </div>

            {claimable.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl px-3 py-2.5">
                <p className="text-xs text-slate-500 font-semibold">No approved trips waiting on bills</p>
                <p className="text-[11px] text-slate-400 mt-0.5">You can still file a standalone claim below for travel that wasn't pre-sanctioned.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {claimable.map(s => {
                  const on = s.id === sanctionId;
                  return (
                    <button key={s.id} type="button" onClick={() => pickSanction(on ? null : s)}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${on
                        ? 'border-indigo-500 bg-indigo-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-sm text-slate-800 truncate">{s.destination_city || 'Trip'}</p>
                        {on && <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{s.from_date} → {s.to_date}{s.number_of_days ? ` · ${s.number_of_days}d` : ''}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5 text-[11px] font-bold">
                        <span className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">Est ₹{fmt(s.estimate_amount)}</span>
                        {s.advance_amount > 0 && <span className="bg-amber-50 text-amber-700 rounded px-1.5 py-0.5">Advance ₹{fmt(s.advance_amount)}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-4 gap-3">
            {/* Without a sanction these are what policy is derived from, so they
                are required rather than optional detail. */}
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Destination City {!sanctionId && <span className="text-rose-500">*</span>}</label><input className={inp} value={texp.destination_city} onChange={e => setTexp({ ...texp, destination_city: e.target.value })} placeholder="e.g. Mumbai" /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">From {!sanctionId && <span className="text-rose-500">*</span>}</label><input type="date" className={inp} value={texp.from_date} onChange={e => setTexp({ ...texp, from_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">To {!sanctionId && <span className="text-rose-500">*</span>}</label><input type="date" className={inp} value={texp.to_date} onChange={e => setTexp({ ...texp, to_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Sanction No.</label><input className={inp} value={texp.sanction_number} onChange={e => setTexp({ ...texp, sanction_number: e.target.value })} /></div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-xs text-rose-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><b>ATTENTION:</b>&nbsp;Attaching bills/invoices is mandatory. Bills must show <b>Apis India Ltd</b> &amp; GSTIN <b>05AAACM0656K1ZL</b>. No bill → no approval.</div>
          <BillCollector stops={claimStops} heads={CATS} items={items} setItems={setItems} inp={inp} />
          {sanction && <SettlementTable sanction={sanction} claimedByCat={claimedByCat} claimTotal={claimTotal} />}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="font-black text-slate-700 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">Total Claim: ₹{fmt(items.reduce((s, i) => s + (Number(i.claimed_amount) || 0), 0))}</span>
            <button onClick={submitTexp} disabled={busy || items.length === 0 || claimIncomplete} className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all">{busy ? <><RefreshCw className="w-4 h-4 animate-spin" />Submitting…</> : <><CheckCircle className="w-4 h-4" />Save &amp; Submit</>}</button>
          </div>
        </div>
      )}

      {type === 'local_travel' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-rise">
          {formHead(active)}
          <div className="grid md:grid-cols-4 gap-3">
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Travel Type</label>
              <SelectOther key={formKey} className={inp} value={local.local_travel_type} onChange={v => setLocal({ ...local, local_travel_type: v })} options={LOCAL_TYPES} placeholder="Select type…" /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">From</label><input type="date" className={inp} value={local.from_date} onChange={e => setLocal({ ...local, from_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">To</label><input type="date" className={inp} value={local.to_date} onChange={e => setLocal({ ...local, to_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Daily Cap</label><div className="w-full border-2 border-emerald-100 bg-emerald-50 rounded-xl px-3 py-2.5 text-sm font-black text-emerald-700">₹{user.caps?.local_conveyance_daily ?? '—'} <span className="font-medium text-emerald-500 text-xs">/ day</span></div></div>
          </div>
          <div className="space-y-3">
            {lrows.map((it, i) => (
              <div key={i} className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">Journey {i + 1}</span>
                  {lrows.length > 1 && <button onClick={() => setLrows(lrows.filter((_, j) => j !== i))} className="text-rose-400 hover:text-rose-600 flex items-center gap-1 text-xs font-bold"><Trash2 className="w-4 h-4" />Remove</button>}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="lg:col-span-1"><label className="text-xs font-bold text-slate-500 mb-1 block">Date</label><input type="date" className={inp} value={it.date} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} /></div>
                  <div className="col-span-2 lg:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">Purpose</label><input className={inp} value={it.purpose} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, purpose: e.target.value } : x))} placeholder="e.g. Client meeting" /></div>
                  <div className="lg:col-span-1"><label className="text-xs font-bold text-slate-500 mb-1 block">From</label><input className={inp} value={it.from_location} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, from_location: e.target.value } : x))} /></div>
                  <div className="lg:col-span-1"><label className="text-xs font-bold text-slate-500 mb-1 block">To</label><input className={inp} value={it.to_location} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, to_location: e.target.value } : x))} /></div>
                  <div className="lg:col-span-1"><label className="text-xs font-bold text-slate-500 mb-1 block">Mode</label><SelectOther key={formKey} className={inp} value={it.mode} onChange={v => setLrows(lrows.map((x, j) => j === i ? { ...x, mode: v } : x))} options={LOCAL_MODES} placeholder="Mode…" /></div>
                  <div className="col-span-2 lg:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">Amount ₹</label><input type="number" className={inp} value={it.amount} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} placeholder="0" /></div>
                </div>
              </div>
            ))}
            <button onClick={() => setLrows([...lrows, { date: '', purpose: '', from_location: '', to_location: '', mode: 'Cab', km: '', amount: '' }])} className="flex items-center justify-center gap-1.5 w-full border-2 border-dashed border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-xl py-2.5 text-sm font-bold transition-all"><Plus className="w-4 h-4" />Add Journey</button>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="font-black text-slate-700 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">Total: ₹{fmt(lrows.reduce((s, i) => s + (Number(i.amount) || 0), 0))}</span>
            <button onClick={submitLocal} disabled={busy} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all">{busy ? <><RefreshCw className="w-4 h-4 animate-spin" />Submitting…</> : <><CheckCircle className="w-4 h-4" />Save &amp; Submit</>}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Request detail (shared) ───────────────────────────────────────────────────

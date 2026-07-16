import { useState, useEffect } from 'react';
import {
  Plane, LogOut, Plus, Trash2, Upload, CheckCircle, XCircle, Clock, FileText,
  Receipt, Car, AlertCircle, RefreshCw, ChevronLeft, Paperclip, Users, Shield,
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/tada`;
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);

type User = {
  id: number; employee_id: string; name: string; role: string; level: string;
  designation: string; department: string; hq_city: string; caps: any;
};

const STATUS_STYLE: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-700', manager_approved: 'bg-blue-100 text-blue-700',
  hr_approved: 'bg-violet-100 text-violet-700', finance_approved: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-emerald-600 text-white',
  manager_rejected: 'bg-rose-100 text-rose-700', hr_rejected: 'bg-rose-100 text-rose-700',
  finance_rejected: 'bg-rose-100 text-rose-700', draft: 'bg-slate-100 text-slate-600',
};

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [empId, setEmpId] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'id' | 'otp'>('id');
  const [msg, setMsg] = useState('');
  const [masked, setMasked] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`${API}/auth/send-otp/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: empId.trim() }) });
      const d = await r.json();
      if (r.ok) { setStep('otp'); setMasked(d.masked_email); } else setMsg(d.error || 'Failed');
    } catch { setMsg('Network error'); }
    setBusy(false);
  };
  const verify = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`${API}/auth/verify-otp/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: empId.trim(), otp: otp.trim() }) });
      const d = await r.json();
      if (r.ok) { localStorage.setItem('tada_user', JSON.stringify(d.user)); onLogin(d.user); } else setMsg(d.error || 'Failed');
    } catch { setMsg('Network error'); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><Plane className="w-6 h-6 text-white" /></div>
          <div><h1 className="font-black text-slate-800 text-xl">APIS TA/DA Portal</h1><p className="text-slate-400 text-xs">Travel & Daily Allowance</p></div>
        </div>
        {step === 'id' ? (
          <>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Employee ID</label>
            <input value={empId} onChange={e => setEmpId(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="e.g. E1001"
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:border-indigo-400" />
            <button onClick={send} disabled={busy || !empId.trim()} className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-3">OTP sent to <b>{masked}</b></p>
            <input value={otp} onChange={e => setOtp(e.target.value)} onKeyDown={e => e.key === 'Enter' && verify()} placeholder="6-digit OTP" maxLength={6}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 mb-3 text-center text-2xl tracking-widest font-black focus:outline-none focus:border-indigo-400" />
            <button onClick={verify} disabled={busy || otp.length < 4} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify & Login'}
            </button>
            <button onClick={() => setStep('id')} className="w-full text-slate-400 text-xs mt-2">← Change Employee ID</button>
          </>
        )}
        {msg && <p className="text-rose-500 text-sm mt-3 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{msg}</p>}
      </div>
    </div>
  );
}

// ── Caps banner (shows the employee their policy limits) ──────────────────────
function CapsBanner({ caps }: { caps: any }) {
  if (!caps?.band) return <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">No policy band mapped for your level ({caps?.level || '—'}). Contact HR.</div>;
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-100 rounded-2xl p-4">
      <p className="text-xs font-black text-indigo-600 uppercase tracking-wide mb-2">Your Policy Limits · Band {caps.band}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div><p className="text-slate-400">Daily Conveyance</p><p className="font-black text-slate-700">₹{caps.local_conveyance_daily ?? '—'}</p></div>
        <div><p className="text-slate-400">Phone/Internet (mo)</p><p className="font-black text-slate-700">₹{caps.phone_monthly ?? '—'}</p></div>
        <div className="col-span-2"><p className="text-slate-400">Approved Mode</p><p className="font-black text-slate-700">{caps.approved_travel_mode || '—'}</p></div>
      </div>
      {caps.da_matrix && caps.da_matrix.A && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
          {['A', 'B', 'C'].map(g => caps.da_matrix[g] && (
            <div key={g} className="bg-white rounded-lg px-2 py-1 border border-indigo-100">
              <span className="font-bold text-indigo-500">City {g}:</span> Stay ₹{caps.da_matrix[g][0]} · DA ₹{caps.da_matrix[g][1]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
const Pill = ({ s, label }: { s: string; label: string }) => (
  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLE[s] || 'bg-slate-100 text-slate-600'}`}>{label}</span>
);

// ── Employee: New Request forms ───────────────────────────────────────────────
function NewRequest({ user, onDone }: { user: User; onDone: () => void }) {
  const [type, setType] = useState<'tour_sanction' | 'travel_expense' | 'local_travel'>('tour_sanction');
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  // tour sanction
  const [tour, setTour] = useState<any>({ travel_address: '', purpose: '', destination_city: '', from_date: '', to_date: '', contact_number: '', sanction_number: '', estimate_amount: '', travel_mode: '' });
  // travel expense
  const [texp, setTexp] = useState<any>({ destination_city: '', from_date: '', to_date: '', purpose: '', sanction_number: '' });
  const [items, setItems] = useState<any[]>([{ category: 'travel', date: '', description: '', from_location: '', to_location: '', mode: '', km: '', claimed_amount: '', bill: null }]);
  // local travel
  const [local, setLocal] = useState<any>({ local_travel_type: 'Outdoor Duty', from_date: '', to_date: '', purpose: '' });
  const [lrows, setLrows] = useState<any[]>([{ date: '', purpose: '', from_location: '', to_location: '', mode: 'Cab', km: '', amount: '' }]);

  const submitTour = async () => {
    setBusy(true); setMsg(null);
    const r = await fetch(`${API}/requests/tour-sanction/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...tour, employee_id: user.employee_id }) });
    const d = await r.json(); setMsg({ t: d.message || d.error, ok: r.ok }); setBusy(false);
    if (r.ok) { setTour({ travel_address: '', purpose: '', destination_city: '', from_date: '', to_date: '', contact_number: '', sanction_number: '', estimate_amount: '', travel_mode: '' }); onDone(); }
  };
  const submitTexp = async () => {
    setBusy(true); setMsg(null);
    const fd = new FormData();
    const payload = { ...texp, employee_id: user.employee_id, items: items.map(({ bill, ...i }) => i) };
    fd.append('payload', JSON.stringify(payload));
    fd.append('employee_id', user.employee_id);
    items.forEach((it, i) => { if (it.bill) fd.append(`bill_${i}`, it.bill); });
    const r = await fetch(`${API}/requests/travel-expense/`, { method: 'POST', body: fd });
    const d = await r.json(); setMsg({ t: d.message || d.error, ok: r.ok }); setBusy(false);
    if (r.ok) { setItems([{ category: 'travel', date: '', description: '', from_location: '', to_location: '', mode: '', km: '', claimed_amount: '', bill: null }]); onDone(); }
  };
  const submitLocal = async () => {
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.append('payload', JSON.stringify({ ...local, employee_id: user.employee_id, items: lrows }));
    fd.append('employee_id', user.employee_id);
    const r = await fetch(`${API}/requests/local-travel/`, { method: 'POST', body: fd });
    const d = await r.json(); setMsg({ t: d.message || d.error, ok: r.ok }); setBusy(false);
    if (r.ok) { setLrows([{ date: '', purpose: '', from_location: '', to_location: '', mode: 'Cab', km: '', amount: '' }]); onDone(); }
  };

  const inp = 'w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400';
  const CATS = [{ k: 'travel', l: 'Travel Details' }, { k: 'lodging', l: 'Lodging' }, { k: 'food', l: 'Food / DA' }, { k: 'local_transport', l: 'Local Transport' }, { k: 'misc', l: 'Miscellaneous' }];

  return (
    <div className="space-y-4">
      <CapsBanner caps={user.caps} />
      <div className="flex gap-2 flex-wrap">
        {[{ k: 'tour_sanction', l: 'Tour Programme Sanction', i: FileText }, { k: 'travel_expense', l: 'Travelling Expenses', i: Receipt }, { k: 'local_travel', l: 'Local Travel', i: Car }].map(t => (
          <button key={t.k} onClick={() => { setType(t.k as any); setMsg(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${type === t.k ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-500'}`}>
            <t.i className="w-4 h-4" />{t.l}
          </button>
        ))}
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>{msg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg.t}</div>}

      {type === 'tour_sanction' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="font-black text-slate-800">Tour Programme Sanction (Pre-Travel)</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-500">Travel Address</label><input className={inp} value={tour.travel_address} onChange={e => setTour({ ...tour, travel_address: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500">Destination City</label><input className={inp} value={tour.destination_city} onChange={e => setTour({ ...tour, destination_city: e.target.value })} placeholder="e.g. Mumbai" /></div>
            <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500">Purpose of Journey</label><input className={inp} value={tour.purpose} onChange={e => setTour({ ...tour, purpose: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500">From Date</label><input type="date" className={inp} value={tour.from_date} onChange={e => setTour({ ...tour, from_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500">To Date</label><input type="date" className={inp} value={tour.to_date} onChange={e => setTour({ ...tour, to_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500">Contact Number</label><input className={inp} value={tour.contact_number} onChange={e => setTour({ ...tour, contact_number: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500">Sanction Number <span className="text-slate-300">(from manager)</span></label><input className={inp} value={tour.sanction_number} onChange={e => setTour({ ...tour, sanction_number: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500">Estimate of Expenses (₹)</label><input type="number" className={inp} value={tour.estimate_amount} onChange={e => setTour({ ...tour, estimate_amount: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500">Travel Mode</label><input className={inp} value={tour.travel_mode} onChange={e => setTour({ ...tour, travel_mode: e.target.value })} placeholder="Train / Air / Bus" /></div>
          </div>
          <button onClick={submitTour} disabled={busy} className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50">{busy ? 'Submitting…' : 'Submit for Approval'}</button>
        </div>
      )}

      {type === 'travel_expense' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="font-black text-slate-800">Travelling Expenses (Post-Travel Claim)</h3>
          <div className="grid md:grid-cols-4 gap-3">
            <div><label className="text-xs font-bold text-slate-500">Destination City</label><input className={inp} value={texp.destination_city} onChange={e => setTexp({ ...texp, destination_city: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500">From</label><input type="date" className={inp} value={texp.from_date} onChange={e => setTexp({ ...texp, from_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500">To</label><input type="date" className={inp} value={texp.to_date} onChange={e => setTexp({ ...texp, to_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500">Sanction No.</label><input className={inp} value={texp.sanction_number} onChange={e => setTexp({ ...texp, sanction_number: e.target.value })} /></div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-xs text-rose-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><b>ATTENTION:</b>&nbsp;Attaching bills/invoices is mandatory. Bills must show <b>Apis India Ltd</b> &amp; GSTIN <b>05AAACM0656K1ZL</b>. No bill → no approval.</div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="border-2 border-slate-100 rounded-xl p-3 grid md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400">Category</label>
                  <select className={inp} value={it.category} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}>{CATS.map(c => <option key={c.k} value={c.k}>{c.l}</option>)}</select></div>
                <div className="md:col-span-1"><label className="text-[10px] font-bold text-slate-400">Date</label><input type="date" className={inp} value={it.date} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} /></div>
                <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400">Description</label><input className={inp} value={it.description} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} /></div>
                <div className="md:col-span-1"><label className="text-[10px] font-bold text-slate-400">From</label><input className={inp} value={it.from_location} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, from_location: e.target.value } : x))} /></div>
                <div className="md:col-span-1"><label className="text-[10px] font-bold text-slate-400">To</label><input className={inp} value={it.to_location} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, to_location: e.target.value } : x))} /></div>
                <div className="md:col-span-1"><label className="text-[10px] font-bold text-slate-400">Mode</label><input className={inp} value={it.mode} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, mode: e.target.value } : x))} /></div>
                <div className="md:col-span-1"><label className="text-[10px] font-bold text-slate-400">Amount ₹</label><input type="number" className={inp} value={it.claimed_amount} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, claimed_amount: e.target.value } : x))} /></div>
                <div className="md:col-span-2 flex items-center gap-1">
                  <label className={`flex-1 flex items-center gap-1 px-2 py-2 rounded-xl border-2 text-xs cursor-pointer ${it.bill ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-400'}`}>
                    <Paperclip className="w-3.5 h-3.5" />{it.bill ? 'Bill ✓' : 'Attach Bill'}
                    <input type="file" className="hidden" onChange={e => setItems(items.map((x, j) => j === i ? { ...x, bill: e.target.files?.[0] || null } : x))} />
                  </label>
                  {items.length > 1 && <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-rose-400 p-1"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
            <button onClick={() => setItems([...items, { category: 'travel', date: '', description: '', from_location: '', to_location: '', mode: '', km: '', claimed_amount: '', bill: null }])} className="flex items-center gap-1 text-indigo-500 text-sm font-bold"><Plus className="w-4 h-4" />Add Expense Line</button>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-bold text-slate-600">Total Claim: ₹{fmt(items.reduce((s, i) => s + (Number(i.claimed_amount) || 0), 0))}</span>
            <button onClick={submitTexp} disabled={busy} className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50">{busy ? 'Submitting…' : 'Save & Submit'}</button>
          </div>
        </div>
      )}

      {type === 'local_travel' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="font-black text-slate-800">Local Travel (City Conveyance)</h3>
          <div className="grid md:grid-cols-4 gap-3">
            <div><label className="text-xs font-bold text-slate-500">Travel Type</label>
              <select className={inp} value={local.local_travel_type} onChange={e => setLocal({ ...local, local_travel_type: e.target.value })}><option>Outdoor Duty</option><option>Office Work</option><option>Client Visit</option><option>Bank/Govt Work</option></select></div>
            <div><label className="text-xs font-bold text-slate-500">From</label><input type="date" className={inp} value={local.from_date} onChange={e => setLocal({ ...local, from_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500">To</label><input type="date" className={inp} value={local.to_date} onChange={e => setLocal({ ...local, to_date: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500">Daily Cap</label><p className="px-3 py-2 font-black text-slate-700">₹{user.caps?.local_conveyance_daily ?? '—'}</p></div>
          </div>
          <div className="space-y-2">
            {lrows.map((it, i) => (
              <div key={i} className="border-2 border-slate-100 rounded-xl p-3 grid md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400">Date</label><input type="date" className={inp} value={it.date} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} /></div>
                <div className="md:col-span-3"><label className="text-[10px] font-bold text-slate-400">Purpose</label><input className={inp} value={it.purpose} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, purpose: e.target.value } : x))} /></div>
                <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400">From</label><input className={inp} value={it.from_location} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, from_location: e.target.value } : x))} /></div>
                <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400">To</label><input className={inp} value={it.to_location} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, to_location: e.target.value } : x))} /></div>
                <div className="md:col-span-1"><label className="text-[10px] font-bold text-slate-400">Mode</label><input className={inp} value={it.mode} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, mode: e.target.value } : x))} /></div>
                <div className="md:col-span-2 flex items-end gap-1"><div className="flex-1"><label className="text-[10px] font-bold text-slate-400">Amount ₹</label><input type="number" className={inp} value={it.amount} onChange={e => setLrows(lrows.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} /></div>
                  {lrows.length > 1 && <button onClick={() => setLrows(lrows.filter((_, j) => j !== i))} className="text-rose-400 p-2"><Trash2 className="w-4 h-4" /></button>}</div>
              </div>
            ))}
            <button onClick={() => setLrows([...lrows, { date: '', purpose: '', from_location: '', to_location: '', mode: 'Cab', km: '', amount: '' }])} className="flex items-center gap-1 text-indigo-500 text-sm font-bold"><Plus className="w-4 h-4" />Add Journey</button>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-bold text-slate-600">Total: ₹{fmt(lrows.reduce((s, i) => s + (Number(i.amount) || 0), 0))}</span>
            <button onClick={submitLocal} disabled={busy} className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl disabled:opacity-50">{busy ? 'Submitting…' : 'Save & Submit'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Request detail (shared) ───────────────────────────────────────────────────
function Detail({ id, user, onBack, onActioned }: { id: number; user: User; onBack: () => void; onActioned?: () => void }) {
  const [r, setR] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => fetch(`${API}/requests/${id}/`).then(x => x.json()).then(setR);
  useEffect(() => { load(); }, [id]);
  if (!r) return <div className="p-8 text-center text-slate-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>;

  const canAct = (user.role === 'manager' && r.status === 'submitted') || (user.role === 'hr' && r.status === 'manager_approved') || (user.role === 'finance' && r.status === 'hr_approved');
  const canPay = user.role === 'finance' && r.status === 'finance_approved';
  const act = async (action: string) => {
    setBusy(true);
    const res = await fetch(`${API}/requests/${id}/action/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: user.employee_id, action, remarks }) });
    if (res.ok) { await load(); onActioned && onActioned(); }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-slate-500 text-sm font-bold"><ChevronLeft className="w-4 h-4" />Back</button>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex justify-between items-start mb-3">
          <div><h3 className="font-black text-slate-800 text-lg">{r.type_label}</h3><p className="text-slate-400 text-sm">{r.employee_name} · {r.employee_id} · {r.department} · Level {r.level}</p></div>
          <Pill s={r.status} label={r.status_label} />
        </div>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          {r.purpose && <div><p className="text-slate-400 text-xs">Purpose</p><p className="font-semibold">{r.purpose}</p></div>}
          {r.destination_city && <div><p className="text-slate-400 text-xs">Destination</p><p className="font-semibold">{r.destination_city} <span className="text-indigo-500">(Grade {r.city_grade})</span></p></div>}
          {(r.from_date || r.to_date) && <div><p className="text-slate-400 text-xs">Dates</p><p className="font-semibold">{r.from_date} → {r.to_date}</p></div>}
          {r.sanction_number && <div><p className="text-slate-400 text-xs">Sanction No.</p><p className="font-semibold">{r.sanction_number}</p></div>}
          {r.travel_mode && <div><p className="text-slate-400 text-xs">Mode</p><p className="font-semibold">{r.travel_mode}</p></div>}
          {r.estimate_amount > 0 && <div><p className="text-slate-400 text-xs">Estimate</p><p className="font-semibold">₹{fmt(r.estimate_amount)}</p></div>}
          {r.total_claimed > 0 && <div><p className="text-slate-400 text-xs">Total Claimed</p><p className="font-black text-slate-800">₹{fmt(r.total_claimed)}</p></div>}
        </div>
      </div>

      {r.expense_items?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-x-auto">
          <h4 className="font-black text-slate-700 mb-3">Expense Items</h4>
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
              <button onClick={() => act('approve')} disabled={busy} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl disabled:opacity-50"><CheckCircle className="w-4 h-4" />Approve</button>
              <button onClick={() => act('reject')} disabled={busy} className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2.5 rounded-xl disabled:opacity-50"><XCircle className="w-4 h-4" />Reject</button>
            </>}
            {canPay && <button onClick={() => act('paid')} disabled={busy} className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl disabled:opacity-50">💰 Mark as Paid</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Request list card ─────────────────────────────────────────────────────────
function ReqCard({ r, onClick }: { r: any; onClick: () => void }) {
  const Icon = r.type === 'tour_sanction' ? FileText : r.type === 'travel_expense' ? Receipt : Car;
  return (
    <button onClick={onClick} className="w-full text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md p-4 flex items-center gap-3 transition-all">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white shrink-0"><Icon className="w-5 h-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-800 text-sm truncate">{r.type_label} {r.destination_city && `· ${r.destination_city}`}</p>
        <p className="text-slate-400 text-xs">{r.employee_name} · {r.created_at} {r.total_claimed > 0 && `· ₹${fmt(r.total_claimed)}`}</p>
      </div>
      <Pill s={r.status} label={r.status_label} />
    </button>
  );
}

// ── Approver dashboard ────────────────────────────────────────────────────────
function ApproverBoard({ user }: { user: User }) {
  const [data, setData] = useState<any>({ pending: [], processed: [] });
  const [sel, setSel] = useState<number | null>(null);
  const load = () => fetch(`${API}/queue/?employee_id=${user.employee_id}`).then(r => r.json()).then(setData);
  useEffect(() => { load(); }, []);
  if (sel) return <Detail id={sel} user={user} onBack={() => { setSel(null); load(); }} onActioned={load} />;
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" />Pending Your Action ({data.pending.length})</h3>
        <div className="space-y-2">{data.pending.map((r: any) => <ReqCard key={r.id} r={r} onClick={() => setSel(r.id)} />)}
          {data.pending.length === 0 && <p className="text-slate-300 text-sm bg-white rounded-2xl border border-slate-100 p-6 text-center">Nothing pending 🎉</p>}</div>
      </div>
      <div>
        <h3 className="font-black text-slate-800 mb-3">Processed</h3>
        <div className="space-y-2">{data.processed.map((r: any) => <ReqCard key={r.id} r={r} onClick={() => setSel(r.id)} />)}
          {data.processed.length === 0 && <p className="text-slate-300 text-sm">None yet.</p>}</div>
      </div>
    </div>
  );
}

// ── Admin: user import ────────────────────────────────────────────────────────
function AdminUsers() {
  const [msg, setMsg] = useState('');
  const [count, setCount] = useState(0);
  const load = () => fetch(`${API}/users/`).then(r => r.json()).then(d => setCount(d.total));
  useEffect(() => { load(); }, []);
  const imp = async (e: any) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f);
    const r = await fetch(`${API}/users/import/`, { method: 'POST', body: fd });
    const d = await r.json(); setMsg(d.message || d.error); load(); e.target.value = '';
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
      <h3 className="font-black text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" />TA/DA User Directory ({count})</h3>
      <p className="text-slate-500 text-sm">Import the user list (Employee ID, Name, Email, Level M1-M7/E1-E4, Role: employee/manager/hr/finance, Reporting Manager ID).</p>
      <div className="flex gap-2">
        <a href={`${API}/users/template/`} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold"><FileText className="w-4 h-4" />Download Template</a>
        <label className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-bold cursor-pointer"><Upload className="w-4 h-4" />Import Users<input type="file" accept=".xlsx" className="hidden" onChange={imp} /></label>
      </div>
      {msg && <p className="text-emerald-600 text-sm font-semibold">{msg}</p>}
    </div>
  );
}

// ── Portal shell ──────────────────────────────────────────────────────────────
function Portal({ user, onLogout, onNavigateBack }: { user: User; onLogout: () => void; onNavigateBack?: () => void }) {
  const isApprover = ['manager', 'hr', 'finance'].includes(user.role);
  const [tab, setTab] = useState<string>(isApprover ? 'approvals' : 'new');
  const [refresh, setRefresh] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [mine, setMine] = useState<any[]>([]);
  useEffect(() => { if (tab === 'mine') fetch(`${API}/requests/mine/?employee_id=${user.employee_id}`).then(r => r.json()).then(d => setMine(d.requests || [])); }, [tab, refresh]);

  const tabs = user.role === 'admin'
    ? [{ k: 'users', l: 'Users', i: Users }]
    : isApprover
      ? [{ k: 'approvals', l: 'Approvals', i: Shield }, { k: 'new', l: 'My New Request', i: Plus }, { k: 'mine', l: 'My Requests', i: FileText }]
      : [{ k: 'new', l: 'New Request', i: Plus }, { k: 'mine', l: 'My Requests', i: FileText }];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-sky-600 to-indigo-700 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-4">
          {onNavigateBack && <button onClick={onNavigateBack} className="text-white/70 hover:text-white"><ChevronLeft className="w-5 h-5" /></button>}
          <Plane className="w-6 h-6" />
          <div className="flex-1"><h1 className="font-black">APIS TA/DA Portal</h1><p className="text-white/70 text-xs">{user.name} · {user.designation} · Level {user.level} · <span className="uppercase font-bold">{user.role}</span></p></div>
          <button onClick={onLogout} className="flex items-center gap-1 text-white/80 hover:text-white text-sm"><LogOut className="w-4 h-4" />Logout</button>
        </div>
        <div className="max-w-6xl mx-auto px-5 flex gap-1">
          {tabs.map(t => <button key={t.k} onClick={() => { setTab(t.k); setSel(null); }} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${tab === t.k ? 'border-white text-white' : 'border-transparent text-white/60 hover:text-white'}`}><t.i className="w-4 h-4" />{t.l}</button>)}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-6">
        {tab === 'users' && <AdminUsers />}
        {tab === 'approvals' && <ApproverBoard user={user} />}
        {tab === 'new' && <NewRequest user={user} onDone={() => { setRefresh(x => x + 1); setTab('mine'); }} />}
        {tab === 'mine' && (sel ? <Detail id={sel} user={user} onBack={() => setSel(null)} /> : (
          <div className="space-y-2">
            {mine.map(r => <ReqCard key={r.id} r={r} onClick={() => setSel(r.id)} />)}
            {mine.length === 0 && <p className="text-slate-300 text-center py-10">No requests yet. Create one from "New Request".</p>}
          </div>
        ))}
      </main>
    </div>
  );
}

export function TadaPage({ onNavigateBack }: { onNavigateBack?: () => void }) {
  const [user, setUser] = useState<User | null>(() => { try { return JSON.parse(localStorage.getItem('tada_user') || 'null'); } catch { return null; } });
  const logout = () => { localStorage.removeItem('tada_user'); setUser(null); };
  if (!user) return <Login onLogin={setUser} />;
  return <Portal user={user} onLogout={logout} onNavigateBack={onNavigateBack} />;
}

export default TadaPage;

/* Goal Setting Hub — the product's front door and its role router.
 *
 * Signs in the way Appraisal Hub does (employee ID + a code by email), because
 * this product carries its own employee master and can be run for a group that
 * is not on the intranet portal at all.
 */
import { useEffect, useState } from 'react';
import {
  ArrowLeft, Loader2, Target, ShieldCheck, AlertCircle, LogOut, ChevronDown,
  Mail, KeyRound, Lock, Zap, ArrowRight,
} from 'lucide-react';
import {
  ApiError, getCycles, getMeta, myPlans, sendAdminOtp, sendOtp, verifyAdminOtp, verifyOtp,
} from './api';
import type { Cycle, Employee, PlanSummary, Role } from './api';
import { STATUS_TONE, d } from './api';
import { PlanWorkspace } from './PlanWorkspace';
import { TeamView } from './TeamView';
import { AdminView } from './AdminView';
import { Ambient, Hero, Motes, Panel } from './chrome';
import { onTilt3dMove, onTilt3dLeave } from '../../ui';

/* Rotates under the sign-in card. The screen is otherwise still while someone
   waits for a code, and a portal that says nothing while you wait reads as one
   that has stopped working. */
const ASSURANCES = [
  { icon: Lock, text: 'No passwords — a fresh code each time' },
  { icon: ShieldCheck, text: 'Codes expire in five minutes, and work once' },
  { icon: Zap, text: 'Your goals, your manager, your HOD — one thread' },
];

const ROLE_CHIP: Record<Role, string> = {
  employee: 'bg-sky-50 text-sky-700 border-sky-200',
  manager: 'bg-amber-50 text-amber-700 border-amber-200',
  hod: 'bg-violet-50 text-violet-700 border-violet-200',
  admin: 'bg-rose-50 text-rose-700 border-rose-200',
};

// ── sign in ───────────────────────────────────────────────────────────────────

function SignIn({ onSignedIn }: { onSignedIn: (e: Employee) => void }) {
  const [mode, setMode] = useState<'employee' | 'admin'>('employee');
  const [step, setStep] = useState<'id' | 'otp'>('id');
  const [empId, setEmpId] = useState('');
  const [otp, setOtp] = useState('');
  const [masked, setMasked] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [tip, setTip] = useState(0);

  // Rotates the reassurance line under the card.
  useEffect(() => {
    const iv = setInterval(() => setTip(t => (t + 1) % ASSURANCES.length), 4200);
    return () => clearInterval(iv);
  }, []);

  const request = async () => {
    setBusy(true); setError(''); setNote('');
    try {
      const r = mode === 'admin' ? await sendAdminOtp() : await sendOtp(empId.trim());
      setMasked(r.masked_email);
      setStep('otp');
      if (r.dev_otp) { setOtp(r.dev_otp); setNote('Development sign-in — code filled in for you.'); }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send a code.');
    }
    setBusy(false);
  };

  const verify = async () => {
    setBusy(true); setError('');
    try {
      const r = mode === 'admin' ? await verifyAdminOtp(otp.trim())
                                 : await verifyOtp(empId.trim(), otp.trim());
      onSignedIn(r.employee);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not sign you in.');
    }
    setBusy(false);
  };

  const Tip = ASSURANCES[tip].icon;

  return (
    <div className="relative max-w-md mx-auto pt-8 pb-10">
      <Motes count={18} />

      <div className="relative text-center mb-6">
        <span className="ih-float ih-halo inline-flex w-16 h-16 rounded-3xl
          bg-gradient-to-br from-amber-400 to-orange-500 items-center justify-center
          shadow-xl shadow-amber-500/30 mb-4"
          style={{ ['--ih-halo' as string]: 'rgba(245,158,11,.5)' }}>
          <Target className="w-8 h-8 text-white" />
        </span>
        <h1 className="ih-grad-text text-3xl font-black leading-tight">Goal Setting</h1>
        <p className="text-[13px] text-slate-500 font-semibold mt-1.5">
          Agree this year&apos;s KRAs and KPIs with your manager and HOD.
        </p>
      </div>

      <div onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
        className="ih-tilt3d ih-spotlight relative bg-white border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-900/5">
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 mb-5">
          {(['employee', 'admin'] as const).map(m => (
            <button key={m}
              onClick={() => { setMode(m); setStep('id'); setError(''); setOtp(''); }}
              className={`flex-1 px-3 py-1.5 rounded-lg text-[12px] font-black capitalize transition-colors ${
                mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
              {m === 'admin' ? 'Admin' : 'Employee'}
            </button>
          ))}
        </div>

        {step === 'id' ? (
          <>
            {mode === 'employee' ? (
              <>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Employee ID
                </label>
                <input
                  value={empId} autoFocus
                  onChange={e => setEmpId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && empId.trim() && request()}
                  placeholder="e.g. APIS1234"
                  className="w-full px-3.5 py-2.5 text-[14px] rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
                <p className="text-[11px] text-slate-400 font-semibold mt-2">
                  We will email a 6-digit code to the address on your record.
                </p>
              </>
            ) : (
              <p className="text-[13px] text-slate-600 font-semibold">
                A sign-in code will be sent to the administrator's address on file.
              </p>
            )}
            <button
              onClick={request}
              disabled={busy || (mode === 'employee' && !empId.trim())}
              className="ih-sheen group w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600
                disabled:opacity-40 text-white font-bold text-[14px] shadow-lg shadow-amber-500/25 transition-all">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send me a code
              {!busy && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
            </button>
          </>
        ) : (
          <>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
              6-digit code
            </label>
            <input
              value={otp} autoFocus inputMode="numeric"
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && otp.length === 6 && verify()}
              placeholder="••••••"
              className="w-full px-3.5 py-2.5 text-[20px] tracking-[0.4em] text-center font-black rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
            />
            <p className="text-[11px] text-slate-400 font-semibold mt-2">
              Sent to {masked}. It expires in five minutes.
            </p>
            {note && <p className="text-[11px] text-emerald-600 font-bold mt-1">{note}</p>}
            <button onClick={verify} disabled={busy || otp.length !== 6}
              className="ih-sheen w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600
                disabled:opacity-40 text-white font-bold text-[14px] shadow-lg shadow-amber-500/25 transition-all">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Sign in
            </button>
            <button onClick={() => { setStep('id'); setOtp(''); setError(''); }}
              className="w-full mt-2 text-[12px] font-bold text-slate-500 hover:text-slate-700">
              Use a different ID
            </button>
          </>
        )}

        {error && (
          <div className="ih-pop-in mt-4 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 mt-px shrink-0" />
            <p className="text-[12px] font-bold text-rose-700">{error}</p>
          </div>
        )}
      </div>

      {/* One line at a time, so the card is never silent while someone waits. */}
      <div className="relative mt-5 h-6 overflow-hidden">
        <p key={tip} className="ih-fade flex items-center justify-center gap-2 text-[12px] font-semibold text-slate-400">
          <Tip className="w-3.5 h-3.5 text-amber-500" />
          {ASSURANCES[tip].text}
        </p>
      </div>
    </div>
  );
}

// ── the employee's own sheets ─────────────────────────────────────────────────

function MySheets({ employeeId, cycles, onOpen }: {
  employeeId: string; cycles: Cycle[]; onOpen: (cycleId: number) => void;
}) {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    myPlans(employeeId).then(setPlans).catch(() => setPlans([])).finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) {
    return <div className="min-h-[30vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
    </div>;
  }

  const open = cycles.filter(c => c.status === 'open');

  return (
    <div className="space-y-3">
      {open.length === 0 && plans.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl py-14 text-center">
          <Target className="w-9 h-9 text-slate-200 mx-auto mb-3" />
          <p className="font-black text-slate-600 text-sm">No goal-setting cycle is open</p>
          <p className="text-[12px] text-slate-400 font-semibold mt-1">
            Your admin will open one when it is time to set goals.
          </p>
        </div>
      )}

      {open.map(c => {
        /* By id. Cycle names are unique only per fiscal year, so matching on
           the name alone showed last year's status against this year's cycle. */
        const p = plans.find(pl => pl.cycle === c.id);
        const tone = p ? STATUS_TONE[p.status] : null;
        return (
          <button key={c.id} onClick={() => onOpen(c.id)}
            className="ih-tilt w-full text-left bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm hover:border-amber-300 transition-colors">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <p className="font-black text-slate-800 text-sm">{c.name}</p>
                <p className="text-[11px] text-slate-400 font-semibold">
                  {c.fiscal_year}
                  {c.submission_deadline && ` · due ${d(c.submission_deadline)}`}
                </p>
              </div>
              {p && tone ? (
                <span className={`text-[10px] font-black px-2 py-1 rounded-full border flex items-center gap-1.5 ${tone.chip}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                  {p.status_label}
                </span>
              ) : (
                <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                  Not started
                </span>
              )}
              <span className="text-[12px] font-black text-amber-700">
                {p ? 'Open' : 'Start'} →
              </span>
            </div>
          </button>
        );
      })}

      {plans.filter(p => !open.some(c => c.id === p.cycle)).map(p => {
        const tone = STATUS_TONE[p.status];
        return (
          <div key={p.id} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 opacity-70">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <p className="font-black text-slate-700 text-sm">{p.cycle_name}</p>
                <p className="text-[11px] text-slate-400 font-semibold">Closed cycle</p>
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${tone.chip}`}>
                {p.status_label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── the page ──────────────────────────────────────────────────────────────────

export function GoalSettingPage({ onNavigateBack }: { onNavigateBack?: () => void }) {
  const [me, setMe] = useState<Employee | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [meta, setMeta] = useState<{ categories: string[]; frequencies: string[] }>(
    { categories: [], frequencies: [] });
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!me) return;
    setLoading(true);
    Promise.all([getMeta(), getCycles()])
      .then(([m, cs]) => {
        setMeta({ categories: m.categories, frequencies: m.frequencies });
        setCycles(cs);
        const open = cs.find(c => c.status === 'open');
        setCycleId(open ? open.id : (cs[0]?.id ?? null));
      })
      .catch(() => { /* the views below each surface their own failure */ })
      .finally(() => setLoading(false));
  }, [me]);

  if (!me) {
    return (
      <div className="min-h-full bg-[#f8fafc] relative overflow-hidden">
        <Ambient />
        <div className="relative max-w-[1400px] mx-auto px-6 py-5">
          {onNavigateBack && (
            <button onClick={onNavigateBack}
              className="ih-underline flex items-center gap-2 text-[13px] font-bold text-slate-500 hover:text-slate-800 mb-2">
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </button>
          )}
          <SignIn onSignedIn={setMe} />
        </div>
      </div>
    );
  }

  const role: Role = me.user_type;
  const cycle = cycles.find(c => c.id === cycleId) || null;

  return (
    <div className="min-h-full bg-[#f8fafc] relative overflow-hidden">
      <Ambient />
      <div className="relative max-w-[1400px] mx-auto px-6 py-5 space-y-4">
        {onNavigateBack && (
          <button onClick={onNavigateBack}
            className="ih-underline flex items-center gap-2 text-[13px] font-bold text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
        )}

        <Hero
          icon={Target}
          eyebrow={cycle ? `${cycle.name} · ${cycle.fiscal_year}` : 'Goal Setting'}
          title={`${me.name.split(' ')[0]}'s goal setting`}
          sub={`${me.employee_id}${me.designation ? ` · ${me.designation}` : ''}`}
          right={
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className={`ih-breathe text-[10px] font-black px-2.5 py-1 rounded-full border capitalize ${ROLE_CHIP[role]}`}
                style={{ ['--ih-ring' as string]: 'rgba(245,158,11,.35)' }}>
                {role === 'hod' ? 'HOD' : role}
              </span>

              {cycles.length > 1 && (
                <div className="relative">
                  <select
                    value={cycleId ?? ''} onChange={e => setCycleId(Number(e.target.value))}
                    className="appearance-none pl-3 pr-8 py-2 text-[12px] font-bold rounded-xl border border-white/15 bg-white/10 text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400/40">
                    {cycles.map(c => (
                      <option key={c.id} value={c.id} className="text-slate-800">
                        {c.name} ({c.fiscal_year})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-200/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              <button onClick={() => { setMe(null); setOpenFor(null); }}
                className="flex items-center gap-1.5 text-[12px] font-bold text-amber-100/70 hover:text-white px-2.5 py-2 rounded-lg hover:bg-white/10 transition-colors">
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          }
        />

        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
          </div>
        ) : role === 'admin' ? (
          openFor ? (
            <PlanWorkspace
              employeeId={openFor} cycleId={cycleId!} role="admin" actorName={me.name}
              categories={meta.categories} frequencies={meta.frequencies}
              onBack={() => setOpenFor(null)} backLabel="Back to the console" />
          ) : (
            <AdminView actorName={me.name} cycleId={cycleId} onOpenPlan={setOpenFor} />
          )
        ) : !cycleId ? (
          <Panel className="py-16 text-center">
            <ShieldCheck className="ih-float w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="font-black text-slate-600 text-sm">No goal-setting cycle yet</p>
            <p className="text-[12px] text-slate-400 font-semibold mt-1">
              Your admin needs to create and open one before goals can be set.
            </p>
          </Panel>
        ) : openFor ? (
          <PlanWorkspace
            employeeId={openFor} cycleId={cycleId} role={role} actorName={me.name}
            categories={meta.categories} frequencies={meta.frequencies}
            onBack={() => setOpenFor(null)}
            backLabel={openFor === me.employee_id ? 'Back to my goal sheets' : 'Back to my team'}
          />
        ) : role === 'employee' ? (
          <MySheets employeeId={me.employee_id} cycles={cycles}
            onOpen={id => { setCycleId(id); setOpenFor(me.employee_id); }} />
        ) : (
          <>
            {/* A manager or HOD has their own goals to set as well as a team to
                review, so their own sheet must not be buried. */}
            <button onClick={() => setOpenFor(me.employee_id)}
              onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
              style={{ ['--ih-neon' as string]: 'rgba(245,158,11,.55)' }}
              className="ih-inview ih-tilt3d ih-spotlight ih-neon ih-sheen group w-full text-left
                relative overflow-hidden bg-white border border-slate-200 rounded-2xl px-5 py-4
                shadow-sm flex items-center gap-3">
              <span className="ih-float w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Target className="w-4.5 h-4.5 text-amber-500" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-black text-[13px] text-slate-800">My own goal sheet</span>
                <span className="block text-[11px] text-slate-400 font-semibold">
                  You set goals too — this is yours
                </span>
              </span>
              <span className="flex items-center gap-1 text-[12px] font-black text-amber-700 shrink-0">
                Open <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
            <TeamView actorId={me.employee_id} role={role} cycleId={cycleId}
              cycleName={cycle?.name || ''} onOpen={setOpenFor} />
          </>
        )}
      </div>
    </div>
  );
}

/* Health Insurance — opened from the "Health Insurance" card under APIS at a
 * Glance. Three things an employee needs, top to bottom: the group policy
 * number (as text, so it can be copied into the insurer's app), how to add
 * the policy in the TATA AIG app, and where the network hospitals are.
 *
 * Everything here is taken from the two images HR supplied (in
 * src/assets/health-insurance/): the policy-number banner and the
 * "Mobile App Journey for Employees" sheet. The steps are written out as
 * text as well as shown as the original sheet, because the sheet's small
 * print is unreadable on a phone and its QR code is the only way to the app
 * it gives.
 *
 * The images live under src/assets rather than public/, so the build gives
 * them hashed names instead of a guessable /Health_Insurance/ address. They
 * are still plain files once built — this keeps them out of sight, it does
 * not put them behind sign-in.
 */
import { useEffect, useState } from 'react';
import {
  ShieldCheck, Copy, Check, Smartphone, LogIn, FilePlus2, Hash, IdCard, HeartPulse,
  Hospital, ExternalLink, X, Maximize2, BadgeCheck, CreditCard, Users, Bell, Sparkles,
  type LucideIcon,
} from 'lucide-react';
import policyBanner from '../../assets/health-insurance/policy-number.jpeg';
import appStepsSheet from '../../assets/health-insurance/app-steps.jpeg';

const POLICY_NUMBER = '0239818772';
const INSURER = 'TATA AIG';

/* "Mobile App Journey for Employees", step for step. */
const APP_STEPS: { title: string; detail: string; icon: LucideIcon }[] = [
  { title: 'Download the TATA AIG app', detail: 'Scan the QR code on the guide below, or search “TATA AIG” on the Play Store / App Store.', icon: Smartphone },
  { title: 'Log in to the app', detail: 'Sign in to the TATA AIG mobile app.', icon: LogIn },
  { title: 'Tap “Add Policy”', detail: 'Shown under “Can’t see your TATA AIG policy?”.', icon: FilePlus2 },
  { title: 'Enter the policy number', detail: `Type ${POLICY_NUMBER} — copy it from the card above.`, icon: Hash },
  { title: 'Enter your EMP ID and date of birth', detail: 'On the Enter Policy Details screen, along with the policy number.', icon: IdCard },
  { title: 'Your policy appears under the Health tab', detail: 'Open it to see your cover and insured members.', icon: BadgeCheck },
];

/* "Important Features of the Mobile App". */
const APP_FEATURES: { label: string; icon: LucideIcon }[] = [
  { label: 'Basic policy information', icon: ShieldCheck },
  { label: 'View, download & share health e-cards', icon: CreditCard },
  { label: 'Add & edit insured member contact details', icon: Users },
  { label: 'Claim intimation & real-time tracking', icon: Bell },
  { label: 'Value-added services', icon: Sparkles },
];

const HOSPITAL_LINKS = [
  { label: 'APIS hospital list', sub: 'Network hospitals associated with APIS', href: '/hospital_list/ProviderNetwork.html' },
  { label: 'eWATPA hospital network', sub: 'Search the TPA’s full hospital network', href: 'https://www.ewatpa.com/hospital-network' },
];

export function HealthInsurancePopup({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (sheetOpen) setSheetOpen(false); else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sheetOpen]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(POLICY_NUMBER);
      setCopied(true);
    } catch {
      /* Clipboard blocked (plain http, old browser): select the digits so
         Ctrl+C still works. */
      const el = document.getElementById('hi-policy-number');
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges(); sel?.addRange(range);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Health Insurance"
        className="ih-pop-in relative w-full max-w-3xl max-h-[92vh] overflow-y-auto ih-scroll-clean rounded-3xl bg-slate-50
                   shadow-[0_60px_120px_-30px_rgba(0,0,0,.55)] ring-1 ring-black/5">

        {/* Header — the HR banner, dimmed under a glass title bar. */}
        <div className="relative h-36 sm:h-44 overflow-hidden rounded-t-3xl bg-slate-900">
          <img src={policyBanner} alt="" className="absolute inset-0 w-full h-full object-cover object-top opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-sky-950/70 to-teal-900/40" />
          <div aria-hidden className="ih-drift absolute -top-16 -right-10 w-64 h-64 rounded-full bg-teal-400/20 blur-3xl" />
          <div aria-hidden className="ih-drift absolute -bottom-20 left-10 w-72 h-72 rounded-full bg-sky-500/20 blur-3xl" style={{ animationDelay: '-4s' }} />
          <div className="relative h-full flex items-end justify-between gap-4 px-5 sm:px-7 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 ring-1 ring-white/25 backdrop-blur-md flex items-center justify-center">
                <HeartPulse className="w-6 h-6 text-teal-300" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-teal-300/90">Group Health Insurance</p>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Your health cover, in one place</h2>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/20 text-[10.5px] font-black text-white/90">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />Insured by {INSURER}
            </span>
          </div>
          <button type="button" onClick={onClose} title="Close"
            className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white/10 ring-1 ring-white/20 text-white/80
                       hover:bg-white/20 hover:text-white flex items-center justify-center transition-all">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* 1 · Policy number */}
          <section className="ih-sweep relative overflow-hidden rounded-2xl p-[1.5px] bg-gradient-to-r from-teal-400 via-sky-500 to-indigo-500">
            <div className="relative rounded-[14px] bg-slate-950 px-5 sm:px-6 py-5 overflow-hidden">
              <div aria-hidden className="absolute inset-0 opacity-[0.07]"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px)', backgroundSize: '22px 22px' }} />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-300/80 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 ih-pulse-glow" />Policy number
                  </p>
                  <p id="hi-policy-number"
                    className="mt-1.5 font-mono text-[30px] sm:text-[38px] leading-none font-bold tracking-[.12em]
                               text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-100 to-teal-200 select-all">
                    {POLICY_NUMBER}
                  </p>
                  <p className="mt-2 text-[11.5px] text-slate-400">
                    {INSURER} group health policy for APIS employees. You'll need it in step 4 below.
                  </p>
                </div>
                <button type="button" onClick={copyNumber}
                  className={`shrink-0 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-[13px] font-black transition-all
                             ${copied
                               ? 'bg-teal-400 text-slate-950 shadow-[0_0_24px_rgba(45,212,191,.55)]'
                               : 'bg-white text-slate-900 hover:bg-sky-50 hover:shadow-[0_0_24px_rgba(56,189,248,.45)]'}`}>
                  {copied ? <><Check className="w-4 h-4" />Copied</> : <><Copy className="w-4 h-4" />Copy number</>}
                </button>
              </div>
            </div>
          </section>

          {/* 2 · How to add your policy */}
          <section className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-600">Mobile app journey</p>
                <h3 className="text-[16px] font-black text-slate-900">Add your policy in the {INSURER} app</h3>
              </div>
              <span className="shrink-0 text-[10.5px] font-black text-slate-400 bg-slate-100 rounded-full px-2.5 py-1">6 steps</span>
            </div>

            <ol className="relative px-5 sm:px-6 pt-4 pb-2">
              <span aria-hidden className="absolute left-[39px] sm:left-[43px] top-7 bottom-8 w-px bg-gradient-to-b from-sky-300 via-teal-300 to-emerald-300" />
              {APP_STEPS.map((s, i) => {
                const Icon = s.icon;
                const last = i === APP_STEPS.length - 1;
                return (
                  <li key={s.title} className="ih-reveal relative flex items-start gap-4 pb-4" style={{ animationDelay: `${i * 70}ms` }}>
                    <div className={`relative z-[1] w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ring-4 ring-white
                                     ${last ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_0_18px_rgba(16,185,129,.45)]'
                                            : 'bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/25'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3.5 py-2.5 hover:ring-sky-200 hover:bg-sky-50/40 transition-all">
                      <p className="text-[13px] font-black text-slate-800">
                        <span className="text-sky-600 font-mono mr-1.5">0{i + 1}</span>{s.title}
                      </p>
                      <p className="text-[11.5px] text-slate-500 leading-snug mt-0.5">{s.detail}</p>
                      {i === 3 && (
                        <button type="button" onClick={copyNumber}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-black text-sky-600 hover:text-sky-700">
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied ? 'Copied' : `Copy ${POLICY_NUMBER}`}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="px-5 sm:px-6 pb-5">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-slate-400 mb-2">What you can do in the app</p>
              <div className="flex flex-wrap gap-1.5">
                {APP_FEATURES.map(f => {
                  const Icon = f.icon;
                  return (
                    <span key={f.label}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 ring-1 ring-sky-100 text-[11px] font-bold text-sky-800">
                      <Icon className="w-3.5 h-3.5 text-sky-500" />{f.label}
                    </span>
                  );
                })}
              </div>

              {/* The original sheet — carries the QR code to the app. */}
              <button type="button" onClick={() => setSheetOpen(true)}
                className="group mt-4 relative block w-full overflow-hidden rounded-xl ring-1 ring-slate-200 bg-white text-left">
                <img src={appStepsSheet} alt={`${INSURER} mobile app journey for employees, with QR code to download the app`}
                  className="w-full h-56 sm:h-72 object-cover object-[50%_42%] transition-transform duration-500 group-hover:scale-[1.02]" />
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950/80 to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                  <span className="text-[12px] font-black">Visual guide &amp; QR code to download the app</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 ring-1 ring-white/25 backdrop-blur text-[11px] font-black">
                    <Maximize2 className="w-3.5 h-3.5" />View full size
                  </span>
                </span>
              </button>
            </div>
          </section>

          {/* 3 · Network hospitals */}
          <section className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-rose-500">Cashless treatment</p>
            <h3 className="text-[16px] font-black text-slate-900">Network hospitals</h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HOSPITAL_LINKS.map(h => (
                <a key={h.href} href={h.href} target="_blank" rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl ring-1 ring-slate-200 bg-gradient-to-br from-white to-rose-50/50 p-3.5
                             hover:ring-rose-300 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-rose-50 ring-4 ring-rose-100 flex items-center justify-center">
                    <Hospital className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-black text-slate-800">{h.label}</p>
                    <p className="text-[11px] text-slate-500 leading-snug">{h.sub}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-rose-500 transition-colors shrink-0" />
                </a>
              ))}
            </div>
          </section>

          <p className="text-center text-[11px] text-slate-400 pb-1">
            Questions about your cover or a claim? Contact P &amp; C.
          </p>
        </div>
      </div>

      {/* Full-size steps sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-8 bg-slate-950/85 backdrop-blur-sm"
          onClick={e => { e.stopPropagation(); setSheetOpen(false); }}>
          <img src={appStepsSheet} alt={`${INSURER} mobile app journey for employees`}
            onClick={e => e.stopPropagation()}
            className="ih-pop-in max-w-full max-h-full rounded-xl bg-white shadow-2xl" />
          <button type="button" onClick={e => { e.stopPropagation(); setSheetOpen(false); }} title="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/25 text-white hover:bg-white/20 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

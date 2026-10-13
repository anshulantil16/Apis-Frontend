/* Health Insurance — opened from the "Health Insurance" card under APIS at a
 * Glance. Three things an employee needs, top to bottom: where the network
 * hospitals are, the group policy number (as text, so it can be copied into
 * the insurer's app), and how to add the policy in the TATA AIG app.
 *
 * Styled in the intranet's own amber family (same as Policies & Guidelines
 * and the APIS Tree): white cards, amber/orange accents.
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
const HOSPITAL_NETWORK_URL = 'https://www.ewatpa.com/hospital-network';

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
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Health Insurance"
        className="ih-pop-in relative w-full max-w-3xl max-h-[92vh] overflow-y-auto ih-scroll-clean rounded-3xl bg-white
                   shadow-[0_60px_120px_-30px_rgba(0,0,0,.5)] ring-1 ring-black/5">

        {/* Header — same amber panel as the Policies & APIS Tree heroes. */}
        <div className="ih-sweep relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-white via-amber-50/70 to-white
                        border-b border-amber-100 px-5 sm:px-7 py-5">
          <div className="ih-drift pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-amber-300/30 blur-[90px]" />
          <div className="ih-aurora pointer-events-none absolute -bottom-24 -left-10 w-56 h-56 rounded-full bg-orange-200/30 blur-[90px]" />
          <div className="relative flex items-center gap-4 pr-10">
            <div className="ih-float w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
              <HeartPulse className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Health Insurance</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white ring-1 ring-amber-200 text-[10px] font-black text-amber-600">
                  <ShieldCheck className="w-3 h-3" />{INSURER}
                </span>
              </div>
              <p className="text-[12.5px] text-slate-500 mt-0.5">Group health cover for APIS employees — hospitals, your policy number and how to get it on your phone.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} title="Close"
            className="absolute top-4 right-4 w-9 h-9 rounded-xl text-slate-400 hover:bg-amber-100 hover:text-slate-700
                       flex items-center justify-center transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* 1 · Network hospitals — first, because finding a hospital is
              the most urgent reason anyone opens this. */}
          <a href={HOSPITAL_NETWORK_URL} target="_blank" rel="noopener noreferrer"
            className="ih-sweep group relative flex items-center gap-4 overflow-hidden rounded-2xl p-4 sm:p-5
                       bg-gradient-to-r from-amber-400 via-amber-400 to-orange-500 text-white
                       shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-white/25 ring-1 ring-white/40 flex items-center justify-center">
              <Hospital className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-50/90">Cashless treatment</p>
              <p className="text-[16px] sm:text-[17px] font-black leading-tight">Find a network hospital</p>
              <p className="text-[11.5px] font-semibold text-amber-50/90 mt-0.5">Search the full hospital network on eWATPA</p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white text-amber-700 text-[12.5px] font-black
                             shadow-sm group-hover:bg-amber-50 transition-colors">
              <span className="hidden sm:inline">Open</span><ExternalLink className="w-4 h-4" />
            </span>
          </a>

          {/* 2 · Policy number — laid out like the insurance e-card. */}
          <section className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-amber-200 shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
            <div className="flex flex-col sm:flex-row">
              <div className="flex-1 min-w-0 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Policy number</p>
                <p id="hi-policy-number"
                  className="mt-1 font-mono text-[28px] sm:text-[34px] leading-none font-bold tracking-[.1em] text-slate-900 select-all">
                  {POLICY_NUMBER}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
                  <span><span className="font-black text-slate-700">Insurer</span> · {INSURER}</span>
                  <span><span className="font-black text-slate-700">Cover</span> · Group health, APIS employees</span>
                </div>
                <button type="button" onClick={copyNumber}
                  className={`mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[12.5px] font-black transition-all
                             ${copied
                               ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                               : 'bg-amber-500 text-white shadow-md shadow-amber-500/30 hover:bg-amber-600'}`}>
                  {copied ? <><Check className="w-4 h-4" />Copied</> : <><Copy className="w-4 h-4" />Copy policy number</>}
                </button>
              </div>
              {/* HR's banner, as a thumbnail of the card they sent round. */}
              <div className="sm:w-56 shrink-0 border-t sm:border-t-0 sm:border-l border-amber-100 bg-amber-50/50 p-3 flex items-center">
                <img src={policyBanner} alt={`APIS × ${INSURER} health insurance, policy number ${POLICY_NUMBER}`}
                  className="w-full rounded-lg ring-1 ring-amber-100 shadow-sm" />
              </div>
            </div>
          </section>

          {/* 3 · How to add your policy */}
          <section className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 pt-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Mobile app journey</p>
                <h3 className="text-[16px] font-black text-slate-900">Add your policy in the {INSURER} app</h3>
              </div>
              <span className="shrink-0 text-[10.5px] font-black text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-full px-2.5 py-1">6 steps</span>
            </div>

            <ol className="relative px-5 pt-4 pb-1">
              <span aria-hidden className="absolute left-[37px] top-8 bottom-9 w-0.5 rounded-full bg-amber-200" />
              {APP_STEPS.map((s, i) => {
                const Icon = s.icon;
                const last = i === APP_STEPS.length - 1;
                return (
                  <li key={s.title} className="relative flex items-start gap-3.5 pb-3">
                    <div className={`relative z-[1] w-9 h-9 shrink-0 rounded-full flex items-center justify-center ring-4 ring-white text-[13px] font-black
                                     ${last ? 'bg-emerald-500 text-white' : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'}`}>
                      {last ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3.5 py-2.5 hover:ring-amber-200 hover:bg-amber-50/40 transition-all">
                      <p className="text-[13px] font-black text-slate-800 flex items-center gap-2">
                        <Icon className="w-4 h-4 text-amber-500 shrink-0" />{s.title}
                      </p>
                      <p className="text-[11.5px] text-slate-500 leading-snug mt-0.5">{s.detail}</p>
                      {i === 3 && (
                        <button type="button" onClick={copyNumber}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-black text-amber-600 hover:text-amber-700">
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied ? 'Copied' : `Copy ${POLICY_NUMBER}`}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="px-5 pb-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">What you can do in the app</p>
              <div className="flex flex-wrap gap-1.5">
                {APP_FEATURES.map(f => {
                  const Icon = f.icon;
                  return (
                    <span key={f.label}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 ring-1 ring-amber-100 text-[11px] font-bold text-amber-800">
                      <Icon className="w-3.5 h-3.5 text-amber-500" />{f.label}
                    </span>
                  );
                })}
              </div>

              {/* The original sheet — carries the QR code to the app. */}
              <button type="button" onClick={() => setSheetOpen(true)}
                className="group mt-4 relative block w-full overflow-hidden rounded-xl ring-1 ring-slate-200 bg-white text-left">
                <img src={appStepsSheet} alt={`${INSURER} mobile app journey for employees, with QR code to download the app`}
                  className="w-full h-56 sm:h-72 object-cover object-[50%_42%] transition-transform duration-500 group-hover:scale-[1.02]" />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white
                                 text-[11px] font-black shadow-md shadow-amber-500/30 group-hover:bg-amber-600 transition-colors">
                  <Maximize2 className="w-3.5 h-3.5" />View full guide &amp; QR code
                </span>
              </button>
            </div>
          </section>

          <p className="text-center text-[11px] text-slate-400 pb-1">
            Questions about your cover or a claim? Contact P &amp; C.
          </p>
        </div>
      </div>

      {/* Full-size steps sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-8 bg-slate-900/85 backdrop-blur-sm"
          onClick={e => { e.stopPropagation(); setSheetOpen(false); }}>
          <img src={appStepsSheet} alt={`${INSURER} mobile app journey for employees`}
            onClick={e => e.stopPropagation()}
            className="ih-pop-in max-w-full max-h-full rounded-xl bg-white shadow-2xl" />
          <button type="button" onClick={e => { e.stopPropagation(); setSheetOpen(false); }} title="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/25 text-white hover:bg-white/25 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

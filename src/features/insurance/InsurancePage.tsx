/* Medical Insurance — one click from the intranet into the insurer's own
   Employee Portal, already signed in.

   What this page is NOT: it does not hold or display anybody's policy card,
   sum insured, dependants or claim history. The insurer's integration
   document describes a sign-in redirect and nothing else — there is no API
   behind it that returns those details, so the intranet has nothing of its
   own to render. What it can do is take a person straight to the page that
   holds them without a second login, which is the whole of what was offered.

   If those details are ever to appear here instead, the insurer has to give
   us a read API. See backend/insurance/sso.py. */
import { useEffect, useState } from 'react';
import {
  ShieldCheck, ArrowLeft, Loader2, AlertTriangle, ExternalLink, Info,
  HeartPulse, Users, FileText, Building2, Ban, FilePlus2, Send, Search,
  Download, Phone, Sparkles,
} from 'lucide-react';
import {
  fetchInsuranceOverview, insuranceLaunchUrl,
  type InsuranceOverview,
} from './api';

/* The eleven destinations the insurer accepts, grouped the way somebody
   actually arrives at them — "I want my card", "something happened",
   "where can I go", "I need help" — rather than as one flat grid of eleven
   identical tiles. Keys must match insurance/sso.py's DESTINATIONS; a key
   the server does not offer is simply not rendered. */
const GROUPS: {
  title: string;
  blurb: string;
  items: { key: string; label: string; desc: string; icon: typeof ShieldCheck }[];
}[] = [
  {
    title: 'My cover',
    blurb: 'Your health card and what the policy covers',
    items: [
      { key: 'my-coverage',     label: 'My Coverage',     desc: 'Your health card and sum insured', icon: HeartPulse },
      { key: 'members-covered', label: 'Members Covered', desc: 'Who in your family is included',   icon: Users },
      { key: 'policy-details',  label: 'Policy Details',  desc: 'Policy number, period and terms',  icon: FileText },
    ],
  },
  {
    title: 'Claims',
    blurb: 'Tell the insurer, send the papers, follow it up',
    items: [
      { key: 'intimate-claims',  label: 'Intimate a Claim', desc: 'Inform the insurer before or after treatment', icon: Send },
      { key: 'claim-submission', label: 'Submit a Claim',   desc: 'Upload bills and documents',                   icon: FilePlus2 },
      { key: 'claim-status',     label: 'Claim Status',     desc: 'Where your claim has reached',                 icon: Search },
    ],
  },
  {
    title: 'Hospitals',
    blurb: 'Where you can be treated cashless — and where you cannot',
    items: [
      { key: 'network-hospitals',      label: 'Network Hospitals',     desc: 'Cashless treatment near you',       icon: Building2 },
      { key: 'blacklisted-hospitals',  label: 'Blacklisted Hospitals', desc: 'Hospitals the insurer will not pay', icon: Ban },
    ],
  },
  {
    title: 'Help',
    blurb: 'Forms, who to escalate to, and wellness',
    items: [
      { key: 'download-forms',    label: 'Download Forms',    desc: 'Claim and reimbursement forms',      icon: Download },
      { key: 'escalation-matrix', label: 'Escalation Matrix', desc: 'Who to contact if you are stuck',    icon: Phone },
      { key: 'wellness-corner',   label: 'Wellness Corner',   desc: 'Health checks and wellness benefits', icon: Sparkles },
    ],
  },
];

interface Props {
  onBack?: () => void;
}

export function InsurancePage({ onBack }: Props) {
  const [data, setData] = useState<InsuranceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [opening, setOpening] = useState('');
  const [launchError, setLaunchError] = useState('');

  useEffect(() => {
    let alive = true;
    fetchInsuranceOverview()
      .then(d => { if (alive) setData(d); })
      .catch(e => { if (alive) setLoadError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  /* The blank tab is opened SYNCHRONOUSLY, inside the click, and pointed at
     the URL once it arrives. Opening it after the await instead puts it
     outside the user gesture, and every popup blocker swallows it — the
     button then does nothing at all, with no error to show for it.

     **No `noopener` in the feature string.** `window.open` with `noopener`
     returns null by specification — severing the handle is exactly what the
     flag is for — so the handle this pattern depends on was always null,
     the code fell through to `window.location.href`, and the intranet tab
     itself navigated to the insurer while an empty second tab sat on
     about:blank. That is precisely what it looked like in use: "nothing is
     opening", with the portal gone from the tab it was opened from.

     The protection `noopener` buys is restored on the line below by nulling
     `opener` after the navigation, which is what the flag does anyway. */
  const open = async (destination: string, label: string) => {
    setLaunchError('');
    setOpening(destination);
    const tab = window.open('', '_blank');
    try {
      const url = await insuranceLaunchUrl(destination);
      if (tab) {
        // Sever the back-reference before handing the tab to someone else's
        // origin, so their page cannot reach back into ours.
        try { tab.opener = null; } catch { /* some browsers forbid the write */ }
        tab.location.replace(url);
      } else {
        // A blocker ate the tab. Say so rather than silently navigating the
        // portal away from under the person who clicked.
        setLaunchError(
          `Your browser blocked the new tab for ${label}. Allow pop-ups for this site and try again.`);
      }
    } catch (e) {
      tab?.close();
      setLaunchError(e instanceof Error ? e.message : `Could not open ${label}.`);
    } finally {
      setOpening('');
    }
  };

  const known = new Set((data?.destinations ?? []).map(d => d.key));
  const ready = !!data?.ready;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">

      {onBack && (
        <button onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-500
                     hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />Back to Dashboard
        </button>
      )}

      {/* ── Who this is for ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 sm:p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-white/20 grid place-items-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black tracking-tight">Medical Insurance</h2>
            <p className="text-[13px] text-emerald-50/90 mt-0.5">
              Opens {data?.portalName || 'the insurance portal'} with you already signed in —
              no second password to remember.
            </p>
            {data && (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-emerald-50/90">
                <span className="font-bold text-white">{data.employee.name}</span>
                {data.employee.employeeCode && <span>{data.employee.employeeCode}</span>}
                {data.employee.department && <span>{data.employee.department}</span>}
                {data.employee.email && <span className="truncate max-w-[240px]">{data.employee.email}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-slate-500 text-[13px]">
          <Loader2 className="w-4 h-4 animate-spin" />Loading your details…
        </div>
      )}

      {loadError && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-[13px] text-rose-800 font-semibold">{loadError}</p>
        </div>
      )}

      {/* Not connected, or we cannot identify this person to the insurer.
          Said plainly and with the next step in it, rather than leaving a
          grid of buttons that all fail the same way when clicked. */}
      {data && !ready && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-bold text-amber-900">Not available yet</p>
            <p className="text-[13px] text-amber-800 mt-0.5">{data.reason}</p>
          </div>
        </div>
      )}

      {launchError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-[13px] text-rose-800 font-semibold">{launchError}</p>
        </div>
      )}

      {/* ── The destinations ────────────────────────────────────────────── */}
      {data && GROUPS.map(group => {
        const items = group.items.filter(i => known.has(i.key));
        if (!items.length) return null;       // the server does not offer these
        return (
          <section key={group.title} className="mt-7">
            <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wide">{group.title}</h3>
            <p className="text-[12px] text-slate-500 mt-0.5">{group.blurb}</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(item => {
                const Icon = item.icon;
                const busy = opening === item.key;
                return (
                  <button key={item.key} disabled={!ready || busy}
                    onClick={() => void open(item.key, item.label)}
                    className="group text-left rounded-xl border border-slate-200 bg-white p-4
                               hover:border-emerald-300 hover:shadow-md transition-all
                               disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-bold text-slate-800">{item.label}</span>
                          {ready && (
                            <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                          )}
                        </div>
                        <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Said once, at the bottom, because people do ask where their card
          "went" when a new tab opens on somebody else's website. */}
      {data && ready && (
        <p className="mt-8 text-[12px] text-slate-400 leading-relaxed">
          These open {data.portalName} in a new tab. Your cards, claims and documents are held by
          the insurer, not by the intranet — this page only signs you in so you do not have to.
        </p>
      )}
    </div>
  );
}

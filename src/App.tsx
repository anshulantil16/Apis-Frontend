import { useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';

/* One import per project, each through its feature barrel — this file is the
   map of what exists, not a list of file paths. Everything a project owns
   lives under src/features/<project>/. */
import { DataExtractorPage } from './features/extractor';
import { PerformancePage } from './features/performance';
import { AppraisalPage } from './features/appraisal';
import { EOMPage } from './features/eom';
import { PMSPage } from './features/pms';
import { LettersGeneratorPage, OfferLetterApprovalDashboard } from './features/letters';
import { TadaPage } from './features/tada';
import { SalesIQPage } from './features/salesiq';
import { RoomPulsePage } from './features/roompulse';
import { ApisTreePage } from './features/tree';
import { PoliciesPage } from './features/policies';
import { IntranetHomePage } from './features/home';
import { IntranetShell } from './features/home/IntranetShell';
import { pushRecentTool, type QuickAccessId } from './features/home/IntranetHomeShared';

type AppView = 'home' | 'extractor' | 'performance' | 'appraisal' | 'eom' | 'pms' | 'offer-letters' | 'offer-approvals' | 'tada' | 'salesiq' | 'roompulse' | 'apis-tree' | 'policies';

/* Header caption per view. The shell renders the sidebar and header for every
   screen, so tools never draw their own top-level chrome. */
const VIEW_META: Record<AppView, { title: string; subtitle: string }> = {
  'home':            { title: 'APIS Internal Tools', subtitle: 'Enterprise Platform' },
  'extractor':       { title: 'Data Extractor',      subtitle: 'HR & Payroll Data Tools' },
  'performance':     { title: 'Performance Hub',     subtitle: 'Goals & Reviews' },
  'appraisal':       { title: 'Appraisal Hub',       subtitle: 'Annual Appraisal' },
  'eom':             { title: 'Employee of the Month', subtitle: 'Recognition' },
  'pms':             { title: 'PMS Simulator',       subtitle: 'Performance & Salary' },
  'offer-letters':   { title: 'Letters Generator',   subtitle: 'Appraisal & Warning' },
  'offer-approvals': { title: 'Letter Approvals',    subtitle: 'Appraisal Letters' },
  'tada':            { title: 'TA/DA Portal',        subtitle: 'Travel & Allowance' },
  'salesiq':         { title: 'SalesIQ',             subtitle: 'Sales Intelligence' },
  'roompulse':       { title: 'AdminPulse',          subtitle: 'Admin Requests & Facilities' },
  'apis-tree':       { title: 'APIS Tree',           subtitle: 'Organisation Structure' },
  'policies':        { title: 'Policies',            subtitle: 'Policies & Guidelines' },
};

// 'appraisal' = appraisal only (legacy), 'hub' = appraisal + eom only, anything else = all
const APP_MODE = import.meta.env.VITE_APP_MODE;
const HUB_MODE = APP_MODE === 'hub';

/* The app always opens on the home dashboard.
 *
 * It used to restore the last-visited tool from localStorage, which meant a
 * returning user was dropped straight into (say) the PMS login with no
 * context. The dashboard is the front door — it's where the tool launcher,
 * announcements and company info live — so every session starts there.
 * (The old `apis_app_view` key is intentionally no longer read or written.) */

/* Restricted landing for VITE_APP_MODE=hub builds (production today) — only
   Appraisal and EOM are exposed there, so this deliberately does NOT render
   the full IntranetHomePage (which links every tool, including ones not
   meant to be public in that build). */
function HubRestrictedHome({ onNavigateToAppraisal, onNavigateToEOM }: { onNavigateToAppraisal: () => void; onNavigateToEOM: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <img src="/logo.png" alt="APIS" className="w-16 h-16 object-contain mx-auto mb-4 drop-shadow-lg" />
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">APIS INDIA</h1>
        <p className="text-sm text-slate-500 mt-1">Select a hub to get started</p>
      </div>
      <div className="flex gap-4">
        <button onClick={onNavigateToAppraisal}
          className="flex flex-col items-center gap-3 px-8 py-6 bg-white rounded-2xl shadow-md border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all group">
          <TrendingUp className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
          <div className="text-center">
            <p className="font-black text-slate-800 text-sm">Appraisal Hub</p>
            <p className="text-xs text-slate-400 mt-0.5">Annual Appraisal</p>
          </div>
        </button>
        <button onClick={onNavigateToEOM}
          className="flex flex-col items-center gap-3 px-8 py-6 bg-white rounded-2xl shadow-md border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all group">
          <Sparkles className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
          <div className="text-center">
            <p className="font-black text-slate-800 text-sm">EOM Hub</p>
            <p className="text-xs text-slate-400 mt-0.5">Employee of the Month</p>
          </div>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<AppView>(APP_MODE === 'appraisal' ? 'appraisal' : 'home');

  // Centralised so every navigation path — shell sidebar, ⌘K palette, or a
  // click inside a page's own content (hero button, quick-access grid) —
  // updates "Recently Visited" the same way.
  const navigate = (v: AppView) => {
    if (v !== 'home') pushRecentTool(v as QuickAccessId);
    setView(v);
  };

  // Legacy appraisal-only mode
  if (APP_MODE === 'appraisal') {
    return <AppraisalPage onNavigateBack={() => {}} />;
  }

  // Hub builds expose only Appraisal + EOM, and keep their own minimal landing.
  if (HUB_MODE && view === 'home') {
    return <HubRestrictedHome onNavigateToAppraisal={() => navigate('appraisal')} onNavigateToEOM={() => navigate('eom')} />;
  }

  const meta = VIEW_META[view];

  /* Every screen renders inside the one shell — same sidebar, same header —
     so switching tools only swaps the centre. Tools must not draw their own
     sidebar or top-level header. */
  return (
    <IntranetShell active={view} onNavigate={v => navigate(v as AppView)}
      title={meta.title} subtitle={meta.subtitle}>
      {view === 'home' ? (
        <IntranetHomePage onNavigate={navigate} />
      ) : view === 'extractor' ? (
        <DataExtractorPage />
      ) : view === 'roompulse' ? (
        <RoomPulsePage />
      ) : view === 'salesiq' ? (
        <SalesIQPage />
      ) : view === 'tada' ? (
        <TadaPage />
      ) : view === 'performance' ? (
        <PerformancePage />
      ) : view === 'eom' ? (
        <EOMPage />
      ) : view === 'pms' ? (
        <PMSPage />
      ) : view === 'offer-letters' ? (
        <LettersGeneratorPage onNavigateToApprovals={() => navigate('offer-approvals')} />
      ) : view === 'offer-approvals' ? (
        <OfferLetterApprovalDashboard />
      ) : view === 'apis-tree' ? (
        <ApisTreePage />
      ) : view === 'policies' ? (
        <PoliciesPage />
      ) : (
        <AppraisalPage />
      )}
    </IntranetShell>
  );
}

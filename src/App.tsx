import { useState, lazy, Suspense } from 'react';
import { Sparkles, TrendingUp, Loader2 } from 'lucide-react';

/* One import per project, each through its feature barrel — this file is the
   map of what exists, not a list of file paths. Everything a project owns
   lives under src/features/<project>/.
 *
 * Every tool is lazy. Importing them eagerly meant opening the dashboard
 * downloaded and evaluated all ten — nearly 2 MB of JavaScript, most of it for
 * tools this user was never going to open — before the first screen could
 * paint. Parsing that is main-thread work, which is why the app felt slow to
 * start rather than merely slow to download.
 *
 * IntranetHomePage is the exception and stays eager: it is what the app opens
 * on, so deferring it would only put a spinner on the critical path. */
const DataExtractorPage = lazy(() => import('./features/extractor').then(m => ({ default: m.DataExtractorPage })));
const PerformancePage = lazy(() => import('./features/performance').then(m => ({ default: m.PerformancePage })));
const AppraisalPage = lazy(() => import('./features/appraisal').then(m => ({ default: m.AppraisalPage })));
const GoalSettingPage = lazy(() => import('./features/goalsetting').then(m => ({ default: m.GoalSettingPage })));
const EOMPage = lazy(() => import('./features/eom').then(m => ({ default: m.EOMPage })));
const PMSPage = lazy(() => import('./features/pms').then(m => ({ default: m.PMSPage })));
const LettersGeneratorPage = lazy(() => import('./features/letters').then(m => ({ default: m.LettersGeneratorPage })));
const OfferLetterApprovalDashboard = lazy(() => import('./features/letters').then(m => ({ default: m.OfferLetterApprovalDashboard })));
const TadaPage = lazy(() => import('./features/tada').then(m => ({ default: m.TadaPage })));
const SalesIQPage = lazy(() => import('./features/salesiq').then(m => ({ default: m.SalesIQPage })));
const RoomPulsePage = lazy(() => import('./features/roompulse').then(m => ({ default: m.RoomPulsePage })));
const ApisTreePage = lazy(() => import('./features/tree').then(m => ({ default: m.ApisTreePage })));
const PoliciesPage = lazy(() => import('./features/policies').then(m => ({ default: m.PoliciesPage })));
/* Straight at the file, not the barrel: PortalGate is imported eagerly from
   './features/portal' below, so going through the barrel here would pull
   AdminConsole into the entry chunk anyway and the lazy() would buy nothing. */
const AdminConsoleLazy = lazy(() => import('./features/portal/AdminConsole').then(m => ({ default: m.AdminConsole })));

import { IntranetHomePage } from './features/home';
import { IntranetShell } from './features/home/IntranetShell';
import { pushRecentTool, type QuickAccessId } from './features/home/IntranetHomeShared';
/* Both straight at their files rather than the barrel. The barrel re-exports
   AdminConsole, so importing anything through it drags the console into the
   entry chunk and defeats the lazy() above. */
import { PortalGate } from './features/portal/PortalGate';
import type { PortalUser } from './features/portal/session';

type AppView = 'home' | 'extractor' | 'performance' | 'appraisal' | 'goal-setting' | 'eom' | 'pms' | 'offer-letters' | 'offer-approvals' | 'tada' | 'salesiq' | 'roompulse' | 'apis-tree' | 'policies' | 'admin-console';

/* Header caption per view. The shell renders the sidebar and header for every
   screen, so tools never draw their own top-level chrome. */
const VIEW_META: Record<AppView, { title: string; subtitle: string }> = {
  'home':            { title: 'APIS Internal Tools', subtitle: 'Enterprise Platform' },
  'extractor':       { title: 'Data Extractor',      subtitle: 'HR & Payroll Data Tools' },
  'performance':     { title: 'Performance Hub',     subtitle: 'Goals & Reviews' },
  'appraisal':       { title: 'Appraisal Hub',       subtitle: 'Annual Appraisal' },
  'goal-setting':    { title: 'Goal Setting',        subtitle: 'KRA & KPI agreement' },
  'eom':             { title: 'Employee of the Month', subtitle: 'Recognition' },
  'pms':             { title: 'PMS Simulator',       subtitle: 'Performance & Salary' },
  'offer-letters':   { title: 'Letters Generator',   subtitle: 'Appraisal & Warning' },
  'offer-approvals': { title: 'Letter Approvals',    subtitle: 'Appraisal Letters' },
  'tada':            { title: 'TA/DA Portal',        subtitle: 'Travel & Allowance' },
  'salesiq':         { title: 'SalesIQ',             subtitle: 'Sales Intelligence' },
  'roompulse':       { title: 'AdminPulse',          subtitle: 'Admin Requests & Facilities' },
  'apis-tree':       { title: 'APIS Tree',           subtitle: 'Organisation Structure' },
  'policies':        { title: 'Policies',            subtitle: 'Policies & Guidelines' },
  'admin-console':   { title: 'Administrator',       subtitle: 'People, Access & Master Data' },
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

/* The whole product sits behind one sign-in. Every tool on this server used
   to be reachable by anyone who knew its URL; PortalGate is the single door,
   and it hands the signed-in person down so the shell can greet them by name
   and the router can refuse tools they may not open. */
export default function App() {
  return <PortalGate>{session => <Workspace session={session} />}</PortalGate>;
}

function Workspace({ session }: { session: { user: PortalUser; signOut: () => void } }) {
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
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" /></div>}>
        <AppraisalPage onNavigateBack={() => {}} />
      </Suspense>
    );
  }

  // Hub builds expose only Appraisal + EOM, and keep their own minimal landing.
  if (HUB_MODE && view === 'home') {
    return <HubRestrictedHome onNavigateToAppraisal={() => navigate('appraisal')} onNavigateToEOM={() => navigate('eom')} />;
  }

  const meta = VIEW_META[view];

  /* A tool the signed-in user may not open is not rendered at all, however
     they got here — a hidden sidebar entry is a courtesy, not a control. The
     server enforces the same rule on every request; this is what stops the
     screen from drawing something the API will then refuse. */
  const mayOpen = (v: AppView) =>
    v === 'admin-console' ? session.user.is_superadmin
                          : session.user.allowed_apps.includes(v);

  if (view !== 'home' && !mayOpen(view)) {
    return (
      <IntranetShell active="home" onNavigate={v => navigate(v as AppView)}
        title={meta.title} subtitle={meta.subtitle}
        userName={session.user.name} onSignOut={session.signOut}
        isSuperadmin={session.user.is_superadmin} allowedApps={session.user.allowed_apps}>
        <div className="max-w-md mx-auto text-center py-20">
          <p className="text-lg font-black text-slate-800">You don't have access to this tool</p>
          <p className="text-sm text-slate-500 mt-1.5">
            Ask an administrator to grant it, then sign in again.
          </p>
          <button onClick={() => navigate('home')}
            className="mt-5 bg-slate-900 text-white font-black px-5 py-2.5 rounded-xl text-sm">
            Back to the dashboard
          </button>
        </div>
      </IntranetShell>
    );
  }

  /* Every screen renders inside the one shell — same sidebar, same header —
     so switching tools only swaps the centre. Tools must not draw their own
     sidebar or top-level header. */
  return (
    <IntranetShell active={view === 'admin-console' ? 'home' : view}
      onNavigate={v => navigate(v as AppView)}
      title={meta.title} subtitle={meta.subtitle}
      userName={session.user.name} onSignOut={session.signOut}
      isSuperadmin={session.user.is_superadmin} allowedApps={session.user.allowed_apps}>
      <Suspense fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
        </div>
      }>
      {view === 'admin-console' ? (
        <AdminConsoleLazy me={session.user} />
      ) : view === 'home' ? (
        <IntranetHomePage onNavigate={navigate} allowedApps={session.user.allowed_apps} isSuperadmin={session.user.is_superadmin} />
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
      ) : view === 'goal-setting' ? (
        <GoalSettingPage onNavigateBack={() => navigate('home')} />
      ) : (
        <AppraisalPage />
      )}
      </Suspense>
    </IntranetShell>
  );
}

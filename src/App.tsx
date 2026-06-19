import { useState } from 'react';
import { PerformancePage } from './Pages/PerformancePage';
import { AppraisalPage } from './Pages/AppraisalPage';
import { DataExtractorPage } from './Pages/DataExtractorPage';
import { EOMPage } from './Pages/EOMPage';
import PMSPage from './Pages/PMSPage';

type AppView = 'extractor' | 'performance' | 'appraisal' | 'eom' | 'pms';

// 'appraisal' = appraisal only (legacy), 'hub' = appraisal + eom only, anything else = all
const APP_MODE = import.meta.env.VITE_APP_MODE;

const VIEW_KEY = 'apis_app_view';

function saveView(v: AppView) { localStorage.setItem(VIEW_KEY, v); }

export default function App() {
  const [view, setView] = useState<AppView>(() => {
    if (APP_MODE === 'appraisal') return 'appraisal';
    const saved = localStorage.getItem(VIEW_KEY) as AppView | null;
    return saved || 'extractor';
  });

  const navigate = (v: AppView) => { setView(v); saveView(v); };

  // Legacy appraisal-only mode
  if (APP_MODE === 'appraisal') {
    return <AppraisalPage onNavigateBack={() => {}} />;
  }

  return (
    <div>
      {view === 'extractor' ? (
        <DataExtractorPage
          onNavigateToPerformance={APP_MODE === 'hub' ? undefined : () => navigate('performance')}
          onNavigateToAppraisal={() => navigate('appraisal')}
          onNavigateToEOM={() => navigate('eom')}
          onNavigateToPMS={() => navigate('pms')}
        />
      ) : view === 'performance' ? (
        <PerformancePage onNavigateBack={() => navigate('extractor')} />
      ) : view === 'eom' ? (
        <EOMPage onNavigateBack={() => navigate('extractor')} />
      ) : view === 'pms' ? (
        <div>
          <div className="fixed top-3 left-3 z-50">
            <button onClick={() => navigate('extractor')}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 backdrop-blur border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all">
              ← Back
            </button>
          </div>
          <PMSPage />
        </div>
      ) : (
        <AppraisalPage onNavigateBack={() => navigate('extractor')} />
      )}
    </div>
  );
}

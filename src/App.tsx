import { useState } from 'react';
import { PerformancePage } from './Pages/PerformancePage';
import { AppraisalPage } from './Pages/AppraisalPage';
import { DataExtractorPage } from './Pages/DataExtractorPage';
import { EOMPage } from './Pages/EOMPage';

type AppView = 'extractor' | 'performance' | 'appraisal' | 'eom';

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
        />
      ) : view === 'performance' ? (
        <PerformancePage onNavigateBack={() => navigate('extractor')} />
      ) : view === 'eom' ? (
        <EOMPage onNavigateBack={() => navigate('extractor')} />
      ) : (
        <AppraisalPage onNavigateBack={() => navigate('extractor')} />
      )}
    </div>
  );
}

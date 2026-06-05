import { useState } from 'react';
import { PerformancePage } from './Pages/PerformancePage';
import { AppraisalPage } from './Pages/AppraisalPage';
import { DataExtractorPage } from './Pages/DataExtractorPage';
import { EOMPage } from './Pages/EOMPage';

type AppView = 'extractor' | 'performance' | 'appraisal' | 'eom';

const APPRAISAL_ONLY = import.meta.env.VITE_APP_MODE === 'appraisal';

const VIEW_KEY = 'apis_app_view';

function saveView(v: AppView) { localStorage.setItem(VIEW_KEY, v); }

export default function App() {
  const [view, setView] = useState<AppView>(() => {
    if (APPRAISAL_ONLY) return 'appraisal';
    const saved = localStorage.getItem(VIEW_KEY) as AppView | null;
    return saved || 'extractor';
  });

  const navigate = (v: AppView) => { setView(v); saveView(v); };

  if (APPRAISAL_ONLY) {
    return <AppraisalPage onNavigateBack={() => {}} />;
  }

  return (
    <div>
      {view === 'extractor' ? (
        <DataExtractorPage
          onNavigateToPerformance={() => navigate('performance')}
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

import { useState } from 'react';
import { PerformancePage } from './Pages/PerformancePage';
import { AppraisalPage } from './Pages/AppraisalPage';
import { DataExtractorPage } from './Pages/DataExtractorPage';
import { EOMPage } from './Pages/EOMPage';

type AppView = 'extractor' | 'performance' | 'appraisal' | 'eom';

const APPRAISAL_ONLY = import.meta.env.VITE_APP_MODE === 'appraisal';

export default function App() {
  const [view, setView] = useState<AppView>(APPRAISAL_ONLY ? 'appraisal' : 'extractor');

  if (APPRAISAL_ONLY) {
    return <AppraisalPage onNavigateBack={() => {}} />;
  }

  return (
    <div>
      {view === 'extractor' ? (
        <DataExtractorPage
          onNavigateToPerformance={() => setView('performance')}
          onNavigateToAppraisal={() => setView('appraisal')}
          onNavigateToEOM={() => setView('eom')}
        />
      ) : view === 'performance' ? (
        <PerformancePage onNavigateBack={() => setView('extractor')} />
      ) : view === 'eom' ? (
        <EOMPage onNavigateBack={() => setView('extractor')} />
      ) : (
        <AppraisalPage onNavigateBack={() => setView('extractor')} />
      )}
    </div>
  );
}

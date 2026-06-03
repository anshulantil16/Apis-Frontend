import { useState } from 'react';
import { PerformancePage } from './Pages/PerformancePage';
import { AppraisalPage } from './Pages/AppraisalPage';
import { DataExtractorPage } from './Pages/DataExtractorPage';

type AppView = 'extractor' | 'performance' | 'appraisal';

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
        />
      ) : view === 'performance' ? (
        <PerformancePage onNavigateBack={() => setView('extractor')} />
      ) : (
        <AppraisalPage onNavigateBack={() => setView('extractor')} />
      )}
    </div>
  );
}

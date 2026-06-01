import { useState } from 'react';
import { PerformancePage } from './Pages/PerformancePage';
import { AppraisalPage } from './Pages/AppraisalPage';
import { DataExtractorPage } from './Pages/DataExtractorPage';

type AppView = 'extractor' | 'performance' | 'appraisal';

export default function App() {
  const [view, setView] = useState<AppView>('extractor');

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
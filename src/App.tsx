import { useState } from 'react';
import { PerformancePage } from './Pages/PerformancePage';
import { DataExtractorPage } from './Pages/DataExtractorPage';

type AppView = 'extractor' | 'performance';

export default function App() {
  const [view, setView] = useState<AppView>('extractor');

  return (
    <div>
      {view === 'extractor' ? (
        <DataExtractorPage onNavigateToPerformance={() => setView('performance')} />
      ) : (
        <PerformancePage onNavigateBack={() => setView('extractor')} />
      )}
    </div>
  );
}
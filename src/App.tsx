import { useState } from 'react';
import { PerformancePage } from './Pages/PerformancePage';
import { AppraisalPage } from './Pages/AppraisalPage';
import { DataExtractorPage } from './Pages/DataExtractorPage';
import { EOMPage } from './Pages/EOMPage';
import PMSPage from './Pages/PMSPage';
import { OfferLetterSimplePage } from './Pages/OfferLetterSimplePage';
import OfferLetterApprovalDashboard from './Pages/OfferLetterApprovalDashboard';
import { TadaPage } from './Pages/TadaPage';

type AppView = 'extractor' | 'performance' | 'appraisal' | 'eom' | 'pms' | 'offer-letters' | 'offer-approvals' | 'tada';

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
          onNavigateToOfferLetters={() => navigate('offer-letters')}
          onNavigateToTADA={() => navigate('tada')}
        />
      ) : view === 'tada' ? (
        <TadaPage onNavigateBack={() => navigate('extractor')} />
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
      ) : view === 'offer-letters' ? (
        <div>
          <div className="fixed top-3 left-3 z-50 flex gap-2">
            <button onClick={() => navigate('offer-approvals')}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600/80 backdrop-blur border border-green-700 text-white hover:bg-green-700 rounded-lg text-xs font-bold transition-all">
              📊 Approvals
            </button>
            <button onClick={() => navigate('extractor')}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 backdrop-blur border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all">
              ← Back
            </button>
          </div>
          <OfferLetterSimplePage />
        </div>
      ) : view === 'offer-approvals' ? (
        <div>
          <div className="fixed top-3 left-3 z-50">
            <button onClick={() => navigate('offer-letters')}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 backdrop-blur border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all">
              ← Back
            </button>
          </div>
          <OfferLetterApprovalDashboard />
        </div>
      ) : (
        <AppraisalPage onNavigateBack={() => navigate('extractor')} />
      )}
    </div>
  );
}

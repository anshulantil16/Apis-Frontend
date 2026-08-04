import { useState } from 'react';
import { FileText, FileWarning, ArrowLeft, ChevronRight } from 'lucide-react';
import { OfferLetterSimplePage } from './OfferLetterSimplePage';
import { WarningLetterPage } from './WarningLetterPage';

type LetterKind = 'appraisal' | 'warning';

/* Add a new letter type by appending one entry here plus its page component —
   the hub, routing and back-navigation all key off this list. */
const LETTERS: {
  id: LetterKind; title: string; blurb: string; icon: any;
  accent: string; ring: string; iconBg: string;
}[] = [
  {
    id: 'appraisal',
    title: 'Appraisal Letters',
    blurb: 'Annual compensation review, salary revision, promotion and redesignation letters with Annexure-A salary break-up.',
    icon: FileText,
    accent: 'from-blue-500 to-indigo-600',
    ring: 'hover:border-blue-400 hover:shadow-blue-100',
    iconBg: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'warning',
    title: 'Warning Letters',
    blurb: 'Verbal, written and final warnings plus show cause notices — issue to one employee or in bulk from Excel.',
    icon: FileWarning,
    accent: 'from-red-500 to-rose-600',
    ring: 'hover:border-red-400 hover:shadow-red-100',
    iconBg: 'bg-red-50 text-red-600',
  },
];

export function LettersGeneratorPage() {
  const [kind, setKind] = useState<LetterKind | null>(null);

  if (kind) {
    const active = LETTERS.find(l => l.id === kind)!;
    return (
      <div>
        <div className="fixed top-3 left-3 z-50">
          <button onClick={() => setKind(null)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 backdrop-blur
                       border border-slate-700 text-slate-300 hover:text-white rounded-lg
                       text-xs font-bold transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />All Letters
          </button>
        </div>
        {active.id === 'appraisal' ? <OfferLetterSimplePage /> : <WarningLetterPage />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-slate-900 mb-3">✉️ Letters Generator</h1>
          <p className="text-slate-600 max-w-xl mx-auto">
            Choose the type of letter you want to create. Each one has its own template,
            history and bulk download.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {LETTERS.map(l => {
            const Icon = l.icon;
            return (
              <button key={l.id} onClick={() => setKind(l.id)}
                className={`group text-left bg-white rounded-2xl border-2 border-slate-200
                            p-6 shadow-sm transition-all hover:shadow-xl ${l.ring}`}>
                <div className={`w-12 h-12 rounded-xl ${l.iconBg} flex items-center
                                 justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-1">
                  {l.title}
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500
                                           group-hover:translate-x-0.5 transition-all" />
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">{l.blurb}</p>
                <div className={`mt-5 h-1 w-full rounded-full bg-gradient-to-r ${l.accent}
                                 opacity-0 group-hover:opacity-100 transition-opacity`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default LettersGeneratorPage;

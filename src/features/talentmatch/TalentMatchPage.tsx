/* TalentMatch - compare resumes against a job description and shortlist.
 *
 * HR uploads one JD and any number of resumes (PDF or DOCX). Everything is
 * read and compared here in the browser (readFile.ts, analyze.ts): no file
 * leaves the computer. The result is a ranking with reasons - which skills
 * matched and which are missing, experience, education, certifications -
 * that HR can re-weigh and re-filter on the spot. It assists shortlisting;
 * it doesn't make hiring decisions, and says so. */
import { useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import {
  Award, Briefcase, ChevronDown, CircleCheck, CircleX, Crown, Download, Factory, FileText, FileUp, GraduationCap,
  Info, ListChecks, Lock, MapPin, Medal, Plus, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Sparkles, Star,
  Table2, Target, Trash2, Trophy, TriangleAlert, UserSearch, Users, X,
} from 'lucide-react';
import { ACCEPT, ReadError, readFileText } from './readFile';
import {
  DEFAULT_WEIGHTS, HOME_INDUSTRY, WEIGHT_LABELS, profileJob, profileResume, rank,
  type Candidate, type JobProfile, type Match, type Weights,
} from './analyze';
import { CITIES, INDUSTRIES, cityByName } from './places';
import { csvOf, download, reportHtml } from './report';

interface Doc { id: string; file: File; status: 'reading' | 'ready' | 'error'; progress: number; text?: string; error?: string }

const BAND: Record<Match['band'], { text: string; soft: string; ring: string; bar: string; stroke: string }> = {
  'Strong match': { text: 'text-emerald-700', soft: 'bg-emerald-50', ring: 'ring-emerald-200', bar: 'from-emerald-400 to-emerald-600', stroke: '#10b981' },
  'Good match': { text: 'text-amber-700', soft: 'bg-amber-50', ring: 'ring-amber-200', bar: 'from-amber-400 to-amber-600', stroke: '#f59e0b' },
  'Partial match': { text: 'text-orange-700', soft: 'bg-orange-50', ring: 'ring-orange-200', bar: 'from-orange-400 to-orange-600', stroke: '#f97316' },
  'Low match': { text: 'text-rose-700', soft: 'bg-rose-50', ring: 'ring-rose-200', bar: 'from-rose-400 to-rose-600', stroke: '#f43f5e' },
};

const INDUSTRY_FIT: Record<NonNullable<Match['industryFit']> | 'unknown', { text: string }> = {
  same: { text: 'text-emerald-700' }, related: { text: 'text-amber-700' }, other: { text: 'text-rose-600' }, unknown: { text: 'text-slate-400' },
};

/* "Ghaziabad", "Lucknow · 417 km", or a dash. */
const placeOf = (m: Match) => !m.candidate.location ? '—'
  : m.distance !== null && m.distance > 40 ? `${m.candidate.location} · ${m.distance} km` : m.candidate.location;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const yrs = (n: number | null) => (n === null ? '—' : `${n} yr${n === 1 ? '' : 's'}`);
const sizeOf = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const okFile = (f: File) => /\.(pdf|docx|txt|doc)$/i.test(f.name);

let nextId = 0;
const newId = () => `doc${++nextId}`;

export function TalentMatchPage() {
  const [jd, setJd] = useState<Doc | null>(null);
  const [resumes, setResumes] = useState<Doc[]>([]);
  const [job, setJob] = useState<JobProfile | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [phase, setPhase] = useState<'upload' | 'analyzing' | 'results'>('upload');
  const [analyzed, setAnalyzed] = useState(0);
  /* Files changed since the last analysis. */
  const [stale, setStale] = useState(false);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const results = useRef<HTMLDivElement>(null);

  const read = async (doc: Doc, set: (fn: (d: Doc) => Doc) => void) => {
    try {
      const text = await readFileText(doc.file, p => set(d => ({ ...d, progress: p })));
      set(d => ({ ...d, status: 'ready', progress: 1, text }));
    } catch (e) {
      set(d => ({ ...d, status: 'error', error: e instanceof ReadError ? e.message : 'This file couldn’t be read.' }));
    }
  };

  const setJdFile = (file: File) => {
    const doc: Doc = { id: newId(), file, status: 'reading', progress: 0 };
    setJd(doc);
    if (phase === 'results') setStale(true);
    void read(doc, fn => setJd(d => (d && d.id === doc.id ? fn(d) : d)));
  };

  const addResumes = (files: File[]) => {
    const fresh = files.filter(okFile).filter(f => !resumes.some(r => r.file.name === f.name && r.file.size === f.size))
      .map(file => ({ id: newId(), file, status: 'reading' as const, progress: 0 }));
    if (!fresh.length) return;
    setResumes(rs => [...rs, ...fresh]);
    if (phase === 'results') setStale(true);
    for (const doc of fresh) void read(doc, fn => setResumes(rs => rs.map(r => (r.id === doc.id ? fn(r) : r))));
  };

  const removeResume = (id: string) => {
    setResumes(rs => rs.filter(r => r.id !== id));
    setCandidates(cs => cs.filter(c => c.id !== id));
  };

  const ready = resumes.filter(r => r.status === 'ready');
  const reading = resumes.some(r => r.status === 'reading') || jd?.status === 'reading';
  const canAnalyze = jd?.status === 'ready' && ready.length > 0 && !reading && phase !== 'analyzing';

  const analyze = async () => {
    if (!jd?.text || !canAnalyze) return;
    setPhase('analyzing');
    setAnalyzed(0);
    const profile = profileJob(jd.text, jd.file.name);
    const out: Candidate[] = [];
    for (const r of ready) {
      out.push(profileResume(r.id, r.text as string, r.file.name));
      setAnalyzed(out.length);
      /* A beat per resume, so the progress is something you can see. */
      await sleep(140);
    }
    setJob(profile);
    setCandidates(out);
    setStale(false);
    setPhase('results');
    setTimeout(() => results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const reset = () => {
    setJd(null); setResumes([]); setJob(null); setCandidates([]); setPhase('upload'); setStale(false); setWeights(DEFAULT_WEIGHTS);
  };

  const matches = useMemo(() => (job ? rank(job, candidates, weights) : []), [job, candidates, weights]);

  return (
    <div className="min-h-full bg-gradient-to-b from-amber-50/60 via-white to-orange-50/40 px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <Hero onReset={phase !== 'upload' || jd || resumes.length ? reset : undefined} />

        <Steps jd={jd?.status === 'ready'} resumes={ready.length > 0} done={phase === 'results'} />

        <div className="grid lg:grid-cols-5 gap-5">
          <JdCard doc={jd} onFile={setJdFile} onRemove={() => { setJd(null); if (phase === 'results') setStale(true); }} />
          <ResumesCard docs={resumes} onFiles={addResumes} onRemove={removeResume} />
        </div>

        <AnalyzeBar ready={ready.length} jdReady={jd?.status === 'ready'} reading={!!reading} phase={phase}
          analyzed={analyzed} total={ready.length} stale={stale} canAnalyze={!!canAnalyze} onAnalyze={() => void analyze()} />

        {phase === 'results' && job && (
          <div ref={results} className="space-y-6 scroll-mt-4">
            <Results job={job} setJob={setJob} matches={matches} weights={weights} setWeights={setWeights} jdFile={jd?.file.name ?? 'JD'} />
          </div>
        )}

        <p className="flex items-start gap-2 text-[11.5px] text-slate-500 max-w-3xl">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          TalentMatch compares the words in the JD and each resume — skills, years, degrees, certifications. It helps you
          shortlist; it doesn’t judge quality or potential, and it can miss skills written differently. Always read the resume before deciding.
        </p>
      </div>
    </div>
  );
}

/* ── top of the page ───────────────────────────────────────────────────── */

function Hero({ onReset }: { onReset?: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-6 sm:p-8 text-white shadow-xl shadow-amber-500/25">
      <div aria-hidden className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="absolute right-24 -bottom-24 w-64 h-64 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur flex items-center justify-center shadow-lg">
            <UserSearch className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">TalentMatch</h1>
            <p className="text-[13px] sm:text-[14px] font-semibold text-white/85">Compare resumes against a job description — and shortlist faster.</p>
          </div>
        </div>
        {onReset && (
          <button type="button" onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 ring-1 ring-white/30 text-[12px] font-black transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />Start over
          </button>
        )}
      </div>
      <div className="relative mt-5 flex flex-wrap gap-2 text-[11.5px] font-bold">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 ring-1 ring-white/25"><Lock className="w-3 h-3" />Read in your browser — nothing is uploaded</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 ring-1 ring-white/25"><ShieldCheck className="w-3 h-3" />Assists shortlisting — HR decides</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 ring-1 ring-white/25"><FileText className="w-3 h-3" />PDF & DOCX</span>
      </div>
    </div>
  );
}

function Steps({ jd, resumes, done }: { jd: boolean; resumes: boolean; done: boolean }) {
  const steps = [
    { label: 'Upload the JD', on: jd }, { label: 'Add resumes', on: resumes }, { label: 'Analyze & rank', on: done },
  ];
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black flex-shrink-0 transition-colors
            ${s.on ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-white ring-1 ring-slate-200 text-slate-400'}`}>
            {s.on ? <CircleCheck className="w-4 h-4" /> : i + 1}
          </span>
          <span className={`text-[12px] font-black truncate ${s.on ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</span>
          {i < steps.length - 1 && <span className={`flex-1 h-0.5 rounded-full ${s.on ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );
}

/* ── uploads ───────────────────────────────────────────────────────────── */

function DropZone({ multiple, onFiles, children, compact = false }: {
  multiple: boolean; onFiles: (files: File[]) => void; children: ReactNode; compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent) => {
    e.preventDefault(); setOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(multiple ? files : [files[0]]);
  };
  return (
    <div onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}
      onClick={() => input.current?.click()} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') input.current?.click(); }}
      className={`cursor-pointer rounded-2xl border-2 border-dashed text-center transition-all
        ${compact ? 'px-4 py-4' : 'px-5 py-8'}
        ${over ? 'border-amber-400 bg-amber-50 scale-[1.01]' : 'border-slate-200 bg-slate-50/60 hover:border-amber-300 hover:bg-amber-50/40'}`}>
      <input ref={input} type="file" accept={ACCEPT} multiple={multiple} className="hidden"
        onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) onFiles(f); e.target.value = ''; }} />
      {children}
    </div>
  );
}

function FileRow({ doc, onRemove, tone }: { doc: Doc; onRemove: () => void; tone: 'violet' | 'amber' }) {
  const accent = tone === 'violet' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700';
  return (
    <div className="group flex items-center gap-3 rounded-xl bg-white ring-1 ring-slate-200 px-3 py-2.5">
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black uppercase ${accent}`}>
        {doc.file.name.split('.').pop()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-bold text-slate-800">{doc.file.name}</p>
        {doc.status === 'reading' && (
          <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
              style={{ width: `${Math.max(8, doc.progress * 100)}%` }} />
          </div>
        )}
        {doc.status === 'ready' && (
          <p className="text-[11px] text-slate-400">{sizeOf(doc.file.size)} · {(doc.text?.split(/\s+/).length ?? 0).toLocaleString('en-IN')} words read</p>
        )}
        {doc.status === 'error' && <p className="text-[11px] font-semibold text-rose-600">{doc.error}</p>}
      </div>
      {doc.status === 'ready' && <CircleCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
      {doc.status === 'error' && <TriangleAlert className="w-4 h-4 text-rose-500 flex-shrink-0" />}
      <button type="button" onClick={onRemove} title="Remove"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function JdCard({ doc, onFile, onRemove }: { doc: Doc | null; onFile: (f: File) => void; onRemove: () => void }) {
  const [preview, setPreview] = useState(false);
  return (
    <section className="lg:col-span-2 rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm p-5 space-y-4">
      <header className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
          <Briefcase className="w-4.5 h-4.5" />
        </span>
        <div>
          <h2 className="text-[15px] font-black text-slate-900">Job Description</h2>
          <p className="text-[11.5px] text-slate-500">One file · PDF or DOCX</p>
        </div>
      </header>
      {!doc ? (
        <DropZone multiple={false} onFiles={f => onFile(f[0])}>
          <FileUp className="w-8 h-8 mx-auto text-amber-500" />
          <p className="mt-2 text-[13px] font-black text-slate-700">Drop the JD here, or click to choose</p>
          <p className="text-[11.5px] text-slate-400">The text is read automatically</p>
        </DropZone>
      ) : (
        <>
          <FileRow doc={doc} onRemove={onRemove} tone="amber" />
          <div className="flex items-center gap-3">
            <DropZone multiple={false} onFiles={f => onFile(f[0])} compact>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-black text-slate-600"><RefreshCw className="w-3.5 h-3.5" />Replace JD</span>
            </DropZone>
            {doc.status === 'ready' && (
              <button type="button" onClick={() => setPreview(p => !p)}
                className="text-[11.5px] font-black text-amber-600 hover:text-amber-700 whitespace-nowrap">
                {preview ? 'Hide text' : 'Preview text'}
              </button>
            )}
          </div>
          {preview && doc.text && (
            <pre className="max-h-56 overflow-auto rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 text-[11px] text-slate-600 whitespace-pre-wrap font-sans">{doc.text}</pre>
          )}
        </>
      )}
    </section>
  );
}

function ResumesCard({ docs, onFiles, onRemove }: { docs: Doc[]; onFiles: (f: File[]) => void; onRemove: (id: string) => void }) {
  const ready = docs.filter(d => d.status === 'ready').length;
  return (
    <section className="lg:col-span-3 rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm p-5 space-y-4">
      <header className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
          <Users className="w-4.5 h-4.5" />
        </span>
        <div className="flex-1">
          <h2 className="text-[15px] font-black text-slate-900">Candidate Resumes</h2>
          <p className="text-[11.5px] text-slate-500">As many as you like · PDF or DOCX</p>
        </div>
        {docs.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-amber-50 ring-1 ring-amber-200 text-[11px] font-black text-amber-700">
            {ready}/{docs.length} ready
          </span>
        )}
      </header>
      <DropZone multiple onFiles={onFiles} compact={docs.length > 0}>
        <FileUp className={`mx-auto text-amber-500 ${docs.length ? 'w-5 h-5' : 'w-8 h-8'}`} />
        <p className={`font-black text-slate-700 ${docs.length ? 'text-[12px] mt-1' : 'text-[13px] mt-2'}`}>
          {docs.length ? 'Add more resumes' : 'Drop resumes here, or click to choose several'}
        </p>
        {!docs.length && <p className="text-[11.5px] text-slate-400">Each is read in your browser</p>}
      </DropZone>
      {docs.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
          {docs.map(d => <FileRow key={d.id} doc={d} onRemove={() => onRemove(d.id)} tone="violet" />)}
        </div>
      )}
    </section>
  );
}

function AnalyzeBar({ ready, jdReady, reading, phase, analyzed, total, stale, canAnalyze, onAnalyze }: {
  ready: number; jdReady: boolean; reading: boolean; phase: string; analyzed: number; total: number;
  stale: boolean; canAnalyze: boolean; onAnalyze: () => void;
}) {
  const hint = !jdReady ? 'Upload a JD to start' : !ready ? 'Add at least one resume' : reading ? 'Still reading files…'
    : stale ? 'Files changed since the last analysis — run it again' : `${ready} resume${ready === 1 ? '' : 's'} ready to compare`;
  return (
    <div className="sticky top-2 z-10 rounded-2xl bg-white/90 backdrop-blur ring-1 ring-slate-200 shadow-lg shadow-slate-900/5 p-3 sm:p-4
                    flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[12rem]">
        {phase === 'analyzing' ? (
          <>
            <p className="text-[12.5px] font-black text-slate-800">Analyzing {analyzed} of {total}…</p>
            <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 transition-all duration-150"
                style={{ width: `${(analyzed / Math.max(total, 1)) * 100}%` }} />
            </div>
          </>
        ) : (
          <p className={`text-[12.5px] font-bold ${stale ? 'text-amber-700' : 'text-slate-600'}`}>{hint}</p>
        )}
      </div>
      <button type="button" onClick={onAnalyze} disabled={!canAnalyze}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[13px] font-black
                   shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 hover:shadow-xl transition-all
                   disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-none">
        <Sparkles className="w-4 h-4" />{phase === 'results' ? 'Re-analyze' : 'Analyze & Rank Candidates'}
      </button>
    </div>
  );
}

/* ── results ───────────────────────────────────────────────────────────── */

function Results({ job, setJob, matches, weights, setWeights, jdFile }: {
  job: JobProfile; setJob: (j: JobProfile) => void; matches: Match[];
  weights: Weights; setWeights: (w: Weights) => void; jdFile: string;
}) {
  const [query, setQuery] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [meetsExp, setMeetsExp] = useState(false);
  const [sameIndustry, setSameIndustry] = useState(false);
  /* 0 = any distance. A candidate whose city isn't known stays in. */
  const [maxKm, setMaxKm] = useState(0);
  const [view, setView] = useState<'ranking' | 'matrix'>('ranking');
  const [open, setOpen] = useState<string | null>(null);

  const shown = matches.filter(m => {
    if (m.score < minScore) return false;
    if (meetsExp && m.meetsExperience === false) return false;
    if (sameIndustry && m.industryFit !== 'same') return false;
    if (maxKm && m.distance !== null && m.distance > maxKm) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return m.candidate.name.toLowerCase().includes(q) || [...m.candidate.skills.keys()].some(s => s.toLowerCase().includes(q));
  });
  const rankOf = (m: Match) => matches.indexOf(m) + 1;

  return (
    <>
      <JobPanel job={job} setJob={setJob} />
      <WeightsPanel weights={weights} setWeights={setWeights} />
      <Podium top={matches.slice(0, 3)} onOpen={id => { setView('ranking'); setOpen(id); }} />

      <section className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-100">
          <div className="flex rounded-xl bg-slate-100 p-1">
            {([['ranking', 'Ranking', ListChecks], ['matrix', 'Skills matrix', Table2]] as const).map(([v, label, Icon]) => (
              <button key={v} type="button" onClick={() => setView(v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-black transition-all
                  ${view === v ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 focus-within:ring-amber-400 flex-1 min-w-[12rem]">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or skill…"
              className="flex-1 bg-transparent text-[12.5px] focus:outline-none" />
          </label>
          <label className="flex items-center gap-2 text-[11.5px] font-bold text-slate-600">
            Min score <b className="w-7 text-amber-700">{minScore}</b>
            <input type="range" min={0} max={90} step={5} value={minScore} onChange={e => setMinScore(Number(e.target.value))} className="accent-amber-500 w-28" />
          </label>
          <label className="flex items-center gap-2 text-[11.5px] font-bold text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={meetsExp} onChange={e => setMeetsExp(e.target.checked)} className="accent-amber-500 w-4 h-4" />
            Meets experience
          </label>
          <label className="flex items-center gap-2 text-[11.5px] font-bold text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={sameIndustry} onChange={e => setSameIndustry(e.target.checked)} className="accent-amber-500 w-4 h-4" />
            Same industry
          </label>
          <select value={maxKm} onChange={e => setMaxKm(Number(e.target.value))} title="Distance from the job"
            className="px-2 py-2 rounded-xl ring-1 ring-slate-200 bg-white text-[11.5px] font-bold text-slate-600 focus:outline-none focus:ring-amber-400">
            <option value={0}>Any distance</option>
            <option value={40}>Same city</option>
            <option value={150}>Within 150 km</option>
            <option value={350}>Within 350 km</option>
            <option value={800}>Within 800 km</option>
          </select>
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={() => download(`TalentMatch-${job.title.replace(/[^\w]+/g, '-')}.csv`, csvOf(matches), 'text/csv')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl ring-1 ring-slate-200 hover:bg-slate-50 text-[12px] font-black text-slate-700">
              <Download className="w-3.5 h-3.5" />CSV
            </button>
            <button type="button" onClick={() => download(`TalentMatch-report-${job.title.replace(/[^\w]+/g, '-')}.html`, reportHtml(job, matches, jdFile), 'text/html')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[12px] font-black shadow-sm">
              <Download className="w-3.5 h-3.5" />Full report
            </button>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="p-10 text-center text-[13px] text-slate-500">No candidate matches these filters.</p>
        ) : view === 'ranking' ? (
          <div className="divide-y divide-slate-100">
            {shown.map(m => (
              <CandidateRow key={m.candidate.id} m={m} rank={rankOf(m)} job={job}
                open={open === m.candidate.id} onToggle={() => setOpen(o => (o === m.candidate.id ? null : m.candidate.id))} />
            ))}
          </div>
        ) : (
          <Matrix job={job} matches={shown} rankOf={rankOf} />
        )}
      </section>
    </>
  );
}

/* What TalentMatch read from the JD - and HR's chance to correct it. */
function JobPanel({ job, setJob }: { job: JobProfile; setJob: (j: JobProfile) => void }) {
  const [adding, setAdding] = useState('');
  const [showResp, setShowResp] = useState(false);
  const add = () => {
    const s = adding.trim();
    if (s && !job.required.includes(s) && !job.preferred.includes(s)) setJob({ ...job, required: [...job.required, s] });
    setAdding('');
  };
  const toggle = (s: string, from: 'required' | 'preferred') => setJob(from === 'required'
    ? { ...job, required: job.required.filter(x => x !== s), preferred: [...job.preferred, s] }
    : { ...job, preferred: job.preferred.filter(x => x !== s), required: [...job.required, s] });
  const remove = (s: string) => setJob({ ...job, required: job.required.filter(x => x !== s), preferred: job.preferred.filter(x => x !== s) });

  return (
    <section className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm p-5 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-black uppercase tracking-widest text-amber-600">What the JD asks for</p>
          <input value={job.title} onChange={e => setJob({ ...job, title: e.target.value })}
            className="mt-0.5 text-[20px] font-black text-slate-900 bg-transparent rounded-lg px-1 -mx-1 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none w-full max-w-xl" />
        </div>
        <p className="text-[11px] text-slate-400 max-w-xs">Read from the JD automatically. Click a skill to move it between required and preferred, × to drop it — the ranking updates as you go.</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Fact icon={<Briefcase className="w-4 h-4" />} label="Experience">
          <span className="inline-flex items-center gap-1">
            <input type="number" min={0} max={40} value={job.minExp ?? ''} placeholder="—"
              onChange={e => setJob({ ...job, minExp: e.target.value === '' ? null : Number(e.target.value) })}
              className="w-12 px-1.5 py-0.5 rounded-md ring-1 ring-slate-200 text-[13px] font-black focus:outline-none focus:ring-amber-400" />
            {job.maxExp ? `– ${job.maxExp}` : '+'} yrs
          </span>
        </Fact>
        <Fact icon={<GraduationCap className="w-4 h-4" />} label="Education">
          {job.education.labels.join(', ') || 'Not stated'}
          {job.fields.length > 0 && <span className="block text-[11px] font-bold text-slate-500">in {job.fields.join(' / ')}</span>}
        </Fact>
        <Fact icon={<Award className="w-4 h-4" />} label="Certifications">{job.certifications.join(', ') || 'None asked'}</Fact>
        <Fact icon={<MapPin className="w-4 h-4" />} label="Job location">
          <input list="tm-cities" value={job.location ?? ''} placeholder="City…"
            onChange={e => setJob({ ...job, location: cityByName(e.target.value)?.name ?? (e.target.value || null) })}
            className="w-full px-2 py-0.5 rounded-md ring-1 ring-slate-200 text-[13px] font-black focus:outline-none focus:ring-amber-400" />
          <datalist id="tm-cities">{CITIES.map(ct => <option key={ct.name} value={ct.name} />)}</datalist>
          {job.location && !cityByName(job.location) && <span className="block text-[10.5px] font-bold text-rose-600">Pick a city from the list</span>}
        </Fact>
        <Fact icon={<Factory className="w-4 h-4" />} label="Industry wanted">
          <span className="text-[12px]">{job.industries.join(', ') || 'Any'}</span>
        </Fact>
      </div>

      {/* Which industries count as "same" - read from the JD to start with. */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 mb-1.5">Candidates should come from <span className="text-slate-300">· click to change</span></p>
        <div className="flex flex-wrap gap-1.5">
          {INDUSTRIES.map(ind => {
            const on = job.industries.includes(ind.name);
            return (
              <button key={ind.name} type="button"
                onClick={() => setJob({ ...job, industries: on ? job.industries.filter(x => x !== ind.name) : [...job.industries, ind.name] })}
                className={`px-2.5 py-1 rounded-full ring-1 text-[11.5px] font-bold transition-colors
                  ${on ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white ring-orange-400 shadow-sm' : 'bg-white text-slate-600 ring-slate-200 hover:bg-amber-50'}`}>
                {ind.name}{ind.name === HOME_INDUSTRY && ' · APIS'}
              </button>
            );
          })}
        </div>
      </div>

      <SkillGroup title="Required skills" tone="required" skills={job.required} onToggle={s => toggle(s, 'required')} onRemove={remove} />
      <SkillGroup title="Preferred skills" tone="preferred" skills={job.preferred} onToggle={s => toggle(s, 'preferred')} onRemove={remove} />

      <div className="flex items-center gap-2">
        <input value={adding} onChange={e => setAdding(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }}
          placeholder="Add a skill the JD should require…"
          className="flex-1 max-w-sm px-3 py-2 rounded-xl ring-1 ring-slate-200 text-[12.5px] focus:outline-none focus:ring-amber-400" />
        <button type="button" onClick={add} disabled={!adding.trim()}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[12px] font-black disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" />Add
        </button>
      </div>

      {job.responsibilities.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowResp(s => !s)}
            className="inline-flex items-center gap-1 text-[12px] font-black text-slate-600 hover:text-amber-700">
            <ChevronDown className={`w-4 h-4 transition-transform ${showResp ? 'rotate-180' : ''}`} />
            {job.responsibilities.length} responsibilities found
          </button>
          {showResp && (
            <ul className="mt-2 grid md:grid-cols-2 gap-x-6 gap-y-1 list-disc pl-5">
              {job.responsibilities.map(r => <li key={r} className="text-[12px] text-slate-600">{r}</li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wide text-slate-400">{icon}{label}</p>
      <div className="mt-1 text-[13px] font-black text-slate-800">{children}</div>
    </div>
  );
}

function SkillGroup({ title, tone, skills, onToggle, onRemove }: {
  title: string; tone: 'required' | 'preferred'; skills: string[]; onToggle: (s: string) => void; onRemove: (s: string) => void;
}) {
  const cls = tone === 'required' ? 'bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100' : 'bg-sky-50 text-sky-800 ring-sky-200 hover:bg-sky-100';
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 mb-1.5">{title} <span className="text-slate-300">· {skills.length}</span></p>
      {skills.length === 0 ? <p className="text-[12px] text-slate-400">None found — add one below.</p> : (
        <div className="flex flex-wrap gap-1.5">
          {skills.map(s => (
            <span key={s} className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full ring-1 text-[11.5px] font-bold transition-colors ${cls}`}>
              <button type="button" onClick={() => onToggle(s)} title={tone === 'required' ? 'Make preferred' : 'Make required'}>{s}</button>
              <button type="button" onClick={() => onRemove(s)} title="Remove" className="w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function WeightsPanel({ weights, setWeights }: { weights: Weights; setWeights: (w: Weights) => void }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(WEIGHT_LABELS) as (keyof Weights)[];
  return (
    <section className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-5 py-3.5 text-left">
        <SlidersHorizontal className="w-4 h-4 text-amber-600" />
        <span className="flex-1 text-[13px] font-black text-slate-800">Scoring weights</span>
        <span className="hidden sm:block text-[11px] text-slate-400">{keys.map(k => `${WEIGHT_LABELS[k].split(' ')[0]} ${weights[k]}`).join(' · ')}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
          {keys.map(k => (
            <label key={k} className="block">
              <span className="flex justify-between text-[12px] font-bold text-slate-600">{WEIGHT_LABELS[k]}<b className="text-amber-700">{weights[k]}</b></span>
              <input type="range" min={0} max={60} step={5} value={weights[k]}
                onChange={e => setWeights({ ...weights, [k]: Number(e.target.value) })} className="w-full accent-amber-500" />
            </label>
          ))}
          <p className="sm:col-span-2 lg:col-span-3 text-[11px] text-slate-400">
            Weights are relative — they’re scaled to 100. A part the JD doesn’t mention is left out of the score.
            <button type="button" onClick={() => setWeights(DEFAULT_WEIGHTS)} className="ml-2 font-black text-amber-600 hover:text-amber-700">Reset</button>
          </p>
        </div>
      )}
    </section>
  );
}

function ScoreRing({ score, band, size = 64 }: { score: number; band: Match['band']; size?: number }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BAND[band].stroke} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-black text-slate-800" style={{ fontSize: size / 3.6 }}>{score}</span>
    </div>
  );
}

const MEDAL = [
  { label: '1st', icon: Crown, card: 'from-amber-300 via-amber-400 to-yellow-500', glow: 'shadow-amber-500/30' },
  { label: '2nd', icon: Medal, card: 'from-slate-300 via-slate-400 to-slate-500', glow: 'shadow-slate-500/25' },
  { label: '3rd', icon: Award, card: 'from-orange-300 via-orange-400 to-amber-600', glow: 'shadow-orange-500/25' },
];

function Podium({ top, onOpen }: { top: Match[]; onOpen: (id: string) => void }) {
  if (!top.length) return null;
  return (
    <section>
      <h2 className="flex items-center gap-2 text-[15px] font-black text-slate-900 mb-3"><Trophy className="w-4.5 h-4.5 text-amber-500" />Top {top.length} preferred candidate{top.length === 1 ? '' : 's'}</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {top.map((m, i) => {
          const md = MEDAL[i];
          return (
            <button key={m.candidate.id} type="button" onClick={() => onOpen(m.candidate.id)}
              className={`text-left rounded-3xl bg-white ring-1 ring-slate-200 shadow-lg ${md.glow} overflow-hidden hover:-translate-y-1 transition-all`}>
              <div className={`h-1.5 bg-gradient-to-r ${md.card}`} />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${md.card} text-white flex items-center justify-center shadow-md`}>
                    <md.icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] font-black uppercase tracking-widest text-slate-400">{md.label} choice</p>
                    <p className="truncate text-[15px] font-black text-slate-900">{m.candidate.name}</p>
                  </div>
                  <ScoreRing score={m.score} band={m.band} size={56} />
                </div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full ring-1 text-[11px] font-black ${BAND[m.band].soft} ${BAND[m.band].text} ${BAND[m.band].ring}`}>{m.band}</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="Required" value={`${m.matchedRequired.length}/${m.matchedRequired.length + m.missingRequired.length}`} />
                  <MiniStat label="Experience" value={yrs(m.candidate.experience)} />
                  <MiniStat label="Location" value={m.candidate.location ?? '—'} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.matchedRequired.slice(0, 5).map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-bold">{s}</span>)}
                  {m.matchedRequired.length > 5 && <span className="text-[10.5px] font-bold text-slate-400">+{m.matchedRequired.length - 5}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-1.5">
      <p className="text-[9.5px] font-black uppercase text-slate-400">{label}</p>
      <p className="truncate text-[12.5px] font-black text-slate-800">{value}</p>
    </div>
  );
}

function Chips({ items, cls, empty = '—' }: { items: string[]; cls: string; empty?: string }) {
  return items.length ? (
    <div className="flex flex-wrap gap-1">{items.map(s => <span key={s} className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${cls}`}>{s}</span>)}</div>
  ) : <p className="text-[11.5px] text-slate-400">{empty}</p>;
}

function CandidateRow({ m, rank, job, open, onToggle }: { m: Match; rank: number; job: JobProfile; open: boolean; onToggle: () => void }) {
  const b = BAND[m.band];
  const c = m.candidate;
  return (
    <div className={open ? 'bg-amber-50/30' : ''}>
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 sm:gap-4 px-4 py-3.5 text-left hover:bg-slate-50/80 transition-colors">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black flex-shrink-0
          ${rank <= 3 ? 'bg-gradient-to-br from-amber-300 to-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{rank}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-black text-slate-900">{c.name}</p>
          <p className="truncate text-[11px] text-slate-400">{c.fileName}</p>
        </div>
        {/* Fixed widths, so every row's bar and figures sit in the same column. */}
        <div className="hidden md:block w-44 flex-shrink-0">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${b.bar}`} style={{ width: `${m.score}%` }} />
          </div>
          <p className={`mt-1 text-[10.5px] font-black ${b.text}`}>{m.band}</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0 text-[11.5px] text-slate-500">
          <span title="Required skills matched" className="w-16 whitespace-nowrap"><b className="text-slate-800">{m.matchedRequired.length}</b>/{job.required.length} req</span>
          <span title="Experience" className="w-14 whitespace-nowrap"><b className="text-slate-800">{yrs(c.experience)}</b></span>
          <span title={placeOf(m)} className="hidden lg:inline-flex items-center gap-1 w-32 min-w-0"><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{placeOf(m)}</span></span>
          <span title={c.industries[0]?.name ?? 'Industry ?'} className={`hidden xl:block w-32 truncate font-bold ${INDUSTRY_FIT[m.industryFit ?? 'unknown'].text}`}>{c.industries[0]?.name ?? 'Industry ?'}</span>
        </div>
        <ScoreRing score={m.score} band={m.band} size={46} />
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 sm:px-6 pb-5 grid lg:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 space-y-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500"><Target className="w-3.5 h-3.5" />Score breakdown</p>
            {m.parts.map(p => (
              <div key={p.key}>
                <div className="flex justify-between text-[11.5px]"><span className="font-bold text-slate-700">{p.label} <span className="text-slate-400">· {p.weight}%</span></span><b className="text-slate-800">{p.score}%</b></div>
                <div className="mt-0.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${p.score}%` }} />
                </div>
                <p className="text-[10.5px] text-slate-400 mt-0.5">{p.note}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 space-y-3">
            <div><p className="flex items-center gap-1.5 text-[11px] font-black uppercase text-emerald-700 mb-1"><CircleCheck className="w-3.5 h-3.5" />Required skills found</p>
              <Chips items={m.matchedRequired} cls="bg-emerald-50 text-emerald-700" empty="None of the required skills found" /></div>
            <div><p className="flex items-center gap-1.5 text-[11px] font-black uppercase text-rose-700 mb-1"><CircleX className="w-3.5 h-3.5" />Required skills missing</p>
              <Chips items={m.missingRequired} cls="bg-rose-50 text-rose-700" empty="Nothing missing" /></div>
            {job.preferred.length > 0 && <div><p className="flex items-center gap-1.5 text-[11px] font-black uppercase text-sky-700 mb-1"><Star className="w-3.5 h-3.5" />Preferred skills found</p>
              <Chips items={m.matchedPreferred} cls="bg-sky-50 text-sky-700" /></div>}
            <div><p className="text-[11px] font-black uppercase text-slate-500 mb-1">Other skills on the resume</p>
              <Chips items={m.otherSkills.slice(0, 18)} cls="bg-slate-100 text-slate-600" /></div>
          </div>

          <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 space-y-2.5 text-[12px]">
            <Line icon={<Briefcase className="w-3.5 h-3.5" />} label="Experience" ok={m.meetsExperience}>{yrs(c.experience)}</Line>
            <Line icon={<GraduationCap className="w-3.5 h-3.5" />} label="Education" ok={m.meetsEducation}>{c.education.labels.join(', ') || 'Not found'}</Line>
            <Line icon={<Award className="w-3.5 h-3.5" />} label="Certifications" ok={job.certifications.length ? m.matchedCerts.length > 0 : null}>{c.certifications.join(', ') || 'None found'}</Line>
            <Line icon={<Factory className="w-3.5 h-3.5" />} label="Industry"
              ok={m.industryFit === 'same' ? true : m.industryFit === 'other' ? false : null}
              tag={m.industryFit === 'related' ? 'Related' : undefined}>
              {c.industries.map(i => i.name).slice(0, 3).join(', ') || 'Not clear from resume'}
            </Line>
            <Line icon={<MapPin className="w-3.5 h-3.5" />} label="Location"
              ok={m.distance === null ? null : m.distance <= 150} tag={c.relocate ? 'Will relocate' : undefined}>
              {placeOf(m)}{c.locationFrom && c.locationFrom !== 'address' && <span className="font-semibold text-slate-400"> · from {c.locationFrom}</span>}
            </Line>
            {(c.email || c.phone) && <p className="text-[11.5px] text-slate-500">{[c.email, c.phone].filter(Boolean).join(' · ')}</p>}
            {c.achievements.length > 0 && (
              <div><p className="text-[11px] font-black uppercase text-slate-500 mt-1">Achievements</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11.5px] text-slate-600">{c.achievements.slice(0, 4).map(a => <li key={a}>{a}</li>)}</ul></div>
            )}
            {c.projects.length > 0 && (
              <div><p className="text-[11px] font-black uppercase text-slate-500 mt-1">Projects</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11.5px] text-slate-600">{c.projects.slice(0, 4).map(a => <li key={a}>{a}</li>)}</ul></div>
            )}
          </div>

          {m.responsibilities.length > 0 && (
            <div className="lg:col-span-3 rounded-2xl bg-white ring-1 ring-slate-200 p-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 mb-2">Responsibilities the resume touches on</p>
              <ul className="grid md:grid-cols-2 gap-x-6 gap-y-1">
                {m.responsibilities.map(r => (
                  <li key={r.line} className="flex gap-2 text-[11.5px]">
                    {r.covered ? <CircleCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> : <CircleX className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />}
                    <span className={r.covered ? 'text-slate-700' : 'text-slate-400'}>{r.line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Line({ icon, label, ok, tag, children }: {
  icon: ReactNode; label: string; ok: boolean | null;
  /* A neutral note in place of (or beside) Meets / Below - "Related", "Will relocate". */
  tag?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] font-black uppercase text-slate-400">{label}</p>
        <p className="font-bold text-slate-800">{children}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {ok === true && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black">Meets</span>}
        {ok === false && <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black">Below</span>}
        {tag && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black whitespace-nowrap">{tag}</span>}
      </div>
    </div>
  );
}

/* Every asked-for skill against every candidate, side by side. */
function Matrix({ job, matches, rankOf }: { job: JobProfile; matches: Match[]; rankOf: (m: Match) => number }) {
  const cols = matches.slice(0, 10);
  const rows = [...job.required.map(s => ({ s, req: true })), ...job.preferred.map(s => ({ s, req: false }))];
  const has = (m: Match, s: string) => m.matchedRequired.includes(s) || m.matchedPreferred.includes(s);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-slate-50">
            <th className="sticky left-0 bg-slate-50 text-left px-4 py-3 font-black text-slate-600 min-w-[12rem]">Skill</th>
            {cols.map(m => (
              <th key={m.candidate.id} className="px-3 py-3 text-center min-w-[7rem]">
                <p className="font-black text-slate-800 truncate">#{rankOf(m)} {m.candidate.name.split(' ')[0]}</p>
                <p className={`text-[10.5px] font-black ${BAND[m.band].text}`}>{m.score}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ s, req }) => (
            <tr key={s} className="border-t border-slate-100">
              <td className="sticky left-0 bg-white px-4 py-2 font-bold text-slate-700">
                {s} <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${req ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>{req ? 'req' : 'pref'}</span>
              </td>
              {cols.map(m => (
                <td key={m.candidate.id} className="px-3 py-2 text-center">
                  {has(m, s) ? <CircleCheck className="w-4 h-4 text-emerald-500 inline" /> : <span className="text-slate-300">—</span>}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200 bg-slate-50/60">
            <td className="sticky left-0 bg-slate-50 px-4 py-2 font-black text-slate-700">Experience</td>
            {cols.map(m => <td key={m.candidate.id} className={`px-3 py-2 text-center font-bold ${m.meetsExperience === false ? 'text-rose-600' : 'text-slate-700'}`}>{yrs(m.candidate.experience)}</td>)}
          </tr>
          <tr className="border-t border-slate-100 bg-slate-50/60">
            <td className="sticky left-0 bg-slate-50 px-4 py-2 font-black text-slate-700">Education</td>
            {cols.map(m => <td key={m.candidate.id} className={`px-3 py-2 text-center font-bold ${m.meetsEducation === false ? 'text-rose-600' : 'text-slate-700'}`}>{m.candidate.education.labels[0] ?? '—'}</td>)}
          </tr>
          <tr className="border-t border-slate-100 bg-slate-50/60">
            <td className="sticky left-0 bg-slate-50 px-4 py-2 font-black text-slate-700">Industry</td>
            {cols.map(m => <td key={m.candidate.id} className={`px-3 py-2 text-center font-bold ${INDUSTRY_FIT[m.industryFit ?? 'unknown'].text}`}>{m.candidate.industries[0]?.name ?? '—'}</td>)}
          </tr>
          <tr className="border-t border-slate-100 bg-slate-50/60">
            <td className="sticky left-0 bg-slate-50 px-4 py-2 font-black text-slate-700">Location</td>
            {cols.map(m => <td key={m.candidate.id} className={`px-3 py-2 text-center font-bold ${m.distance !== null && m.distance > 350 ? 'text-rose-600' : 'text-slate-700'}`}>{placeOf(m)}</td>)}
          </tr>
        </tbody>
      </table>
      {matches.length > cols.length && <p className="px-4 py-2 text-[11px] text-slate-400">Showing the top {cols.length}; filter to compare others.</p>}
    </div>
  );
}

export default TalentMatchPage;

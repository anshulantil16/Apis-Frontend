/* APIS Tree — the org-chart / company-structure page, linked from the
 * sidebar's Resources section (same slot as "Our Products").
 *
 * Real reporting-line photos live in src/assets/hierarchy/ and are imported
 * as module assets below — NOT served from public/hierarchy/. Vite's public/
 * static server turned out to have a reproducible bug on this machine where
 * a handful of these exact files (verified present and readable on disk,
 * confirmed via Node's own fs.statSync) 404'd through the dev server no
 * matter what they were named or how their URL was encoded, while sibling
 * files served fine. Importing as assets routes through Vite's module
 * graph instead of that static-file path, which doesn't have the bug.
 *
 * Names, roles and departments are parsed from the original uploaded
 * filenames — the one real source of this data provided so far. Titles that
 * don't map cleanly onto "Head of Department" (e.g. "Export Head", "NSH")
 * are shown exactly as filed rather than normalised, so nothing here states
 * something the source file didn't.
 */
import { useMemo, useState, type MouseEvent } from 'react';
import {
  Building2, Crown, Info, Network, Search, Users, X,
} from 'lucide-react';
import amitAnandPhoto from '../../assets/hierarchy/amit-anand.jpeg';
import arunMishraPhoto from '../../assets/hierarchy/arun-mishra.jpeg';
import ankitNagarPhoto from '../../assets/hierarchy/ankit-nagar.jpeg';
import dineshPhoto from '../../assets/hierarchy/dinesh.jpeg';
import ershadAlamPhoto from '../../assets/hierarchy/ershad-alam.jpeg';
import heeraSwamiPhoto from '../../assets/hierarchy/heera-swami.jpeg';
import manigandanPhoto from '../../assets/hierarchy/manigandan.jpeg';
import naageshMishraPhoto from '../../assets/hierarchy/naagesh-mishra.jpeg';
import narendraGangwarPhoto from '../../assets/hierarchy/narendra-gangwar.jpeg';
import pankajTripathiPhoto from '../../assets/hierarchy/pankaj-tripathi.jpeg';
import pradeepKrishaliPhoto from '../../assets/hierarchy/pradeep-krishali.jpeg';
import vaibhavMishraPhoto from '../../assets/hierarchy/vaibhav-mishra.jpeg';
import vikashAggarwalPhoto from '../../assets/hierarchy/vikash-aggarwal.jpeg';

type Level = 'md' | 'hod';

type Person = {
  id: string;
  name: string;
  role: string;
  department?: string;
  level: Level;
  photo: string;   // imported asset URL
  tag?: string;     // small callout, e.g. "New"
};

const managingDirector: Person = {
  id: 'md-1', name: 'Amit Anand', role: 'Managing Director', department: 'Executive Management',
  level: 'md', photo: amitAnandPhoto,
};

// Order below is deliberate (not alphabetical) — it sets the row-by-row
// layout: 4 per row, [Arun, Vaibhav, Narendra, Naagesh] / [Ankit, Pankaj,
// Pradeep, Vikash] / [Manigandan, Heera Swami, Dinesh, Ershad].
const hods: Person[] = [
  { id: 'arun-mishra', name: 'Arun Mishra', role: 'NSH-HO',department: 'General Trade', level: 'hod', photo: arunMishraPhoto },
  { id: 'vaibhav-mishra', name: 'Vaibhav Mishra', role: 'AGM-HO', department: 'Alternate Channel', level: 'hod', photo: vaibhavMishraPhoto },
  { id: 'narendra-gangwar', name: 'Narendra Gangwar', role: 'Sr. Manager',department: 'B2B', level: 'hod', photo: narendraGangwarPhoto },
  { id: 'naagesh-mishra', name: 'Naagesh Mishra', role: 'GM', department: 'Marketing', level: 'hod', photo: naageshMishraPhoto },
  { id: 'ankit-nagar', name: 'Ankit Nagar', role: 'CFO', department: 'F&A/Internal Audit', level: 'hod', photo: ankitNagarPhoto },
  { id: 'pankaj-tripathi', name: 'Pankaj Tripathi', role: 'GM', department: 'P&C Admin & IT', level: 'hod', photo: pankajTripathiPhoto },
  { id: 'pradeep-krishali', name: 'Pradeep Krishali', role: 'AGM', department: 'Procurement', level: 'hod', photo: pradeepKrishaliPhoto },
  { id: 'vikash-aggarwal', name: 'Vikash Aggarwal', role: 'AGM', department: 'CS & Legal', level: 'hod', photo: vikashAggarwalPhoto },
  { id: 'manigandan', name: 'Manigandan', role: 'GM', department: 'BEX & SCM', level: 'hod', photo: manigandanPhoto },
  { id: 'heera-swami', name: 'Heera Swami', role: 'GM', department: 'PPC', level: 'hod', photo: heeraSwamiPhoto },
  { id: 'dinesh', name: 'Dinesh', role: 'Manager', department: 'NPD', level: 'hod', photo: dineshPhoto },
  { id: 'ershad-alam', name: 'Ershad Alam', role: 'Manager', department: 'Export',level: 'hod', photo: ershadAlamPhoto },
];

/* Page-scoped keyframes only — everything else (pop-in, tilt, spotlight,
 * neon, breathing ring, ambient blobs) reuses the shared `ih-*` toolkit
 * IntranetShell already injects globally, so this page doesn't duplicate
 * animation CSS the rest of the app already ships. */
const AT_STYLES = `
.at-dotgrid { background-image: radial-gradient(rgba(217,119,6,.14) 1px, transparent 1px); background-size: 22px 22px; }
`;

const LEVEL_META: Record<Level, { badge: string; badgeText: string; border: string; neon: string }> = {
  md: { badge: 'bg-amber-100 text-amber-700', badgeText: 'MD', border: 'border-l-amber-500', neon: '#f59e0b' },
  hod: { badge: 'bg-violet-100 text-violet-700', badgeText: 'HOD', border: 'border-l-violet-400', neon: '#8b5cf6' },
};

/* Cursor-follow spotlight + 3D tilt — mirrors the mousemove helpers used on
 * other tool pages (e.g. EOMPage) so cards feel the same across the app. */
function onSpotlightMove(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}
function onTilt3dMove(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty('--ry', `${px * 10}deg`);
  el.style.setProperty('--rx', `${-py * 10}deg`);
  onSpotlightMove(e);
}
function onTilt3dLeave(e: MouseEvent<HTMLElement>) {
  e.currentTarget.style.setProperty('--rx', '0deg');
  e.currentTarget.style.setProperty('--ry', '0deg');
}

function initials(name: string) {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

/* Real photo (imported asset) when it loads, initials tile as a graceful
 * fallback — mirrors the ProductPhoto pattern on the home page so a broken
 * image reference never renders as a broken-image icon. */
function PersonAvatar({ person, big }: { person: Person; big: boolean }) {
  const [broken, setBroken] = useState(false);
  const size = big ? 'w-24 h-24 text-lg' : 'w-20 h-20 text-base';
  if (!broken) {
    return (
      <img src={person.photo} alt={person.name} onError={() => setBroken(true)}
        className={`${size} shrink-0 rounded-full object-cover object-top ring-2 ring-white shadow`} />
    );
  }
  return (
    <div className={`${size} shrink-0 rounded-full flex items-center justify-center font-black ${big ? 'bg-amber-100' : 'bg-amber-50'} text-amber-700`}>
      {initials(person.name)}
    </div>
  );
}

function PersonCard({ person, selected, dim, delayMs, onClick }: {
  person: Person; selected: boolean; dim: boolean; delayMs: number; onClick: () => void;
}) {
  const meta = LEVEL_META[person.level];
  const isMd = person.level === 'md';

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseMove={onTilt3dMove}
      onMouseLeave={onTilt3dLeave}
      style={{ animationDelay: `${delayMs}ms`, ['--ih-neon' as string]: meta.neon }}
      className={[
        'ih-pop-in ih-tilt3d ih-spotlight ih-neon ih-sheen',
        'group w-full h-full flex-1 flex flex-col text-left rounded-2xl border-l-4 border border-slate-200 bg-white relative',
        meta.border, 'transition-[opacity,filter,box-shadow] duration-300',
        dim ? 'opacity-30 saturate-0' : 'opacity-100',
        selected ? 'ring-2 ring-amber-300 shadow-lg' : 'shadow-sm',
        'max-w-sm',
      ].join(' ')}
    >
      <div className="p-4 flex-1">
        <div className="flex items-center gap-3">
          <PersonAvatar person={person} big={isMd} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {isMd && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}
              <p className="font-black text-slate-900 whitespace-nowrap">{person.name}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${meta.badge}`}>
                {meta.badgeText}
              </span>
              {person.tag && (
                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  {person.tag}
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-amber-700 mt-1 whitespace-nowrap">{person.role}</p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate">{person.department ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export function ApisTreePage() {
  const [selectedId, setSelectedId] = useState<string>(managingDirector.id);
  const [department, setDepartment] = useState('All');
  const [query, setQuery] = useState('');

  // Derived from the data, not hand-copied into a filter list — a hardcoded
  // option list silently drifts out of sync (and quietly hides a whole
  // department from the filter) the moment someone edits `hods` above.
  const departments = useMemo(
    () => Array.from(new Set(hods.map(h => h.department).filter((d): d is string => !!d))),
    [],
  );

  const filteredHods = department === 'All' ? hods : hods.filter(h => h.department === department);

  const q = query.trim().toLowerCase();
  const matches = (...fields: (string | undefined)[]) => !q || fields.some(f => (f ?? '').toLowerCase().includes(q));

  return (
    <div className="min-h-full bg-[#f8fafc] relative">
      <style>{AT_STYLES}</style>

      {/* ambient background — reuses the shared drift/aurora keyframes */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden at-dotgrid opacity-70">
        <div className="ih-drift absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-amber-300/20 blur-[130px]" />
        <div className="ih-aurora absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-violet-300/15 blur-[130px]" />
        <div className="ih-drift absolute bottom-0 left-1/4 w-[26rem] h-[26rem] rounded-full bg-cyan-300/15 blur-[130px]" style={{ animationDelay: '6s' }} />
      </div>

      <div className="relative p-4 md:p-6">
        <div className="max-w-[1500px] mx-auto">

          {/* ── Hero header ─────────────────────────────────────────────── */}
          <div className="ih-reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-amber-50/50 to-white
                          border border-amber-100 shadow-sm p-6 md:p-8 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <img src="/logo.png" alt="APIS" className="w-14 h-14 object-contain drop-shadow shrink-0" />
                <div>
                  <h1 className="ih-grad-text text-2xl md:text-3xl font-black tracking-tight
                                 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600">
                    APIS Tree
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Organisation structure and reporting lines — click any card to trace it.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {[
                  { label: 'People', value: 1 + hods.length, icon: Users },
                  { label: 'Departments', value: departments.length, icon: Building2 },
                  { label: 'HODs', value: hods.length, icon: Network },
                ].map((s, i) => (
                  <div key={s.label}
                    className="ih-pop-in flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm"
                    style={{ animationDelay: `${i * 90}ms` }}>
                    <s.icon className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-sm font-black text-slate-900">{s.value}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* search + department filter pills */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-6">
              <div className="ih-spotlight relative flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 sm:w-80 shadow-sm"
                onMouseMove={onSpotlightMove}>
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  type="text"
                  placeholder="Search people or department…"
                  className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
                />
                {query && (
                  <button onClick={() => setQuery('')} title="Clear search" className="text-slate-300 hover:text-slate-500 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {['All', ...departments].map(d => (
                  <button key={d} onClick={() => setDepartment(d)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all
                               ${department === d
                                 ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                                 : 'bg-white border border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Tree ─────────────────────────────────────────────────────── */}
          <div className="ih-reveal rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-10" style={{ animationDelay: '80ms' }}>
            <div className="flex justify-center">
              <PersonCard person={managingDirector} selected={selectedId === managingDirector.id}
                dim={!matches(managingDirector.name, managingDirector.role, managingDirector.department)}
                delayMs={0} onClick={() => setSelectedId(managingDirector.id)} />
            </div>

            {filteredHods.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-10">No departments match this filter.</p>
            ) : (
              <>
                <div className="pt-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredHods.map((hod, i) => {
                      const hodDelay = 460 + i * 70;
                      return (
                        <PersonCard key={hod.id} person={hod} selected={selectedId === hod.id}
                          dim={!matches(hod.name, hod.role, hod.department)}
                          delayMs={hodDelay} onClick={() => setSelectedId(hod.id)} />
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="mt-8 flex justify-center">
              <div className="ih-pop-in inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold">
                <Info className="w-3.5 h-3.5" />
                Total {hods.length} Heads of Department
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApisTreePage;

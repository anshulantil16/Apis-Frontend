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
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft, Building2, ChevronDown, ChevronUp, Crown, Info, MapPin, Network, Search, User, Users, X,
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
  { id: 'pankaj-tripathi', name: 'Pankaj Tripathi', role: 'GM', department: 'P&C Admin & IT', level: 'hod', photo: '/hierarchy/Pankaj_Tripathi1.png' },
  { id: 'pradeep-krishali', name: 'Pradeep Krishali', role: 'AGM', department: 'Procurement', level: 'hod', photo: pradeepKrishaliPhoto },
  { id: 'vikash-aggarwal', name: 'Vikash Aggarwal', role: 'AGM', department: 'CS & Legal', level: 'hod', photo: vikashAggarwalPhoto },
  { id: 'manigandan', name: 'Manigandan', role: 'GM', department: 'BEX & SCM', level: 'hod', photo: manigandanPhoto },
  { id: 'heera-swami', name: 'Heera Swami', role: 'GM', department: 'PPC', level: 'hod', photo: heeraSwamiPhoto },
  { id: 'dinesh', name: 'Dinesh', role: 'Manager', department: 'NPD', level: 'hod', photo: dineshPhoto },
  { id: 'ershad-alam', name: 'Ershad Alam', role: 'Manager', department: 'Export',level: 'hod', photo: ershadAlamPhoto },
];

/* Full reporting structure below a HOD — real names/roles as provided,
   parsed the same "shown exactly as filed, not normalised" way as `hods`
   above. Only P&C, Admin & IT (Pankaj Tripathi) has been supplied so far;
   SUB_TREES is keyed by hod id so other departments fall back to the plain
   card-select behaviour until their structure is provided too. */
type TeamMember = {
  name: string; role: string; hod?: boolean; photo?: string; location?: string; reports?: TeamMember[];
  /** True for a member who reports to their own functional head elsewhere
   * rather than straight into this department's top node — drawn as its
   * own bracketed sub-group off the main bus, not a plain direct stem (see
   * FlatBranch). */
  functional?: boolean;
};

/* A sub-tree's top node isn't always the HOD who was clicked — PPC's Plant
   Head position is vacant, so that title (not Heera Swami herself) is what
   sits at the top of her department's chart. SUB_TREE_ROOTS overrides the
   top node for any department where that's the case; departments without
   an entry here just show the clicked HOD's own card (Pankaj Tripathi's
   tree, e.g.). */
type SubTreeRoot = { title: string; vacant?: boolean; department?: string };
const SUB_TREE_ROOTS: Record<string, SubTreeRoot> = {
  'heera-swami': { title: 'Plant Head- Roorkee', vacant: true, department: 'PPC' },
};

const SUB_TREES: Record<string, TeamMember[]> = {
  'pankaj-tripathi': [
    {
      name: 'Hemant Tripathi', role: 'M2- HRBP- HO',
      photo: '/hierarchy/Hemant Tripathi- Dy. Manager- HRBP.jpeg',
      reports: [
        { name: 'Sandhya Singh', role: 'M1- AM- TA & TM- HO' },
        { name: 'Gopa', role: 'O5- Sr. Executive- TA & ER- HO' },
        { name: 'Manoj Kumar', role: 'O5- Sr. Executive- Payroll- HO' },
        { name: 'Sujat Alam', role: 'O5- Sr. Executive- P&C- HO' },
        { name: 'Kanchan', role: 'O5- Sr. Executive- Admin & Facilities- HO' },
        { name: 'Shobhit', role: 'O4-  EA Front Desk Executive- Admin & Facilities- HO' },
      ],
    },
    {
      name: 'Devender Kumar', role: 'M2- Dy. Manager - HO',
      photo: '/hierarchy/Devender Kumar- Dy. Manager - IT  .jpeg',
      reports: [
        // Anshul Antil sits to the left of Kunal, with Rainy Chaudhary
        // nested one level under him; Ravi follows.
        {
          name: 'Anshul Antil', role: 'O5- Lead Automation- IT- HO',
          reports: [{ name: 'Rainy Chaudhary', role: 'AI & ML Automation- IT- HO' }],
        },
        { name: 'Kunal', role: 'IT Support- IT- HO' },
        { name: 'Ravi', role: 'O5- IT- Roorkee' },
      ],
    },
    {
      name: 'Praveen Sharma', role: 'M3- Manager- HR & Admin- Roorkee',
      photo: '/hierarchy/Praveen Sharma- Manager- P&C- Roorkee.jpeg',
      reports: [
        { name: 'Anju', role: 'M- AM- HR & Admin- Roorkee' },
        { name: 'Mohit', role: 'O5- P&C- Roorkee' },
        { name: 'Amandeep', role: 'O5- Admin & Facilities- Roorkee' },
      ],
    },
  ],
  // Flat structure (see SUB_TREE_ROOTS above for the vacant "Plant Head"
  // top node) — six people reporting into that vacant position, no further
  // nesting. No photos were supplied for this department, so every card
  // here uses the generic person icon rather than attempting one.
  //
  // Four (Rahul Dutt Sharma, Sarovan Kumar, Amir Khan, Sunil Kumar) report
  // straight into the seat; Nischal Bharadwaj and Praveen Sharma are
  // `functional: true` — per the org chart supplied, they report to their
  // own functional head elsewhere, so FlatBranch draws them as a separate
  // bracketed pair off the main bus rather than two more plain direct
  // stems. Order matters here: direct members first, functional pair last,
  // so they render left-group/right-group as in that chart.
  'heera-swami': [
    { name: 'Rahul Dutt Sharma', role: 'M5- AGM- Production- Roorkee', location: 'Roorkee' },
    { name: 'Sarovan Kumar', role: 'M3- Manager- Engineering- Roorkee', location: 'Roorkee' },
    { name: 'Amir Khan', role: 'M1- AM- Store & Dispatch- Roorkee', location: 'Roorkee' },
    { name: 'Sunil Kumar', role: 'M3- Manager- QA & QC- Roorkee', location: 'Roorkee' },
    { name: 'Nischal Bharadwaj', role: 'M4- Sr. Manager- Finance & Accounts- Roorkee- Functional Reporting', location: 'Roorkee', functional: true },
    { name: 'Praveen Sharma', role: 'M3- Manager- P&C- Roorkee- Functional Reporting', location: 'Roorkee', functional: true },
  ],
};

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

/* Pointer handlers come from the shared kit: it measures once per
   hover and batches its writes, where this file's old private copy
   measured inside every mousemove and forced a synchronous layout. */
import { onSpotlightMove, onTilt3dMove, onTilt3dLeave } from '../../ui';

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

/* Smooth open/close for any branch of the tree — a CSS grid-rows trick
   (0fr → 1fr) rather than a conditional unmount, so collapsing a branch
   animates its height down instead of just vanishing. */
function Collapsible({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="grid w-full transition-[grid-template-rows] duration-300 ease-out"
      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}

/* Small round chevron used to collapse/expand a node — same control at
   every level (the HOD box, each manager box), just repositioned per use. */
function CollapseToggle({ collapsed, onClick, title }: { collapsed: boolean; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title}
      className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-white border border-amber-200 shadow-sm
                 flex items-center justify-center text-amber-500 hover:text-amber-600 hover:border-amber-300
                 hover:scale-110 transition-all z-10">
      {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
    </button>
  );
}

/* Real photo when a manager has one on file, initials tile as a graceful
   fallback — same broken-image pattern as PersonAvatar above, just sized
   for the smaller manager card. encodeURI handles the spaces/"&" in these
   filenames (they're uploaded as-shot, not slugified). */
function TeamMemberAvatar({ name, photo }: { name: string; photo?: string }) {
  const [broken, setBroken] = useState(false);
  if (photo && !broken) {
    return (
      <img src={encodeURI(photo)} alt={name} onError={() => setBroken(true)}
        className="w-12 h-12 shrink-0 rounded-full object-cover object-top ring-2 ring-white shadow" />
    );
  }
  return (
    <div className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-black bg-amber-100 text-amber-700 text-sm">
      {initials(name)}
    </div>
  );
}

/* Level-2 manager box in a department sub-tree — cream/amber card (matches
   the HOD box above it) with a violet HOD badge, so the whole drill-down
   reads as one consistent "amber tree", not a different UI bolted on. */
function ManagerCard({ member }: { member: TeamMember }) {
  return (
    <div onMouseMove={onSpotlightMove}
      className="ih-spotlight ih-neon relative w-full rounded-2xl border border-amber-200
                 bg-gradient-to-br from-amber-50 to-white shadow-sm p-4"
      style={{ ['--ih-neon' as string]: '#8b5cf6' }}>
      <div className="flex items-center gap-3">
        <TeamMemberAvatar name={member.name} photo={member.photo} />
        <div className="min-w-0 flex-1">
          {member.hod && (
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
              HOD
            </span>
          )}
          <p className="font-black text-slate-900 text-base mt-1 truncate">{member.name}</p>
          <p className="text-[12.5px] font-bold text-amber-700 mt-0.5 leading-snug">{member.role}</p>
        </div>
      </div>
    </div>
  );
}

/* Flat individual-contributor row — small amber avatar tile + name/role,
   hung off a green vertical spine via a short stub. Used for a manager
   whose direct reports are all leaves (no further reports of their own),
   e.g. Hemant Tripathi's and Praveen Sharma's teams. */
function ReportLeafRow({ member, delayMs }: { member: TeamMember; delayMs: number }) {
  return (
    <div className="ih-pop-in relative pl-6" style={{ animationDelay: `${delayMs}ms` }}>
      <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-px bg-emerald-400" />
      <div className="ih-tilt flex items-center gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 min-w-[195px]">
        <div className="w-7 h-7 rounded-md bg-amber-400 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[12.5px] font-black text-slate-900 leading-tight truncate">{member.name}</p>
          <p className="text-[11px] font-bold text-amber-600 leading-snug truncate">{member.role}</p>
        </div>
      </div>
    </div>
  );
}

/* The green-spine list wrapping ReportLeafRow — one continuous line down
   the left edge with a stub into each row. */
function ReportLeafList({ members, baseDelay }: { members: TeamMember[]; baseDelay: number }) {
  return (
    <div className="relative pl-5 ml-2 border-l-2 border-emerald-300 space-y-3">
      {members.map((m, i) => <ReportLeafRow key={m.name} member={m} delayMs={baseDelay + i * 70} />)}
    </div>
  );
}

/* Boxed card for a report who is themself a small node in the tree (has
   their own reports) — recurses via a blue stem, same connector language
   as the HOD→managers T-connector above, just smaller. This is what makes
   Kunal → Rainy Chaudhary read as "one more branch of the org chart"
   rather than a flat list entry. */
function ReportBoxCard({ member, delayMs }: { member: TeamMember; delayMs: number }) {
  const kids = member.reports ?? [];
  return (
    <div className="ih-pop-in flex flex-col items-center" style={{ animationDelay: `${delayMs}ms` }}>
      <div className="ih-tilt rounded-xl bg-amber-50 border border-amber-200 shadow-sm px-2 py-1.5 min-w-[92px] max-w-[122px]">
        <p className="text-[11.5px] font-black text-slate-900 leading-tight">{member.name}</p>
        <p className="text-[10px] font-bold text-amber-600 mt-0.5 leading-snug">{member.role}</p>
      </div>
      {kids.length > 0 && (
        <>
          <div aria-hidden className="w-px h-5 bg-sky-300" />
          <div className="flex flex-col items-center gap-2">
            {kids.map(r => <ReportBoxCard key={r.name} member={r} delayMs={delayMs + 90} />)}
          </div>
        </>
      )}
    </div>
  );
}

/* True whenever at least one of a manager's direct reports has their own
   reports — that's the signal to render this manager's team as a small
   nested org-chart (ReportBranchGrid, blue T-connector) instead of a flat
   green-spine list, matching Devender Kumar's branch in the reference vs.
   Hemant's/Praveen's flatter teams. Not hardcoded to any name, so it keeps
   working if the underlying data changes. */
function hasNestedReports(members: TeamMember[]) {
  return members.some(m => m.reports && m.reports.length > 0);
}

/* Boxed-grid branch — a small T-connector (blue, mirrors the HOD-level one)
   fanning out to each of this manager's reports, each of which can itself
   recurse via ReportBoxCard. */
function ReportBranchGrid({ members, baseDelay }: { members: TeamMember[]; baseDelay: number }) {
  const multi = members.length > 1;
  return (
    <div className="relative w-full flex justify-center">
      {/* Cards wrap instead of forcing one fixed row — a manager's own grid
          column is narrower than 3 side-by-side boxed cards need, and
          wrapping to a second row keeps every card fully visible instead of
          letting the row overflow and clip against its neighbours. */}
      <div className={`flex flex-wrap items-start justify-center gap-1.5 max-w-full ${multi ? 'pt-3' : ''}`}>
        {members.map((m, i) => (
          <div key={m.name} className="relative flex flex-col items-center">
            <ReportBoxCard member={m} delayMs={baseDelay + i * 90} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Generic amber person-icon avatar — used wherever a real photo isn't
   available: the vacant "Plant Head" root, and every card in a flat
   department tree (none of PPC's six people have photos on file). */
function GenericAvatar({ big }: { big?: boolean }) {
  const size = big ? 'w-16 h-16' : 'w-11 h-11';
  return (
    <div className={`${size} shrink-0 rounded-full bg-amber-400 flex items-center justify-center ring-2 ring-white shadow`}>
      <User className={big ? 'w-8 h-8 text-white' : 'w-5 h-5 text-white'} />
    </div>
  );
}

/* Top node for a "flat" department tree — a position title rather than a
   real HOD card, with "(Vacant)" called out in red when nobody currently
   holds it. */
function SubTreeRootCard({ root }: { root: SubTreeRoot }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm p-5">
      <div className="flex items-center gap-3.5">
        <GenericAvatar big />
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-900 text-lg">{root.title}</p>
          {root.vacant && <p className="text-sm font-black text-rose-500 mt-0.5">(Vacant)</p>}
          {root.department && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
              <Building2 className="w-4 h-4" />
              <span className="truncate">{root.department}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* One card in a flat department tree — generic icon (no photos supplied
   for this department), name, role, and a location line, all in the same
   cream/amber card language as ManagerCard. */
function FlatMemberCard({ member }: { member: TeamMember }) {
  return (
    <div onMouseMove={onSpotlightMove}
      className="ih-spotlight ih-neon relative w-full h-full rounded-2xl border border-amber-200
                 bg-gradient-to-br from-amber-50 to-white shadow-sm p-4"
      style={{ ['--ih-neon' as string]: '#f59e0b' }}>
      <div className="flex items-center gap-3">
        <GenericAvatar />
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-900 text-[13px] leading-tight">{member.name}</p>
          <p className="text-[11px] font-semibold text-slate-600 mt-1 leading-snug">{member.role}</p>
        </div>
      </div>
      {member.location && (
        <div className="flex items-center gap-1 mt-2.5 text-[10.5px] text-slate-400">
          <MapPin className="w-3 h-3" />
          <span>{member.location}</span>
        </div>
      )}
    </div>
  );
}

/* T-connector fanning out to every member in a flat department tree — same
   idea as the HOD→managers connector, all in amber (this tree has no
   further nesting, so there's no need for the blue/green split the nested
   variant uses to distinguish branch types).
   Per-card stems were dropped for the plain case: with flex-wrap and many
   members, cards wrap onto new rows on most widths, and a stem anchored
   "above" a wrapped card lands in the gap right under whichever card
   happens to sit above it in the wrap — reading as a bogus reporting line
   between two unrelated people rather than a connection to the shared bus.
   The single top bus line already conveys "all of these report to the
   same position".
   When some members are `functional` (report to their own functional head
   elsewhere, per the org chart supplied), that plain layout can't show
   it, so this switches to a fixed, non-wrapping row instead — direct
   members hang straight off the bus with individual stems, and the
   functional members are grouped as their own bracketed pair with a
   "Reporting to their functional head" label underneath. Horizontal
   overflow scrolls on narrow screens rather than wrapping, so the stems
   stay meaningful. */
function FlatBranch({ members }: { members: TeamMember[] }) {
  const direct = members.filter(m => !m.functional);
  const functional = members.filter(m => m.functional);
  const hasFunctionalGroup = functional.length > 0;

  // Two straight connectors — one from the vacant seat straight down to
  // the centre of the 4-card direct group, one to the centre of the
  // 2-card functional pair — drawn as a single SVG so each is one
  // continuous line by construction. (A separate CSS horizontal bar +
  // vertical stems needing to land on the exact same pixel kept drifting
  // apart at this scale; a line between two known points can't
  // "disconnect".) Real DOM measurement, not hand-computed card-width
  // arithmetic, since that's what was drifting. Hooks run unconditionally
  // (before the early return below) since React requires the same hooks
  // in the same order on every render.
  const rowRef = useRef<HTMLDivElement>(null);
  const branchARef = useRef<HTMLDivElement>(null);
  const branchBRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ width: number; aX: number; bX: number } | null>(null);

  useLayoutEffect(() => {
    if (!hasFunctionalGroup) return;
    const row = rowRef.current, a = branchARef.current, b = branchBRef.current;
    if (!row || !a || !b) return;
    const measure = () => {
      const rowRect = row.getBoundingClientRect();
      setLines({
        width: rowRect.width,
        aX: a.getBoundingClientRect().left + a.offsetWidth / 2 - rowRect.left,
        bX: b.getBoundingClientRect().left + b.offsetWidth / 2 - rowRect.left,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, [hasFunctionalGroup, direct.length, functional.length]);

  if (!hasFunctionalGroup) {
    const multi = members.length > 1;
    return (
      <div className="relative w-full">
        {multi && (
          <div aria-hidden className="hidden sm:block absolute top-0 left-[6%] right-[6%] h-px bg-amber-300" />
        )}
        <div className={`flex flex-wrap items-start justify-center gap-4 ${multi ? 'pt-8' : ''}`}>
          {members.map((m, i) => (
            <div key={m.name} className="ih-pop-in relative w-[205px] shrink-0" style={{ animationDelay: `${140 + i * 90}ms` }}>
              <FlatMemberCard member={m} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      {/* pb-20 reserves real room below the row for the functional group's
          bracket + label, which hang below the cards via absolute
          positioning — without it, overflow-x-auto forces overflow-y to
          auto too (per spec) and that invisible scrollbox would clip them,
          same class of bug as the milestone badges elsewhere on this app. */}
      <div ref={rowRef} className="relative min-w-max mx-auto pb-20 px-1">
        {/* Two straight lines from the vacant seat (top-centre, where
            DeptSubTree's incoming stem lands) to each branch's own centre
            — four direct reports down one line, the two functional-report
            cards down the other. Not a shared bus across all six: that
            used to read as a bogus direct line between Sunil Kumar and
            Nischal Bharadwaj, the two cards that happened to sit next to
            each other. Rendered only once measured (`lines`), so it never
            flashes at the wrong spot before layout settles. */}
        {lines && (
          <svg aria-hidden className="hidden sm:block absolute top-0 left-0 pointer-events-none"
            width={lines.width} height={32} viewBox={`0 0 ${lines.width} 32`}>
            <line x1={lines.width / 2} y1={0} x2={lines.aX} y2={32} stroke="#fcd34d" strokeWidth={1} />
            <line x1={lines.width / 2} y1={0} x2={lines.bX} y2={32} stroke="#fcd34d" strokeWidth={1} />
          </svg>
        )}

        <div className="flex items-start justify-center gap-10 pt-8">
          {/* Branch A: direct group — reached by its own line above, own
              local bus spanning just its 4 cards. */}
          <div ref={branchARef} className="relative flex items-stretch gap-4">
            {direct.length > 1 && (
              <div aria-hidden className="hidden sm:block absolute top-0 left-[8%] right-[8%] h-px bg-amber-300" />
            )}
            {direct.map((m, i) => (
              <div key={m.name} className="ih-pop-in relative w-[190px] shrink-0" style={{ animationDelay: `${140 + i * 90}ms` }}>
                {direct.length > 1 && !['Rahul Dutt Sharma', 'Sarovan Kumar'].includes(m.name) && (
                  <div aria-hidden className="hidden sm:block absolute -top-4 left-1/2 -translate-x-1/2 w-px h-4 bg-amber-300" />
                )}
                <FlatMemberCard member={m} />
              </div>
            ))}
          </div>

          {/* Branch B: functional pair — reached by its own line above,
              own local bus splitting to each card, then a bracket + label
              underneath since they don't report into this seat the same
              way the direct group does. */}
          <div ref={branchBRef} className="ih-pop-in relative flex items-stretch gap-3 shrink-0" style={{ animationDelay: `${140 + direct.length * 90}ms` }}>
            {functional.length > 1 && (
              <div aria-hidden className="hidden sm:block absolute top-0 left-[15%] right-[15%] h-px bg-amber-300" />
            )}
            {functional.map(m => (
              <div key={m.name} className="relative w-[190px] shrink-0">
                {functional.length > 1 && m.name !== 'Praveen Sharma' && (
                  <div aria-hidden className="hidden sm:block absolute -top-4 left-1/2 -translate-x-1/2 w-px h-4 bg-amber-300" />
                )}
                <FlatMemberCard member={m} />
              </div>
            ))}

            {functional.length > 1 && (
              <>
                <div aria-hidden className="hidden sm:block absolute left-[15%] top-full h-5 w-px bg-amber-300" />
                <div aria-hidden className="hidden sm:block absolute right-[15%] top-full h-5 w-px bg-amber-300" />
                <div aria-hidden className="hidden sm:block absolute left-[15%] right-[15%] top-[calc(100%+20px)] h-px bg-amber-300" />
                <div aria-hidden className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-[calc(100%+20px)] h-4 w-px bg-amber-300" />
                <span className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-[calc(100%+36px)] whitespace-nowrap
                                 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 shadow-sm">
                  Reporting to their functional head
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* One HOD's full department structure, drawn as an actual org-chart flow.
   Two variants share this component:
   - 'nested' (default, e.g. Pankaj Tripathi): HOD box → blue T-connector →
     level-2 managers → each manager's own branch (a flat green-spine list,
     or a nested blue box-grid when that manager's reports themselves have
     reports).
   - 'flat' (e.g. Heera Swami / PPC, whose Plant Head seat is vacant):
     a position-title root (SUB_TREE_ROOTS) → one amber T-connector straight
     to every direct report, no further nesting.
   Pure CSS lines (border/absolute divs), no canvas or charting library —
   matches how the rest of this page is built. Every level collapses
   independently and animates in with a staggered pop-in, same toolkit the
   main tree already uses. */
function DeptSubTree({ hod, root, members, onBack }: {
  hod: Person; root?: SubTreeRoot; members: TeamMember[]; onBack: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [closedBranches, setClosedBranches] = useState<Set<string>>(new Set());
  const toggleBranch = (name: string) => setClosedBranches(prev => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  return (
    <div className="ih-fade">
      <button onClick={onBack}
        className="inline-flex items-center gap-1.5 mb-6 px-3 py-1.5 rounded-lg border border-slate-200 bg-white
                   text-xs font-bold text-slate-500 hover:text-amber-600 hover:border-amber-300 shadow-sm transition-all">
        <ArrowLeft className="w-3.5 h-3.5" />Back to All Heads of Department
      </button>

      <div className="flex flex-col items-center">
        {/* level 1 — the HOD, or a vacant position title for flat trees */}
        <div className="ih-pop-in relative w-full max-w-md">
          {root ? (
            <SubTreeRootCard root={root} />
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm p-5">
              <div className="flex items-center gap-3.5">
                <PersonAvatar person={hod} big />
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-900 text-lg">{hod.name}</p>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 inline-block mt-1">
                    HOD
                  </span>
                  <p className="text-sm font-bold text-amber-700 mt-1">{hod.role}- {hod.department}- HO</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                    <Building2 className="w-4 h-4" />
                    <span className="truncate">{hod.department}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <CollapseToggle collapsed={collapsed} onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand team' : 'Collapse team'} />
        </div>

        <Collapsible open={!collapsed}>
          {root ? (
            <>
              {/* flat tree: one amber stem straight into the T-connector, no manager tier */}
              <div aria-hidden className="w-px h-8 bg-amber-300 mx-auto" />
              <FlatBranch members={members} />
            </>
          ) : (
            <>
              {/* stem from the HOD down to the T-bar */}
              <div aria-hidden className="w-px h-10 bg-sky-300 mx-auto" />

              <div className="relative w-full">
                {/* T-bar spanning the outer two managers' centres */}
                <div aria-hidden className="hidden sm:block absolute top-0 left-[16.6%] right-[16.6%] h-px bg-sky-300" />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-10 pt-10">
                  {members.map((mgr, i) => {
                    const branchOpen = !closedBranches.has(mgr.name);
                    const reports = mgr.reports ?? [];
                    const nested = hasNestedReports(reports);
                    return (
                      <div key={mgr.name} className="ih-pop-in relative flex flex-col items-center"
                        style={{ animationDelay: `${140 + i * 100}ms` }}>
                        {/* stem from the T-bar down to this manager's box */}
                        <div aria-hidden className="hidden sm:block absolute -top-10 left-1/2 -translate-x-1/2 w-px h-10 bg-sky-300" />

                        <div className="relative w-full max-w-[260px]">
                          <ManagerCard member={mgr} />
                          {reports.length > 0 && (
                            <CollapseToggle collapsed={!branchOpen} onClick={() => toggleBranch(mgr.name)}
                              title={branchOpen ? `Collapse ${mgr.name}'s team` : `Expand ${mgr.name}'s team`} />
                          )}
                        </div>

                        {reports.length > 0 && (
                          <Collapsible open={branchOpen}>
                            <div className="pt-5 w-full flex justify-center">
                              {nested
                                ? <ReportBranchGrid members={reports} baseDelay={300 + i * 60} />
                                : <ReportLeafList members={reports} baseDelay={300 + i * 60} />}
                            </div>
                          </Collapsible>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </Collapsible>
      </div>
    </div>
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

  // Drill-down into a HOD's full reporting structure — only wired up for
  // departments SUB_TREES actually has data for (P&C, Admin & IT so far).
  // Clicking a HOD card with data opens it directly; picking that HOD's
  // department from the filter pills opens it too, since there's nothing
  // else useful to show for a single-department filter once the structure
  // exists. Departments without data keep the old dim/highlight behaviour.
  const [drillHodId, setDrillHodId] = useState<string | null>(null);
  const drillHod = drillHodId ? hods.find(h => h.id === drillHodId) : undefined;

  const selectHod = (hod: Person) => {
    if (SUB_TREES[hod.id]) { setDrillHodId(hod.id); return; }
    setSelectedId(hod.id);
  };
  const selectDepartment = (d: string) => {
    setDepartment(d);
    const hod = hods.find(h => h.department === d && SUB_TREES[h.id]);
    setDrillHodId(hod ? hod.id : null);
  };

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
                  <button key={d} onClick={() => selectDepartment(d)}
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
            {drillHod ? (
              <DeptSubTree hod={drillHod} root={SUB_TREE_ROOTS[drillHod.id]} members={SUB_TREES[drillHod.id]}
                onBack={() => { setDrillHodId(null); setDepartment('All'); }} />
            ) : (
              <>
                <div className="flex justify-center">
                  <PersonCard person={managingDirector} selected={selectedId === managingDirector.id}
                    dim={!matches(managingDirector.name, managingDirector.role, managingDirector.department)}
                    delayMs={0} onClick={() => setSelectedId(managingDirector.id)} />
                </div>

                {filteredHods.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-10">No departments match this filter.</p>
                ) : (
                  <div className="pt-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {filteredHods.map((hod, i) => {
                        const hodDelay = 460 + i * 70;
                        return (
                          <PersonCard key={hod.id} person={hod} selected={selectedId === hod.id}
                            dim={!matches(hod.name, hod.role, hod.department)}
                            delayMs={hodDelay} onClick={() => selectHod(hod)} />
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-8 flex justify-center">
                  <div className="ih-pop-in inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold">
                    <Info className="w-3.5 h-3.5" />
                    Total {hods.length} Heads of Department
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApisTreePage;

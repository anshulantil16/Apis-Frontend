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
import {
  createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type ChangeEvent, type ReactNode,
} from 'react';
import {
  ArrowLeft, Building2, ChevronDown, ChevronUp, Crown, Info, Loader2, MapPin, Network,
  Pencil, Plus, RotateCcw, Search, User, UserMinus, Users, X,
} from 'lucide-react';
import { apiFetch, fetchMe, type PortalUser } from '../portal/session';
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
// layout: 4 per row, [Arun, Vaibhav, Narendra, Naagesh] / [Pankaj, Ankit,
// Pradeep, Vikash] / [Manigandan, Heera Swami, Dinesh, Ershad].
const hods: Person[] = [
  { id: 'arun-mishra', name: 'Arun Mishra', role: 'NSH-HO',department: 'General Trade', level: 'hod', photo: arunMishraPhoto },
  { id: 'vaibhav-mishra', name: 'Vaibhav Mishra', role: 'AGM-HO', department: 'Alternate Channel', level: 'hod', photo: vaibhavMishraPhoto },
  { id: 'narendra-gangwar', name: 'Narendra Gangwar', role: 'Sr. Manager',department: 'B2B', level: 'hod', photo: narendraGangwarPhoto },
  { id: 'naagesh-mishra', name: 'Naagesh Mishra', role: 'GM', department: 'Marketing', level: 'hod', photo: naageshMishraPhoto },
  { id: 'pankaj-tripathi', name: 'Pankaj Tripathi', role: 'GM', department: 'P&C Admin & IT', level: 'hod', photo: '/hierarchy/Pankaj_Tripathi1.png' },
  { id: 'ankit-nagar', name: 'Ankit Nagar', role: 'CFO', department: 'F&A/Internal Audit', level: 'hod', photo: ankitNagarPhoto },
  { id: 'pradeep-krishali', name: 'Pradeep Krishali', role: 'AGM', department: 'Procurement', level: 'hod', photo: pradeepKrishaliPhoto },
  { id: 'vikas-aggarwal', name: 'Vikas Aggarwal', role: 'AGM', department: 'CS & Legal', level: 'hod', photo: vikashAggarwalPhoto },
  { id: 'r-manigandan', name: 'R. Manigandan', role: 'GM', department: 'BEX & SCM', level: 'hod', photo: manigandanPhoto },
  { id: 'heera-swami', name: 'Heera Swami', role: 'GM', department: 'PPC', level: 'hod', photo: heeraSwamiPhoto },
  { id: 'dinesh-kumar', name: 'Dinesh Kumar', role: 'Manager', department: 'NPD', level: 'hod', photo: dineshPhoto },
  { id: 'ershad-alam', name: 'Ershad Alam', role: 'Hod export', department: 'Export',level: 'hod', photo: ershadAlamPhoto },
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
  /** Small pill label on this member's own stem down from the HOD/T-bar —
   * e.g. "Functional Reporting", when the org chart calls out that
   * particular line as a functional (not direct) reporting relationship.
   * Only rendered in the 2/3-manager grid tier, not on leaf rows. */
  stemLabel?: string;
};

/* A sub-tree's top node isn't always the HOD who was clicked — PPC's Plant
   Head position is vacant, so that title (not Heera Swami herself) is what
   sits at the top of her department's chart. SUB_TREE_ROOTS overrides the
   top node for any department where that's the case; departments without
   an entry here just show the clicked HOD's own card (Pankaj Tripathi's
   tree, e.g.).
   PPC actually has three peer top-level positions per the org chart
   supplied — the vacant Plant Head seat, Heera Swami's own GM seat, and
   Nischal Bharadwaj (who reports to Heera Swami functionally, drawn as a
   third column off to the right with its own "Reporting to functional
   head" label) — side by side with no shared parent above them. `peer` /
   `peerMembers` carries Heera Swami's column, `peer2` / `peer2Members` /
   `peer2Label` carries Nischal Bharadwaj's. */
type SubTreeRoot = {
  title: string; vacant?: boolean; department?: string;
  peer?: { name: string; role: string; department?: string };
  peerMembers?: TeamMember[];
  peer2?: { name: string; role: string; department?: string };
  peer2Members?: TeamMember[];
  peer2Label?: string;
};
const SUB_TREE_ROOTS: Record<string, SubTreeRoot> = {
  'heera-swami': {
    title: 'Plant Head- Roorkee', vacant: true, department: 'PPC',
    peer: { name: 'Heera Swami', role: 'C1- GM- HO', department: 'PPC' },
    peerMembers: [
      { name: 'Sandeep', role: 'M1- AM- HO' },
      { name: 'Kamaljeet', role: 'O5- Sr. Executive- HO' },
      { name: 'Sanjay', role: 'O4- Executive- HO' },
    ],
    peer2: { name: 'Nischal Bharadwaj', role: 'M4- Sr. Manager- Finance & Accounts- Roorkee', department: 'PPC' },
    peer2Members: [
      { name: 'Praveen Sharma', role: 'M3- Manager- P&C- Roorkee' },
    ],
    peer2Label: 'Reporting to functional head',
  },
};

/* Departments whose members hang directly off the HOD as one flat,
   wrapping bus (FlatBranch) rather than the nested manager-tier T-connector
   — same rendering PPC's vacant-seat tree already uses, just kept separate
   from SUB_TREE_ROOTS since these HODs are real people with their own card
   at the top, not a vacant position title. General Trade Sales (Arun
   Mishra) has twelve regional GTR heads reporting straight to him, too many
   for the 3-column manager grid the nested variant assumes. */
const FLAT_TREE_IDS = new Set<string>(['arun-mishra', 'pradeep-krishali', 'ershad-alam']);

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
  // Straight top-to-bottom chain (see SUB_TREE_ROOTS above for the vacant
  // "Plant Head" top node) — four people reporting straight into that
  // vacant position, one after another, no further nesting. Nischal
  // Bharadwaj and Praveen Sharma used to sit here as a bracketed
  // "functional reporting" pair off this same seat, but per the org chart
  // supplied they're actually their own third peer column (SUB_TREE_ROOTS'
  // peer2) hanging off Heera Swami, not off the vacant seat — see peer2
  // above. No photos were supplied for this department, so every card here
  // uses the generic person icon rather than attempting one.
  'heera-swami': [
    { name: 'Rahul Dutt Sharma', role: 'M5- AGM- Production- Roorkee', location: 'Roorkee' },
    { name: 'Sarvan Kumar', role: 'M3- Manager- Engineering- Roorkee', location: 'Roorkee' },
    { name: 'Amir Khan', role: 'M1- AM- Store & Dispatch- Roorkee', location: 'Roorkee' },
    { name: 'Sunil Kumar', role: 'M3- Manager- QA & QC- Roorkee', location: 'Roorkee' },
  ],
  // General Trade Sales (Arun Mishra). Flat — twelve regional GTR heads
  // reporting straight to him, no further nesting — rendered via FlatBranch
  // (FLAT_TREE_IDS) rather than the nested variant's manager tier, which
  // assumes a 3-column grid and doesn't wrap cleanly at this count.
  'arun-mishra': [
    { name: 'Mohinder Sharma', role: 'GTR 1- Punjab, Himachal & Jammu & Kashmir- M3- Dy. RSM', location: 'Chandigarh' },
    { name: 'Ramesh', role: 'GTR 2- Delhi, Haryana & Rajasthan- M4- RSM', location: 'Delhi' },
    { name: 'Asif Ali', role: 'GTR3A- Central & Eastern UP- M4- RSM', location: 'Pravagraj' },
    { name: 'Rajeev Kumar', role: 'GTR 3B- Uttarakhand & Western UP- M2- Sr. ASM', location: 'Ghaziabad' },
    { name: 'Arnab Ghosh', role: 'GTR 4A- West Bengal, North East Region- M5- RSM', location: 'Kolkata' },
    { name: 'Gulshan Kumar', role: 'GTR 4B- Bihar & Jharkhand- M3- Dy. RSM', location: 'Patna' },
    { name: 'Shakil Ahmed', role: 'GTR 5- Odisha, Chhattisgarh, Madhya Pradesh- M4- RSM', location: 'Bhilai' },
    { name: 'Sanjay Singh', role: 'GTR 6A- Rest Of Maharashtra- M4- RSM', location: 'Pune' },
    { name: 'Vinod Shah', role: 'GTR 6B- Mumbai & Gujarat- M2- Sr. ASM', location: 'Mumbai' },
    { name: 'B. Bhaskar', role: 'GTR 7- AP & Telangana- M4- RSM', location: 'Hyderabad' },
    { name: 'Revana Siddappa Patil', role: 'GTR 8- Karnataka, Goa- M4- RSM0', location: 'Bangalore' },
    { name: 'Vasanth D', role: 'GTR 9- Tamil Nadu & Kerala- M4- RSM', location: 'Chennai' },
  ],
  // Business To Business (B2B) Sales (Narendra Gangawar) — single direct
  // report, no further nesting, so the default nested-variant rendering
  // (HOD card → T-connector → one manager box) already matches the source
  // chart with no extra layout needed.
  'narendra-gangwar': [
    { name: 'Sumit Kumar Verma', role: 'M1- Assistant Manager- HQ- Delhi' },
  ],
  // Sales - Alternate Channel (Vaibhav Mishra). The three level-2 "manager"
  // slots below aren't people, they're the department groupings from the
  // org chart supplied (Modern Trade / Ecommerce / Sales Coordination) —
  // reusing the manager-card slot for a group label instead of a person is
  // what lets this reuse the existing nested/leaf branch rendering as-is:
  // Modern Trade's one report (Gouri Shankar) has his own reports so it
  // draws as a nested box-grid branch; Ecommerce's one report (Hariom) and
  // Sales Coordination's three both have no further reports so they draw
  // as flat leaf-spine lists — exactly matching the source chart's shape
  // with no new components.
  'vaibhav-mishra': [
    {
      name: 'Modern Trade', role: 'Department',
      reports: [
        {
          name: 'Gouri Shankar', role: 'M4- RSM- HQ- Delhi',
          reports: [
            { name: 'Rishi Raghav', role: 'M1- KAM- HQ- Delhi' },
            { name: 'Navin Anchal', role: 'M1- KAM- HQ- Mumbai' },
            { name: 'Purushotham Kambalapally', role: 'M1- KAM- HQ- Hyderabad' },
            { name: 'Tumba Biswas', role: 'M1- KAM- HQ- Kolkata' },
          ],
        },
      ],
    },
    {
      name: 'Ecommerce', role: 'Department',
      reports: [
        { name: 'Hariom', role: 'M3- Customer Development Manager- HQ- Delhi' },
      ],
    },
    {
      name: 'Sales Coordination', role: 'Department',
      reports: [
        { name: 'Gaurav Dapral', role: 'O5- Sr. Executive- HQ- Delhi' },
        { name: 'Vishal Mahaur', role: 'O5- Sr. Executive- HQ- Delhi' },
        { name: 'Pooja Arora', role: 'O5- Sr. Executive- HQ- Delhi' },
      ],
    },
  ],
  // Business Excellence & Strategy / Supply Chain Management (R. Manigandan)
  // — per the org chart supplied, both level-2 slots are department-group
  // labels (same reuse of the "manager" slot as Vaibhav Mishra's tree
  // above), each recursing three people deep via ReportBoxCard. The vacant
  // seat under Sanjeev Lamba is modelled the same way PPC's vacant Plant
  // Head root is — the position title as the card, "Vacant" as its role.
  'r-manigandan': [
    {
      name: 'Supply Chain Management', role: 'Department',
      reports: [
        {
          name: 'S.P. Chaubey', role: 'Sr. Manager',
          reports: [
            {
              name: 'Sanjeev Lamba', role: 'AM',
              reports: [
                { name: 'Executive', role: 'Vacant' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Business Excellence & Strategy', role: 'Department',
      reports: [
        {
          name: 'SFA', role: 'Department',
          reports: [
            {
              name: 'Krishna', role: 'AM',
              reports: [
                { name: 'K. Ninay', role: 'Executive' },
              ],
            },
          ],
        },
        {
          name: 'Assurance – GT', role: 'Department',
          reports: [
            {
              name: 'Sunetro Banerjee', role: 'Manager',
              reports: [
                { name: 'Rajesh Sharma', role: 'Sr. Executive' },
              ],
            },
          ],
        },
      ],
    },
  ],
  // New Product Development (Dinesh Kumar) — three direct reports, no
  // further nesting, per the org chart supplied. Same shape as
  // narendra-gangwar's single-report entry above, just three instead of
  // one; the default nested-variant rendering (HOD card → T-connector →
  // manager boxes) already matches that chart with no extra layout needed.
  'dinesh-kumar': [
    { name: 'Deepak Joshi', role: 'M1- AM- HO' },
    { name: 'Meeran Alam', role: 'O4- Exec- HO' },
    { name: 'Mahesh', role: 'O5- Sr. Exec- HO' },
  ],
  // Purchase & Procurement (Pradeep Krishali) — six flat direct reports,
  // one of them a vacant seat, per the org chart supplied. Added to
  // FLAT_TREE_IDS above (like Arun Mishra's 12 GTRs) rather than the
  // nested variant, since none of these six have reports of their own.
  'pradeep-krishali': [
    { name: 'Kundan', role: 'Dy. Manager', location: 'HO' },
    { name: 'Vacant', role: 'O5- Sr. Executive', location: 'HO' },
    { name: 'Rakesh', role: 'O4- Executive', location: 'HO' },
    { name: 'Swamendra', role: 'M2- Dy. Manager', location: 'HO' },
    { name: 'Ashish Pal', role: 'O5- Sr. Executive', location: 'HO' },
    { name: 'Neeraj Krishnatray', role: 'M1- AM', location: 'Factory' },
  ],
  // CS & Legal (Vikas Aggarwal) — one direct report, per the org chart
  // supplied. Same shape as narendra-gangwar's single-entry tree above.
  'vikas-aggarwal': [
    { name: 'Sonal', role: 'O4- Executive- HO' },
  ],
  // Export (Ershad Alam) — five flat direct reports, two of them vacant
  // seats, per the org chart supplied. Added to FLAT_TREE_IDS above. The
  // two vacant seats need distinct names (grade folded in) since every
  // flat-tree card is keyed by name.
  'ershad-alam': [
    { name: 'Nickey Sasi', role: 'M3- Manager' },
    { name: 'Vacant (M1-AM)', role: 'M1- AM', location: 'HO' },
    { name: 'Vacant (M2-DM)', role: 'M2- DM', location: 'HO' },
    { name: 'Gholam', role: 'M1- AM', location: 'HO' },
    { name: 'Deepak', role: 'O5- Sr. Executive', location: 'HO' },
  ],
  // Marketing (Naagesh Mishra) — one manager (Pankaj Jha) with four flat
  // direct reports of his own, one a vacant seat, per the org chart
  // supplied. Default nested-variant rendering already matches this shape:
  // HOD → single-manager stem → ManagerCard → green-spine leaf list (none
  // of the four have reports of their own).
  'naagesh-mishra': [
    {
      name: 'Pankaj Jha', role: 'M4- Sr. Manager- Marketing- HO',
      reports: [
        { name: 'Aman Bhawadwaj', role: 'M1- AM- ATL- HO' },
        { name: 'Abhishek Naagar', role: 'O4- Sr. Executive- HO' },
        { name: 'Anoop Sehgal', role: 'O5- Sr. Executive- Design- HO' },
        { name: 'Performance Marketing (Vacant)', role: 'M1- AM' },
      ],
    },
  ],
  // F&A / Internal Audit (Ankit Nagar) — same two-department-group shape as
  // r-manigandan above (Internal Audit / Finance & Accounting), each
  // recursing through its own manager(s). Nischal Bhardwaj sits at the same
  // level as Prateek Aggarwal and Amit Madan under Finance & Accounting but
  // has no reports of his own, per the org chart supplied — ReportBoxCard
  // already renders a childless node as a plain box with no line below, so
  // no special-casing is needed for that.
  'ankit-nagar': [
    {
      name: 'Internal Audit', role: 'Department', stemLabel: 'Functional Reporting',
      reports: [
        {
          name: 'Tapon Behera', role: 'M4- Sr. Manager- HO',
          reports: [
            { name: 'Harpal Singh', role: 'M1- AM' },
            { name: 'Rishab', role: 'O5- Sr. Executive' },
            { name: 'Pravesh', role: 'O5- Sr. Executive' },
            { name: 'Puneet Singh', role: 'O4- Executive' },
            { name: 'Abhishek', role: 'O4- Executive' },
          ],
        },
      ],
    },
    {
      name: 'Finance & Accounting', role: 'Department',
      reports: [
        {
          name: 'Prateek Aggarwal', role: 'M4- Sr. Manager- AP- HO',
          reports: [
            { name: 'Salendra', role: 'M1- AM' },
            { name: 'Azad', role: 'O5- Sr. Executive' },
            { name: 'Bhumika', role: 'O4- Executive' },
            { name: 'Gaurav', role: 'O5- Sr. Executive' },
            { name: 'Sallabh', role: 'O4- Executive' },
            { name: 'Neha', role: 'O4- Executive' },
          ],
        },
        {
          name: 'Amit Madan', role: 'M5- AGM – AR- HO',
          reports: [
            { name: 'Sumit', role: 'M3- Manager' },
            { name: 'Mayank', role: 'O4- Executive' },
            { name: 'Roshan', role: 'O5- Sr. Executive' },
            { name: 'Ashu', role: 'O4- Executive' },
            { name: 'Anil', role: 'O4- Executive' },
            { name: 'Sunil Kumar', role: 'O5- Sr. Executive' },
          ],
        },
        {
          name: 'Nischal Bhardwaj', role: 'M4- Sr. Manager- Plant Costing & Budgeting- Factory',
        },
      ],
    },
  ],
};

/* ── Live editing overlay ──────────────────────────────────────────────
 * Every card above is drawn from the hardcoded data structures — that data
 * never changes. What CAN change, per-person, is layered on top of it: an
 * authorized manager edits a card's photo/name/role/department, the change
 * is saved to the backend's `tree_profiles` table (keyed by the person_id
 * scheme built below) and every future page load merges it back in. A card
 * nobody has ever edited simply has no row and renders exactly as before. */
const TREE_API = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/accounts/tree`;

type Profile = {
  person_id: string; name: string; role: string; department: string; photo_url: string;
  is_new?: boolean; parent_hod_id?: string; is_hidden?: boolean;
  updated_by_name?: string; updated_at?: string;
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* Sub-tree members (TeamMember) don't carry a stable id in the source data
   the way managingDirector/hods do — they're just plain objects positioned
   by nesting. Rather than thread an id through every recursive renderer,
   this walks the static SUB_TREES/SUB_TREE_ROOTS trees once at module load
   and remembers each member OBJECT's id in a WeakMap, keyed off `<hodId>--
   <slug of name>`. Duplicate names under the same HOD (a couple of "Vacant"
   seats do repeat) get -2, -3... appended in the order they're walked —
   stable across renders since the walk order of a static array never
   changes. */
const MEMBER_IDS = new WeakMap<TeamMember, string>();
(function buildMemberIds() {
  const walkInto = (hodId: string, list: TeamMember[]) => {
    const seen = new Map<string, number>();
    const walk = (members: TeamMember[]) => {
      for (const m of members) {
        const base = `${hodId}--${slugify(m.name)}`;
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        MEMBER_IDS.set(m, n === 1 ? base : `${base}-${n}`);
        if (m.reports) walk(m.reports);
      }
    };
    walk(list);
  };
  for (const [hodId, members] of Object.entries(SUB_TREES)) walkInto(hodId, members);
  // SUB_TREE_ROOTS' peer/peer2 columns render the same TeamMember cards
  // (VerticalChainBranch) but live outside SUB_TREES, so they need their
  // own pass under the same hod key.
  for (const [hodId, root] of Object.entries(SUB_TREE_ROOTS)) {
    walkInto(hodId, root.peerMembers ?? []);
    walkInto(hodId, root.peer2Members ?? []);
  }
})();

/** id for any sub-tree TeamMember — falls back to an un-prefixed slug on
 *  the off chance a member object isn't one the walk above reached (there
 *  shouldn't be any), rather than throwing. */
function memberId(m: TeamMember): string {
  return MEMBER_IDS.get(m) ?? slugify(m.name);
}

/** Every person in one HOD's drill-down — the HOD themself, both PPC-style
 *  peer seats if the department has them, and every TeamMember reached by
 *  walking `.reports` all the way down. Feeds the single "Edit team" picker
 *  in DeptSubTree, rather than a pencil icon on every individual card down
 *  a deep department (Arun Mishra's dozen GTRs, PPC's nested branches). */
function flattenTeam(hod: Person, root: SubTreeRoot | undefined, members: TeamMember[]) {
  // Individual team members don't carry their own department in the
  // hardcoded data — a subtree is implicitly all one department, the HOD's
  // own — so that's what gets carried along here for anyone who needs a
  // department to fall back on (e.g. hiding a static card for the first
  // time, so the override row it creates isn't left blank).
  const dept = hod.department || root?.department || '';
  const out: { personId: string; name: string; role: string; department: string }[] =
    [{ personId: hod.id, name: hod.name, role: hod.role, department: dept }];
  const walk = (list: TeamMember[]) => {
    for (const m of list) {
      out.push({ personId: memberId(m), name: m.name, role: m.role, department: dept });
      if (m.reports) walk(m.reports);
    }
  };
  walk(members);
  if (root?.peer) {
    out.push({ personId: `${hod.id}--peer`, name: root.peer.name, role: root.peer.role, department: root.peer.department || dept });
    walk(root.peerMembers ?? []);
  }
  if (root?.peer2) {
    out.push({ personId: `${hod.id}--peer2`, name: root.peer2.name, role: root.peer2.role, department: root.peer2.department || dept });
    walk(root.peer2Members ?? []);
  }
  return out;
}

/** Every added person reachable by walking `addedByParent` down from any of
 *  `rootIds` — a HOD, or any of their static team's own ids. Shared by
 *  TeamEditPicker and RemovePicker's own list-building so "everyone this
 *  page can reach" is computed the same way in both places, including
 *  additions nested under additions, however deep. */
function collectAddedDescendants(rootIds: string[], addedByParent: Record<string, Profile[]>) {
  const out: { personId: string; name: string; role: string; department: string }[] = [];
  // Dedupes the ids it walks — a caller passing the same root twice (e.g.
  // a list that already includes the HOD's own id alongside it again)
  // must not walk addedByParent[that id] twice and double-list everyone
  // added under it.
  const seen = new Set<string>();
  const queue = [...rootIds];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const p of addedByParent[id] ?? []) {
      out.push({ personId: p.person_id, name: p.name, role: p.role, department: p.department });
      queue.push(p.person_id);
    }
  }
  return out;
}

type EditableBaseline = { name: string; role: string; department?: string; photo?: string };

/** Override's field wins only when it's actually been set to something —
 *  an override row can exist for a card because ONE field was edited, and
 *  the other three should still fall back to the hardcoded baseline rather
 *  than blanking out. */
function mergeProfile(profile: Profile | undefined, baseline: EditableBaseline) {
  return {
    name: profile?.name || baseline.name,
    role: profile?.role || baseline.role,
    department: profile?.department || baseline.department || '',
    photo: profile?.photo_url || baseline.photo || '',
  };
}

const TreeEditContext = createContext<{
  profiles: Record<string, Profile>;
  /** Every added person, keyed by whoever they report to — the id of the
   *  exact card "Add" was clicked on (a HOD, an existing manager, or
   *  another added person), not just "somewhere in this HOD's team". Lets
   *  ManagerCard/ReportBoxCard/etc. each render their own added reports
   *  directly below themselves instead of one flat list at the top of the
   *  page. Reuses TreeProfile's existing parent_hod_id field — the name
   *  stuck from when only HOD-level additions existed, but the field
   *  always was just "whichever person_id this reports to". */
  addedByParent: Record<string, Profile[]>;
  /** May correct what an existing card says: name, role, department, photo. */
  canEdit: boolean;
  /** May change who is ON the chart -- add a person, remove one, place one
   *  under a different HOD. A bigger thing than correcting a card, and
   *  granted separately in Admin Console; it carries canEdit with it. */
  canManage: boolean;
  openEditor: (personId: string, baseline: EditableBaseline) => void;
  openCreator: (parentHodId: string) => void;
  /** Removes a card — for an added person this deletes them outright; for
   *  one of the static chart's own people it sets is_hidden instead (see
   *  TreeProfile). Throws on failure so RemovePicker can keep its confirm
   *  step up rather than silently closing. */
  removePerson: (personId: string, isNew: boolean, baseline?: EditableBaseline) => Promise<void>;
  /** Label of whoever was most recently removed, or null once undone/none
   *  yet — drives the permanent header Undo button on both the main tree
   *  and every sub-tree, so it stays available (not just an 8s toast). */
  undoLabel: string | null;
  performUndo: () => void;
}>({
  profiles: {}, addedByParent: {}, canEdit: false, canManage: false,
  openEditor: () => {}, openCreator: () => {},
  removePerson: async () => {}, undoLabel: null, performUndo: () => {},
});

/** Reads the live override (if any) for `personId` and merges it onto the
 *  hardcoded baseline every card component already has in hand. */
function useMergedPerson(personId: string, baseline: EditableBaseline) {
  const { profiles } = useContext(TreeEditContext);
  // No memoization needed — mergeProfile is a handful of string compares,
  // far cheaper than the render it sits inside of.
  return mergeProfile(profiles[personId], baseline);
}

/** True once someone has removed this card via RemovePicker (see
 *  TreeProfile.is_hidden) — every card-level component checks this and
 *  renders nothing at all for itself when it's set. For a sub-tree member
 *  this also removes whatever reports render inside the same component,
 *  so hiding a manager takes their reporting line with them, same as
 *  hiding a HOD makes its own sub-tree unreachable. */
function useIsHidden(personId: string) {
  const { profiles } = useContext(TreeEditContext);
  return !!profiles[personId]?.is_hidden;
}

/* Small pencil affordance dropped into the corner of any card — only
   rendered at all when the signed-in user can edit (fetchMe().can_edit_tree
   or is_superadmin, resolved once up in ApisTreePage and threaded down via
   TreeEditContext rather than every card re-checking it). */
function EditButton({ personId, baseline }: { personId: string; baseline: EditableBaseline }) {
  const { canEdit, openEditor } = useContext(TreeEditContext);
  if (!canEdit) return null;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); openEditor(personId, baseline); }}
      title="Edit this card"
      className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-white border border-slate-200 shadow-sm
                 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:border-amber-300
                 hover:scale-110 transition-all z-10"
    >
      <Pencil className="w-2.5 h-2.5" />
    </button>
  );
}

/* A tile that opens the "add a person" flow rather than showing anyone —
   dropped at the end of the HOD grid (parentHodId='') and, inside a
   drill-down, next to the "Edit team" picker (parentHodId=hod.id). Same
   canEdit gate as EditButton, same context, so both affordances appear
   and disappear together. */
function AddCardTile({ parentHodId, variant = 'tile' }: { parentHodId: string; variant?: 'tile' | 'button' | 'pill' }) {
  const { canManage, openCreator } = useContext(TreeEditContext);
  if (!canManage) return null;
  if (variant === 'pill') {
    // Same shape as the People/Departments/HODs stat pills beside it in
    // the header, so this reads as one more of them rather than a
    // different kind of control living in the same row.
    return (
      <button type="button" onClick={() => openCreator(parentHodId)}
        className="ih-pop-in flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-dashed
                   border-emerald-200 text-emerald-600 shadow-sm hover:bg-emerald-50 hover:border-emerald-300
                   transition-all">
        <Plus className="w-3.5 h-3.5" />
        <span className="text-[10px] font-black uppercase tracking-wider">Add HOD</span>
      </button>
    );
  }
  if (variant === 'button') {
    return (
      <button type="button" onClick={() => openCreator(parentHodId)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-white
                   text-xs font-bold text-emerald-700 hover:bg-emerald-50 shadow-sm transition-all">
        <Plus className="w-3.5 h-3.5" />Add
      </button>
    );
  }
  return (
    <button type="button" onClick={() => openCreator(parentHodId)}
      className="ih-pop-in flex flex-col items-center justify-center gap-1.5 w-full h-full min-h-[132px]
                 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400
                 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/40 transition-all">
      <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
        <Plus className="w-4 h-4" />
      </span>
      <span className="text-xs font-black">Add HOD</span>
    </button>
  );
}

/* One added person's own card — a HOD added at the top level, or a member
   added into an existing HOD's sub-tree. Unlike the static tree's cards
   (edited via the "Edit team" picker to avoid a pencil on every one of a
   deep branch's cards), an added person gets their own EditButton right on
   the card: there are only ever a few of these per HOD, so the clutter
   concern that motivated the picker doesn't apply, and direct access is
   more discoverable for the one thing you just added. */
/* Same amber card language every other card in a sub-tree already uses
 * (ManagerCard/ReportLeafRow's bg-amber-50 + amber-200 border + amber-600
 * role text) — an added person reads as one more card in this org chart,
 * not a visually distinct "extra" kind of thing bolted on. */
/** An added person's own card — matching whichever tier it was added into,
 *  exactly, not one generic "added" look:
 *  - 'grid'    the HOD grid tile (full card, room for a department line)
 *  - 'manager' ManagerCard's own box (a new HOD-direct report, peer of
 *              Hemant/Devender/Praveen)
 *  - 'row'     ReportLeafRow's own box (a new report under a flat leaf list)
 *  - 'box'     ReportBoxCard's own tiny box (a new report inside a nested
 *              box chain)
 *  Same EditButton/InlineAddButton pair on every size — only the
 *  surrounding card differs. */
function AddedPersonCard({ person, size = 'row' }: { person: Profile; size?: 'grid' | 'manager' | 'row' | 'box' }) {
  const baseline: EditableBaseline = { name: person.name, role: person.role, department: person.department, photo: person.photo_url };
  // Every subtree size skips the edit pencil — only the HOD-grid tile
  // ('grid') keeps it. A subtree addition is meant to be quick: name,
  // role, done; if it needs correcting, remove it and re-add it.
  if (size === 'box') {
    return (
      <div className="relative rounded-xl bg-amber-50 border border-amber-200 shadow-sm px-2.5 py-1.5 w-[122px]">
        <InlineAddButton parentId={person.person_id} />
        <p className="text-sm font-black text-slate-900 leading-tight line-clamp-2" title={person.name}>{person.name}</p>
        <p className="text-[12px] font-bold text-amber-600 mt-1 leading-snug line-clamp-2" title={person.role}>
          {person.role || 'Team member'}
        </p>
        {person.department && (
          <p className="text-[10px] font-semibold text-slate-500 mt-0.5 leading-snug line-clamp-1" title={person.department}>
            {person.department}
          </p>
        )}
      </div>
    );
  }

  if (size === 'manager') {
    return (
      <div className="relative w-full rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm p-5">
        <InlineAddButton parentId={person.person_id} />
        <div className="flex items-center gap-3.5">
          {person.photo_url
            ? <img src={person.photo_url} alt={person.name} className="w-14 h-14 shrink-0 rounded-full object-cover object-top ring-2 ring-white shadow" />
            : <div className="w-14 h-14 shrink-0 rounded-full bg-amber-100 flex items-center justify-center text-amber-700"><User className="w-6 h-6" /></div>}
          <div className="min-w-0 flex-1">
            <p className="font-black text-slate-900 text-lg truncate" title={person.name}>{person.name}</p>
            <p className="text-sm font-bold text-amber-700 mt-0.5 leading-snug truncate" title={person.role}>
              {person.role || 'Team member'}
            </p>
            {person.department && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                <Building2 className="w-3.5 h-3.5" />
                <span className="truncate">{person.department}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (size === 'grid') {
    // A newly-added HOD sits in the same grid as the real ones — same
    // shell (border-l-4 violet accent, tilt/spotlight/neon), same
    // PersonAvatar, same HOD badge layout as PersonCard, so it reads as
    // one more HOD card, not a visually distinct "added" tile bolted on.
    const meta = LEVEL_META.hod;
    return (
      <div
        onMouseMove={onTilt3dMove}
        onMouseLeave={onTilt3dLeave}
        style={{ ['--ih-neon' as string]: meta.neon }}
        className={`ih-tilt3d ih-spotlight ih-neon ih-sheen group w-full h-full flex flex-col rounded-2xl
                   border-l-4 border border-slate-200 bg-white shadow-sm relative ${meta.border}`}
      >
        <EditButton personId={person.person_id} baseline={baseline} />
        <InlineAddButton parentId={person.person_id} />
        <div className="p-4 flex-1">
          <div className="flex items-center gap-3">
            <PersonAvatar name={person.name} photo={person.photo_url} big={false} />
            <div className="min-w-0 flex-1">
              <p className="font-black text-slate-900 whitespace-nowrap truncate" title={person.name}>{person.name}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${meta.badge}`}>
                  {meta.badgeText}
                </span>
              </div>
              <p className="text-xs font-bold text-amber-700 mt-1 truncate">{person.role || 'Team member'}</p>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                <Building2 className="w-3.5 h-3.5" />
                <span className="truncate">{person.department || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 'row' — matches ReportLeafRow's own box exactly.
  return (
    <div className="relative">
      <div className="ih-tilt relative flex items-center gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 min-w-[195px]">
        <InlineAddButton parentId={person.person_id} />
        {person.photo_url
          ? <img src={person.photo_url} alt={person.name} className="w-7 h-7 rounded-md object-cover object-top shrink-0" />
          : <div className="w-7 h-7 rounded-md bg-amber-400 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-white" /></div>}
        <div className="min-w-0">
          <p className="text-[12.5px] font-black text-slate-900 leading-tight truncate">{person.name}</p>
          <p className="text-[11px] font-bold text-amber-600 leading-snug truncate">{person.role || 'Team member'}</p>
          {person.department && (
            <p className="text-[10px] font-semibold text-slate-400 leading-snug truncate">{person.department}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* Small "+" affordance dropped on any card that can have reports — the HOD
 * itself, an existing manager, an added person's own card — mirroring
 * EditButton's corner-pencil pattern but on the opposite corner and in
 * green, so the two never compete for the same spot. Opens the same create
 * flow AddCardTile does, just anchored to this specific card's id as the
 * new person's parent rather than a fixed HOD/top-level slot. */
function InlineAddButton({ parentId }: { parentId: string }) {
  const { canManage, openCreator } = useContext(TreeEditContext);
  if (!canManage) return null;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); openCreator(parentId); }}
      title="Add a report to this card"
      className="absolute -top-1.5 -left-1.5 w-4.5 h-4.5 rounded-full bg-white border border-slate-200 shadow-sm
                 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-300
                 hover:scale-110 transition-all z-10"
    >
      <Plus className="w-2.5 h-2.5" />
    </button>
  );
}

/* The HOD's own "+" doesn't add straight under the HOD any more — there's
 * no column in this subtree's layout for "reports directly to the HOD"
 * that isn't either a manager's own column or a visually separate section
 * bolted on below the table (which is exactly what looked broken/floating
 * before). Instead it asks which existing manager's column the new person
 * belongs in, then opens the same create flow anchored to THAT manager's
 * id — so the new card lands inside the table exactly where any other
 * card added via that manager's own "+" would. */
function ColumnPickerAddButton({ hodId, columns }: { hodId: string; columns: { id: string; name: string }[] }) {
  const { canManage, openCreator } = useContext(TreeEditContext);
  const [open, setOpen] = useState(false);
  if (!canManage) return null;

  return (
    <div className="absolute -top-1.5 -left-1.5 z-10">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        title="Add a report under one of this HOD's teams"
        className="w-4.5 h-4.5 rounded-full bg-white border border-slate-200 shadow-sm
                   flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-300
                   hover:scale-110 transition-all"
      >
        <Plus className="w-2.5 h-2.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div onClick={(e) => e.stopPropagation()}
            className="absolute z-40 top-full left-0 mt-1.5 w-56 bg-white border border-slate-200
                       rounded-xl shadow-xl p-2 ih-fade">
            {columns.length > 0 && (
              <>
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 px-1.5 pb-1.5">
                  Attach under which column?
                </p>
                <div className="space-y-0.5 mb-1.5">
                  {columns.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setOpen(false); openCreator(c.id); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700
                                 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="h-px bg-slate-100 mx-1.5 mb-1.5" />
              </>
            )}
            {/* A whole new manager column, a peer of Hemant/Devender/Praveen
                rather than a report of one of them — renders via the same
                labeled/stemmed "also reports directly to this HOD" section
                below the T-bar, so it's still visibly attached to the HOD,
                not a floating box. */}
            <button type="button"
              onClick={() => { setOpen(false); openCreator(hodId); }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-black text-emerald-700
                         hover:bg-emerald-50 transition-colors flex items-center gap-1.5">
              <Plus className="w-3 h-3" />Add new manager
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* Renders whoever has been added directly under `parentId`, laid out the
 * same way the tier it's attached to already lays out ITS OWN cards, not
 * one generic layout everywhere:
 *  - 'manager' a new column, matching the T-bar's own manager row — for a
 *              HOD-direct addition, a peer of Hemant/Devender/Praveen.
 *  - 'row'     an extra indented row with the same short stub into the
 *              spine ReportLeafRow's own rows use, so an addition here
 *              continues that list instead of breaking its rhythm.
 *  - 'box'     stacked straight below, single connector line, matching how
 *              ReportBoxCard's own nested children already stack.
 * Recurses into each added person's own AddedBranch so the branch can grow
 * as deep as whoever's editing wants — 'manager' additions recurse as
 * 'row' (their own reports are leaf-tier, not another full manager row),
 * 'row' and 'box' stay their own size, matching the chain they're
 * already part of. Renders nothing at all when there's nobody added
 * here, so it's always safe to drop after any card's existing reports. */
function AddedBranch({ parentId, size = 'manager' }: { parentId: string; size?: 'manager' | 'stack' | 'box' }) {
  const { addedByParent } = useContext(TreeEditContext);
  const kids = addedByParent[parentId];
  if (!kids || kids.length === 0) return null;

  if (size === 'stack') {
    // Centred column, one stub above each card — matches how
    // VerticalChainBranch/the flat-grid already stack THEIR OWN cards, so
    // an addition here continues that same column instead of jogging
    // sideways into a leaf-list-style indent that doesn't apply outside
    // an actual ReportLeafList.
    return (
      <>
        {kids.map(person => (
          <div key={person.person_id} className="ih-pop-in flex flex-col items-center pt-2">
            <div aria-hidden className="w-px h-4 bg-emerald-300" />
            <div className="w-[195px]"><AddedPersonCard person={person} size="row" /></div>
            <AddedBranch parentId={person.person_id} size="stack" />
          </div>
        ))}
      </>
    );
  }

  if (size === 'box') {
    return (
      <>
        {kids.map(person => (
          <div key={person.person_id} className="flex flex-col items-center gap-2 pt-2">
            <div aria-hidden className="w-px h-5 bg-sky-300" />
            <AddedPersonCard person={person} size="box" />
            <AddedBranch parentId={person.person_id} size="box" />
          </div>
        ))}
      </>
    );
  }

  // 'manager' — a new row of its own below the T-bar, explicitly labelled
  // and stemmed from a shared bar (mirrors the T-bar above it) so it reads
  // as "more direct reports of this HOD", not a stray box that happens to
  // sit somewhere on the page — that unlabelled/unstemmed look was the bug
  // a person added straight under a HOD used to have.
  return (
    <div className="pt-10 w-full flex flex-col items-center">
      <div aria-hidden className="w-px h-8 bg-sky-300" />
      <span className="text-[9px] font-black uppercase tracking-wider text-sky-600 bg-sky-50 border border-sky-200
                       rounded-full px-2.5 py-1 mb-6">
        Additional managers / direct reports
      </span>
      <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-6">
        {kids.map(person => (
          <div key={person.person_id} className="flex flex-col items-center">
            <div className="w-full max-w-[300px]">
              <AddedPersonCard person={person} size="manager" />
            </div>
            <div className="pt-4">
              <AddedBranch parentId={person.person_id} size="stack" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
function PersonAvatar({ name, photo, big }: { name: string; photo: string; big: boolean }) {
  const [broken, setBroken] = useState(false);
  const size = big ? 'w-24 h-24 text-lg' : 'w-20 h-20 text-base';
  if (photo && !broken) {
    return (
      <img src={photo} alt={name} onError={() => setBroken(true)}
        className={`${size} shrink-0 rounded-full object-cover object-top ring-2 ring-white shadow`} />
    );
  }
  return (
    <div className={`${size} shrink-0 rounded-full flex items-center justify-center font-black ${big ? 'bg-amber-100' : 'bg-amber-50'} text-amber-700`}>
      {initials(name)}
    </div>
  );
}

function PersonCard({ person, selected, dim, delayMs, onClick }: {
  person: Person; selected: boolean; dim: boolean; delayMs: number; onClick: () => void;
}) {
  const meta = LEVEL_META[person.level];
  const isMd = person.level === 'md';
  const merged = useMergedPerson(person.id, person);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      onMouseMove={onTilt3dMove}
      onMouseLeave={onTilt3dLeave}
      style={{ animationDelay: `${delayMs}ms`, ['--ih-neon' as string]: meta.neon }}
      className={[
        'ih-pop-in ih-tilt3d ih-spotlight ih-neon ih-sheen',
        'group w-full h-full flex-1 flex flex-col text-left rounded-2xl border-l-4 border border-slate-200 bg-white relative cursor-pointer',
        meta.border, 'transition-[opacity,filter,box-shadow] duration-300',
        dim ? 'opacity-30 saturate-0' : 'opacity-100',
        selected ? 'ring-2 ring-amber-300 shadow-lg' : 'shadow-sm',
        'max-w-sm',
      ].join(' ')}
    >
      {!isMd && <EditButton personId={person.id} baseline={merged} />}
      <div className="p-4 flex-1">
        <div className="flex items-center gap-3">
          <PersonAvatar name={merged.name} photo={merged.photo} big={isMd} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {isMd && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}
              <p className="font-black text-slate-900 whitespace-nowrap">{merged.name}</p>
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
            <p className="text-xs font-bold text-amber-700 mt-1 whitespace-nowrap">{merged.role}</p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate">{merged.department || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
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
        className="w-14 h-14 shrink-0 rounded-full object-cover object-top ring-2 ring-white shadow" />
    );
  }
  return (
    <div className="w-14 h-14 shrink-0 rounded-full flex items-center justify-center font-black bg-amber-100 text-amber-700 text-base">
      {initials(name)}
    </div>
  );
}

/* Level-2 manager box in a department sub-tree — cream/amber card (matches
   the HOD box above it) with a violet HOD badge, so the whole drill-down
   reads as one consistent "amber tree", not a different UI bolted on. */
function ManagerCard({ member }: { member: TeamMember }) {
  const personId = memberId(member);
  const merged = useMergedPerson(personId, member);
  if (useIsHidden(personId)) return null;
  return (
    <div onMouseMove={onSpotlightMove}
      className="ih-spotlight ih-neon relative w-full rounded-2xl border border-amber-200
                 bg-gradient-to-br from-amber-50 to-white shadow-sm p-5"
      style={{ ['--ih-neon' as string]: '#8b5cf6' }}>
      <InlineAddButton parentId={personId} />
      <div className="flex items-center gap-3.5">
        <TeamMemberAvatar name={merged.name} photo={merged.photo} />
        <div className="min-w-0 flex-1">
          {member.hod && (
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
              HOD
            </span>
          )}
          <p className="font-black text-slate-900 text-lg mt-1 truncate">{merged.name}</p>
          <p className="text-sm font-bold text-amber-700 mt-0.5 leading-snug">{merged.role}</p>
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
  const personId = memberId(member);
  const merged = useMergedPerson(personId, member);
  if (useIsHidden(personId)) return null;
  return (
    <div className="ih-pop-in relative pl-6" style={{ animationDelay: `${delayMs}ms` }}>
      <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-px bg-emerald-400" />
      <div className="ih-tilt relative flex items-center gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 min-w-[195px]">
        <InlineAddButton parentId={personId} />
        <div className="w-7 h-7 rounded-md bg-amber-400 flex items-center justify-center shrink-0 overflow-hidden">
          {merged.photo
            ? <img src={merged.photo} alt={merged.name} className="w-full h-full object-cover object-top" />
            : <User className="w-4 h-4 text-white" />}
        </div>
        <div className="min-w-0">
          <p className="text-[12.5px] font-black text-slate-900 leading-tight truncate">{merged.name}</p>
          <p className="text-[11px] font-bold text-amber-600 leading-snug truncate">{merged.role}</p>
        </div>
      </div>
    </div>
  );
}

/* Same box + stub ReportLeafRow renders, for an added person instead of a
 * static TeamMember — kept a separate component (rather than a branch
 * inside ReportLeafRow) specifically so ReportLeafList can render it as a
 * flat SIBLING row rather than nested a level deeper inside whichever
 * static row it was added under. That nesting was the actual bug in an
 * earlier pass: pl-6 applied twice (once from the static row's own
 * wrapper, once from the added row's) shifted the added card visibly
 * right of its neighbours instead of lining up in the same column. */
function AddedLeafRow({ person }: { person: Profile }) {
  return (
    <div className="ih-pop-in relative pl-6">
      <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-px bg-emerald-400" />
      <AddedPersonCard person={person} size="row" />
    </div>
  );
}

/* The green-spine list wrapping ReportLeafRow — one continuous line down
   the left edge with a stub into each row.
   `directParentId`, when given, is the manager this whole list belongs to
   (e.g. Hemant Tripathi) — someone added straight under them, a new peer
   of every row here, appears at the end of the same list. Every row
   (static or added) also expands its own added reports in place, right
   after itself, walked recursively — so the list stays one flat,
   evenly-spaced column all the way down, at any depth, rather than
   drifting into nested indents the deeper an addition goes. */
function ReportLeafList({ members, baseDelay, directParentId }: {
  members: TeamMember[]; baseDelay: number; directParentId?: string;
}) {
  const { addedByParent } = useContext(TreeEditContext);

  const rows: { key: string; node: ReactNode }[] = [];
  const pushAddedChain = (person: Profile) => {
    rows.push({ key: person.person_id, node: <AddedLeafRow person={person} /> });
    for (const child of addedByParent[person.person_id] ?? []) pushAddedChain(child);
  };
  members.forEach((m, i) => {
    rows.push({ key: m.name, node: <ReportLeafRow member={m} delayMs={baseDelay + i * 70} /> });
    for (const child of addedByParent[memberId(m)] ?? []) pushAddedChain(child);
  });
  if (directParentId) {
    for (const person of addedByParent[directParentId] ?? []) pushAddedChain(person);
  }

  return (
    <div className="relative pl-5 ml-2 border-l-2 border-emerald-300 space-y-3">
      {rows.map(r => <div key={r.key}>{r.node}</div>)}
    </div>
  );
}

/* Boxed card for a report who is themself a small node in the tree (has
   their own reports) — recurses via a blue stem, same connector language
   as the HOD→managers T-connector above, just smaller. This is what makes
   Kunal → Rainy Chaudhary read as "one more branch of the org chart"
   rather than a flat list entry.
   Fixed width plus a clamped, reserved-height role line (same fixed-space
   idea as FlatMemberCard) rather than sizing to each card's own text — a
   long role like Nischal Bhardwaj's ("Plant Costing & Budgeting- Factory")
   used to make his card visibly taller/wider than siblings sitting right
   next to it (Prateek Aggarwal, Amit Madan) in the same row. */
function ReportBoxCard({ member, delayMs }: { member: TeamMember; delayMs: number }) {
  const kids = member.reports ?? [];
  const personId = memberId(member);
  const merged = useMergedPerson(personId, member);
  const hidden = useIsHidden(personId);
  // Hiding this card must not take its own real reports down with it —
  // Rainy Chaudhary is Anshul Antil's actual static report, not something
  // that should vanish just because Anshul got removed. So a hidden box
  // renders none of its own box/label, but still renders its kids (and
  // anyone added under it) one level up, as if it were never there.
  if (hidden) {
    if (kids.length === 0) return null;
    return (
      <div className="flex flex-col items-center gap-2" style={{ animationDelay: `${delayMs}ms` }}>
        {kids.map(r => <ReportBoxCard key={r.name} member={r} delayMs={delayMs + 90} />)}
        <AddedBranch parentId={personId} size="box" />
      </div>
    );
  }
  return (
    <div className="ih-pop-in flex flex-col items-center" style={{ animationDelay: `${delayMs}ms` }}>
      <div className="ih-tilt relative rounded-xl bg-amber-50 border border-amber-200 shadow-sm px-2.5 py-1.5 w-[122px]">
        <InlineAddButton parentId={personId} />
        <p className="text-sm font-black text-slate-900 leading-tight line-clamp-2" title={merged.name}>{merged.name}</p>
        <p className="text-[12px] font-bold text-amber-600 mt-1 leading-snug line-clamp-3 min-h-[3.6em]" title={merged.role}>
          {merged.role}
        </p>
      </div>
      {kids.length > 0 && (
        <>
          <div aria-hidden className="w-px h-5 bg-sky-300" />
          <div className="flex flex-col items-center gap-2">
            {kids.map(r => <ReportBoxCard key={r.name} member={r} delayMs={delayMs + 90} />)}
          </div>
        </>
      )}
      <AddedBranch parentId={personId} size="box" />
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
function ReportBranchGrid({ members, baseDelay, directParentId }: {
  members: TeamMember[]; baseDelay: number; directParentId?: string;
}) {
  // Someone added straight under this manager (not under one of the
  // manager's own static reports) belongs in this SAME wrapping grid, as
  // one more box beside Anshul/Kunal/Ravi — rendering them via a separate
  // AddedBranch section below the grid (the old approach) put them outside
  // the grid's own flex-wrap, which is what made them look detached/
  // floating instead of attached to the manager's team.
  const { addedByParent } = useContext(TreeEditContext);
  const addedDirect = directParentId ? addedByParent[directParentId] ?? [] : [];
  const multi = members.length + addedDirect.length > 1;
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
        {addedDirect.map((person, i) => (
          <div key={person.person_id} className="relative flex flex-col items-center"
            style={{ animationDelay: `${baseDelay + (members.length + i) * 90}ms` }}>
            <div className="ih-pop-in flex flex-col items-center">
              <AddedPersonCard person={person} size="box" />
              <AddedBranch parentId={person.person_id} size="box" />
            </div>
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

/* PPC's second peer column — Heera Swami's own GM seat, sitting beside the
   vacant Plant Head title (SubTreeRootCard) with no shared parent above
   either. Its own component (rather than inline JSX in DeptSubTree) mainly
   so it can hold the merge/edit hooks a plain conditional block can't. */
function PeerCard({ hodId, peer, collapsed, onToggleCollapse, showConnector }: {
  hodId: string; peer: { name: string; role: string; department?: string };
  collapsed: boolean; onToggleCollapse: () => void; showConnector: boolean;
}) {
  const personId = `${hodId}--peer`;
  const merged = useMergedPerson(personId, peer);
  if (useIsHidden(personId)) return null;
  return (
    <div className="relative w-72">
      <div className="relative rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm p-5">
        <InlineAddButton parentId={personId} />
        <div className="flex items-center gap-3.5">
          {merged.photo
            ? <img src={merged.photo} alt={merged.name} className="w-16 h-16 shrink-0 rounded-full object-cover object-top ring-2 ring-white shadow" />
            : <GenericAvatar big />}
          <div className="min-w-0 flex-1">
            <p className="font-black text-slate-900 text-lg">{merged.name}</p>
            <p className="text-sm font-bold text-amber-700 mt-1">{merged.role}</p>
            {merged.department && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                <Building2 className="w-4 h-4" />
                <span className="truncate">{merged.department}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <CollapseToggle collapsed={collapsed} onClick={onToggleCollapse}
        title={collapsed ? 'Expand team' : 'Collapse team'} />
      {/* connector into Nischal Bharadwaj's column, in the flex gap */}
      {showConnector && (
        <div aria-hidden className="hidden sm:block absolute top-1/2 -translate-y-1/2 -right-10 sm:-right-16 w-10 sm:w-16 h-px bg-amber-300" />
      )}
    </div>
  );
}

/* The plain (non-flat, non-peer) case's own HOD card at the top of a
   sub-tree drill-down — same person as the HOD grid card that led here
   (PersonCard), just laid out full-width instead of the grid tile, so it
   shares the same person_id and picks up the same live override. */
function HodOwnCard({ hod, members }: { hod: Person; members: TeamMember[] }) {
  const merged = useMergedPerson(hod.id, hod);
  return (
    <div className="relative rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm p-5">
      <ColumnPickerAddButton hodId={hod.id} columns={members.map(m => ({ id: memberId(m), name: m.name }))} />
      <div className="flex items-center gap-3.5">
        <PersonAvatar name={merged.name} photo={merged.photo} big />
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-900 text-lg">{merged.name}</p>
          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 inline-block mt-1">
            HOD
          </span>
          <p className="text-sm font-bold text-amber-700 mt-1">{merged.role}- {merged.department}- HO</p>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
            <Building2 className="w-4 h-4" />
            <span className="truncate">{merged.department}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* One card in a flat department tree — generic icon (no photos supplied
   for this department), name, role, and a location line, all in the same
   cream/amber card language as ManagerCard.
   Every part of the card reserves a fixed amount of space (name clamped to
   one line, role clamped to two, location pinned to the bottom via
   mt-auto) rather than sizing to its own text, so a row of cards with
   different name/role lengths still lines up — same avatar position, same
   role baseline, same location row — instead of each card being exactly as
   tall as its own content. */
/* `personId` is optional and overrides the identity-based memberId lookup
   — needed for the couple of call sites (SUB_TREE_ROOTS' peer2) that build
   a fresh, non-stable TeamMember-shaped object inline on every render
   rather than passing one of the static SUB_TREES objects through. */
function FlatMemberCard({ member, personId }: { member: TeamMember; personId?: string }) {
  const id = personId ?? memberId(member);
  const merged = useMergedPerson(id, member);
  if (useIsHidden(id)) return null;
  return (
    <div onMouseMove={onSpotlightMove}
      className="ih-spotlight ih-neon relative w-full h-full flex flex-col rounded-2xl border border-amber-200
                 bg-gradient-to-br from-amber-50 to-white shadow-sm p-4"
      style={{ ['--ih-neon' as string]: '#f59e0b' }}>
      <InlineAddButton parentId={id} />
      <div className="flex items-start gap-3">
        {merged.photo
          ? (
            <img src={merged.photo} alt={merged.name}
              className="w-11 h-11 shrink-0 rounded-full object-cover object-top ring-2 ring-white shadow" />
          )
          : <GenericAvatar />}
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-900 text-[13px] leading-tight line-clamp-1" title={merged.name}>{merged.name}</p>
          <p className="text-[11px] font-semibold text-slate-600 mt-1 leading-snug line-clamp-2 min-h-[2.4em]" title={merged.role}>
            {merged.role}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-auto pt-2.5 text-[10.5px] text-slate-400 min-h-[1.25em]">
        {member.location && (
          <>
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{member.location}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* Straight top-to-bottom chain of cards, one stem per link — used for PPC's
   peer columns (Plant Head / Heera Swami / Nischal Bharadwaj) per the org
   chart supplied, which draws each column as a single vertical line of
   boxes rather than a bus fanning out to siblings. */
function VerticalChainBranch({ members }: { members: TeamMember[] }) {
  return (
    <div className="flex flex-col items-center">
      {members.map((m, i) => (
        <div key={m.name} className="ih-pop-in flex flex-col items-center" style={{ animationDelay: `${140 + i * 90}ms` }}>
          <div aria-hidden className="w-px h-6 bg-amber-300" />
          <div className="w-[210px]"><FlatMemberCard member={m} /></div>
          <AddedBranch parentId={memberId(m)} size="stack" />
        </div>
      ))}
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
        {/* Grid, not flex-wrap — a CSS grid row stretches every card in it to
            the tallest card's height and gives every column the same width,
            so cards line up row by row even though FlatMemberCard's actual
            content length varies member to member. flex-wrap left each card
            exactly as tall as its own text. */}
        <div className={`grid grid-cols-[repeat(auto-fit,minmax(205px,1fr))] gap-4 ${multi ? 'pt-8' : ''}`}>
          {members.map((m, i) => (
            <div key={m.name} className="ih-pop-in relative flex flex-col" style={{ animationDelay: `${140 + i * 90}ms` }}>
              <FlatMemberCard member={m} />
              <AddedBranch parentId={memberId(m)} size="stack" />
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
/* One "Edit team" entry point per department, next to the Back button,
 * instead of a pencil on every card down the branch. Opens a searchable
 * list of everyone in this HOD's drill-down (the HOD themself included) —
 * pick a name and the same edit modal every other card already uses opens
 * for them. */
function TeamEditPicker({ hod, root, members }: {
  hod: Person; root?: SubTreeRoot; members: TeamMember[];
}) {
  const { profiles, addedByParent, canEdit, openEditor } = useContext(TreeEditContext);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const team = useMemo(() => {
    // flattenTeam's own first entry IS the HOD, so staticIds already
    // contains hod.id — seeding the BFS queue with hod.id a second time
    // (as this used to do) walked addedByParent[hod.id] twice, duplicating
    // every person added straight under the HOD in this list.
    const staticTeam = flattenTeam(hod, root, members);
    const staticIds = staticTeam.map(t => t.personId);
    const added = collectAddedDescendants(staticIds, addedByParent);
    return [...staticTeam, ...added].map(t => {
      const merged = mergeProfile(profiles[t.personId], t);
      return { personId: t.personId, name: merged.name, role: merged.role, department: merged.department };
    });
  }, [hod, root, members, profiles, addedByParent]);

  if (!canEdit) return null;

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? team.filter(t => t.name.toLowerCase().includes(needle) || t.role.toLowerCase().includes(needle))
    : team;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-white
                   text-xs font-bold text-amber-700 hover:bg-amber-50 shadow-sm transition-all">
        <Pencil className="w-3.5 h-3.5" />Edit team
      </button>
      {open && (
        <>
          {/* Click-outside catcher — sits under the panel, above everything else. */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 top-full left-0 mt-1.5 w-72 bg-white border border-slate-200
                           rounded-xl shadow-xl p-2 ih-fade">
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                placeholder="Find someone to edit…"
                className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-slate-200 text-xs
                           focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-400/10" />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-0.5">
              {filtered.map(t => (
                <button key={t.personId} type="button"
                  onClick={() => { setOpen(false); setQ(''); openEditor(t.personId, { name: t.name, role: t.role, department: t.department }); }}
                  className="w-full flex flex-col items-start px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-left transition-colors">
                  <span className="text-xs font-bold text-slate-800">{t.name}</span>
                  <span className="text-[10.5px] text-amber-600 font-semibold">{t.role}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-3">No match.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* Structured the same way as TeamEditPicker beside it — same trigger
 * shape, same search dropdown — just red instead of amber, and picking a
 * name asks for a confirm inline (in place of the name/role row) rather
 * than opening straight into an action, since this one can't be undone
 * from the UI the way an edit can. */
function RemovePicker({ people, variant = 'button' }: {
  people: { personId: string; name: string; role: string; department?: string; isNew: boolean }[];
  variant?: 'button' | 'pill';
}) {
  const { canManage, removePerson } = useContext(TreeEditContext);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!canManage || people.length === 0) return null;

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? people.filter(p => p.name.toLowerCase().includes(needle) || p.role.toLowerCase().includes(needle))
    : people;

  const doRemove = async (p: typeof people[number]) => {
    setBusy(true); setError('');
    try {
      await removePerson(p.personId, p.isNew, { name: p.name, role: p.role, department: p.department });
      setConfirming(null); setOpen(false); setQ('');
    } catch {
      setError('Could not remove. Try again.');
    }
    setBusy(false);
  };

  const close = () => { setOpen(false); setConfirming(null); setError(''); };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={variant === 'pill'
          ? 'ih-pop-in flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-dashed border-rose-200 text-rose-500 shadow-sm hover:bg-rose-50 hover:border-rose-300 transition-all'
          : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-xs font-bold text-rose-600 hover:bg-rose-50 shadow-sm transition-all'}>
        <UserMinus className="w-3.5 h-3.5" />
        {variant === 'pill' ? <span className="text-[10px] font-black uppercase tracking-wider">Remove</span> : 'Remove'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} />
          <div className="absolute z-40 top-full right-0 mt-1.5 w-72 bg-white border border-slate-200
                           rounded-xl shadow-xl p-2 ih-fade">
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                placeholder="Find someone to remove…"
                className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-slate-200 text-xs
                           focus:outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-400/10" />
            </div>
            {error && <p className="text-[10.5px] font-bold text-rose-500 mb-1.5 px-1">{error}</p>}
            <div className="max-h-64 overflow-y-auto space-y-0.5">
              {filtered.map(p => (
                confirming === p.personId ? (
                  <div key={p.personId} className="px-2.5 py-1.5 rounded-lg bg-rose-50">
                    <p className="text-[11px] font-bold text-slate-700 mb-1.5">Remove {p.name}?</p>
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={busy} onClick={() => doRemove(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-black
                                   text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50">
                        {busy && <Loader2 className="w-3 h-3 animate-spin" />}Remove
                      </button>
                      <button type="button" disabled={busy} onClick={() => setConfirming(null)}
                        className="px-2.5 py-1 rounded-md text-[10.5px] font-bold text-slate-500 hover:bg-white">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button key={p.personId} type="button" onClick={() => setConfirming(p.personId)}
                    className="w-full flex flex-col items-start px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-left transition-colors">
                    <span className="text-xs font-bold text-slate-800">{p.name}</span>
                    <span className="text-[10.5px] text-slate-400 font-semibold">{p.role}</span>
                  </button>
                )
              ))}
              {filtered.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-3">No match.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* Permanent header control (not a toast) — stays available for whatever was
 * most recently removed, on both the main tree and every sub-tree, since
 * removePerson/undo live once at the page level (see ApisTreePage). Greyed
 * out and inert once there's nothing to undo, same disabled-affordance
 * pattern as everywhere else in this header row. */
function UndoButton({ variant = 'button' }: { variant?: 'button' | 'pill' }) {
  // Both things this can undo -- putting somebody back on the chart, and
  // re-adding a person who was deleted -- are add/remove, not card edits.
  const { canManage, undoLabel, performUndo } = useContext(TreeEditContext);
  const [busy, setBusy] = useState(false);

  if (!canManage) return null;

  const disabled = !undoLabel || busy;
  const go = async () => {
    if (!undoLabel) return;
    setBusy(true);
    try { await performUndo(); } finally { setBusy(false); }
  };

  return (
    <button type="button" disabled={disabled} onClick={go}
      title={undoLabel ? `Undo removing ${undoLabel}` : 'Nothing to undo'}
      className={variant === 'pill'
        ? `ih-pop-in flex items-center gap-2 px-3.5 py-2 rounded-xl border shadow-sm transition-all
           ${disabled
             ? 'bg-white border-dashed border-slate-200 text-slate-300 cursor-not-allowed'
             : 'bg-white border-dashed border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'}`
        : `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold shadow-sm transition-all
           ${disabled
             ? 'border-slate-200 bg-white text-slate-300 cursor-not-allowed'
             : 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50'}`}>
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
      {variant === 'pill' ? <span className="text-[10px] font-black uppercase tracking-wider">Undo</span> : 'Undo'}
    </button>
  );
}

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

  // Feeds RemovePicker below — everyone in this HOD's own team: the static
  // roster (live overrides merged in for the names), plus every added
  // person anywhere in the subtree, however deep — someone added under
  // Hemant Tripathi, or under someone THEY added, is still reachable from
  // here by walking addedByParent down from each static member as well as
  // from the HOD themself. Excludes the HOD (removing the person whose
  // team you're standing inside belongs to the header's own "Remove HOD"
  // list, not here) and anyone already hidden.
  const { profiles, addedByParent } = useContext(TreeEditContext);
  const removableMembers = useMemo(() => {
    // Same double-count bug TeamEditPicker had: flattenTeam's first entry
    // is already the HOD, so staticIds already contains hod.id — seeding
    // the BFS with hod.id again walked addedByParent[hod.id] twice.
    const staticTeam = flattenTeam(hod, root, members);
    const staticIds = staticTeam.map(t => t.personId);
    return [
      ...staticTeam
        .filter(t => t.personId !== hod.id && !profiles[t.personId]?.is_hidden)
        .map(t => {
          const m = mergeProfile(profiles[t.personId], t);
          return { personId: t.personId, name: m.name, role: m.role, department: m.department, isNew: false };
        }),
      ...collectAddedDescendants(staticIds, addedByParent)
        .map(t => ({ ...t, isNew: true })),
    ];
  }, [hod, root, members, profiles, addedByParent]);

  return (
    <div className="ih-fade">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white
                     text-xs font-bold text-slate-500 hover:text-amber-600 hover:border-amber-300 shadow-sm transition-all">
          <ArrowLeft className="w-3.5 h-3.5" />Back to All Heads of Department
        </button>
        <TeamEditPicker hod={hod} root={root} members={members} />
        <RemovePicker people={removableMembers} variant="button" />
        <UndoButton variant="button" />
      </div>

      <div className="flex flex-col items-center">
        {/* level 1 — the HOD, a vacant position title for flat trees, or (PPC)
            two peer boxes side by side with no shared parent above them. The
            peer case puts each box AND its own branch in one flex column
            together (not a separate box row + separate branch row) so a
            narrow box still centres correctly over its own much wider
            branch below it — matching how every other sub-tree's narrow HOD
            box already sits above its wider T-bar/branch, just doubled. */}
        {root?.peer ? (
          <div className="ih-pop-in w-full">
            <div className="flex flex-wrap items-start justify-center gap-x-10 sm:gap-x-16 gap-y-10">
              <div className="flex flex-col items-center">
                <div className="relative w-full max-w-xs">
                  <SubTreeRootCard root={root} />
                  {/* connector into Heera Swami's column, in the flex gap */}
                  <div aria-hidden className="hidden sm:block absolute top-1/2 -translate-y-1/2 -right-10 sm:-right-16 w-10 sm:w-16 h-px bg-amber-300" />
                </div>
                <Collapsible open={!collapsed}>
                  <div aria-hidden className="w-px h-8 bg-amber-300 mx-auto" />
                  <VerticalChainBranch members={members} />
                </Collapsible>
              </div>
              <div className="flex flex-col items-center">
                <PeerCard hodId={hod.id} peer={root.peer} collapsed={collapsed}
                  onToggleCollapse={() => setCollapsed(c => !c)}
                  showConnector={!!root.peer2} />
                <Collapsible open={!collapsed}>
                  <div aria-hidden className="w-px h-8 bg-amber-300 mx-auto" />
                  <VerticalChainBranch members={root.peerMembers ?? []} />
                  <AddedBranch parentId={`${hod.id}--peer`} size="stack" />
                </Collapsible>
              </div>
              {root.peer2 && (
                <div className="flex flex-col items-center">
                  <div className="relative w-[210px]">
                    {root.peer2Label && (
                      <span className="hidden sm:block absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap
                                       text-[9px] font-black uppercase tracking-wide text-amber-700 bg-amber-50
                                       border border-amber-200 rounded-full px-2 py-0.5 shadow-sm">
                        {root.peer2Label}
                      </span>
                    )}
                    <FlatMemberCard member={{ name: root.peer2.name, role: root.peer2.role }}
                      personId={`${hod.id}--peer2`} />
                  </div>
                  <Collapsible open={!collapsed}>
                    <div aria-hidden className="w-px h-8 bg-amber-300 mx-auto" />
                    <VerticalChainBranch members={root.peer2Members ?? []} />
                    <AddedBranch parentId={`${hod.id}--peer2`} size="stack" />
                  </Collapsible>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="ih-pop-in relative w-full max-w-md">
            {root ? (
              <SubTreeRootCard root={root} />
            ) : (
              <HodOwnCard hod={hod} members={members} />
            )}
            <CollapseToggle collapsed={collapsed} onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Expand team' : 'Collapse team'} />
          </div>
        )}

        <Collapsible open={!collapsed}>
          {root?.peer ? null : root || FLAT_TREE_IDS.has(hod.id) ? (
            <>
              {/* flat tree: one amber stem straight into the T-connector, no manager tier */}
              <div aria-hidden className="w-px h-8 bg-amber-300 mx-auto" />
              <FlatBranch members={members} />
              {!root && <AddedBranch parentId={hod.id} />}
            </>
          ) : (
            <>
              {/* stem from the HOD down to the T-bar */}
              <div aria-hidden className="w-px h-10 bg-sky-300 mx-auto" />

              {/* One unified column list — the static managers plus anyone
                  added straight under the HOD via "+ Add new manager" —
                  rendered as equal peers in the same row, not a separate
                  section bolted on below. A person added this way used to
                  render via a visually distinct "Additional managers"
                  block underneath the whole table; now they're just one
                  more column, same tier, same size, same T-bar line as
                  every other manager.
                  The T-bar itself is a border-top on the row rather than a
                  fixed-percentage absolutely-positioned line — that's what
                  lets this work for any column count instead of only the
                  1/2/3-manager cases the old layout hardcoded for. */}
              {(() => {
                const addedManagers = addedByParent[hod.id] ?? [];
                const totalCols = members.length + addedManagers.length;
                if (totalCols === 1 && members.length === 1) {
                  // A single manager and nothing else added: no T-bar at
                  // all, same as before — one straight centred stem.
                  const mgr = members[0];
                  const branchOpen = !closedBranches.has(mgr.name);
                  const reports = mgr.reports ?? [];
                  const nested = hasNestedReports(reports);
                  return (
                    <div className="flex flex-col items-center pt-10">
                      <div className="ih-pop-in relative flex flex-col items-center" style={{ animationDelay: '140ms' }}>
                        <div className="relative w-full max-w-[300px]">
                          <ManagerCard member={mgr} />
                          {reports.length > 0 && (
                            <CollapseToggle collapsed={!branchOpen} onClick={() => toggleBranch(mgr.name)}
                              title={branchOpen ? `Collapse ${mgr.name}'s team` : `Expand ${mgr.name}'s team`} />
                          )}
                        </div>
                        {(reports.length > 0 || (addedByParent[memberId(mgr)]?.length ?? 0) > 0) && (
                          <Collapsible open={branchOpen}>
                            <div className="pt-5 w-full flex justify-center">
                              {nested
                                ? <ReportBranchGrid members={reports} baseDelay={300} directParentId={memberId(mgr)} />
                                : <ReportLeafList members={reports} baseDelay={300} directParentId={memberId(mgr)} />}
                            </div>
                          </Collapsible>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="pt-10">
                    <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-10 relative
                                     before:content-[''] before:absolute before:-top-10 before:left-1/2 before:-translate-x-1/2
                                     before:w-[calc(100%-4rem)] before:h-px before:bg-sky-300 before:hidden sm:before:block">
                      {members.map((mgr, i) => {
                        const branchOpen = !closedBranches.has(mgr.name);
                        const reports = mgr.reports ?? [];
                        const nested = hasNestedReports(reports);
                        return (
                          <div key={mgr.name} className="ih-pop-in relative flex flex-col items-center w-full sm:w-auto sm:flex-1 sm:min-w-[270px]"
                            style={{ animationDelay: `${140 + i * 100}ms` }}>
                            <div aria-hidden className="hidden sm:block absolute -top-10 left-1/2 -translate-x-1/2 w-px h-10 bg-sky-300" />
                            {mgr.stemLabel && (
                              <span className="hidden sm:block absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap
                                               text-[9px] font-black uppercase tracking-wide text-amber-700 bg-amber-50
                                               border border-amber-200 rounded-full px-2 py-0.5 shadow-sm">
                                {mgr.stemLabel}
                              </span>
                            )}
                            <div className="relative w-full max-w-[300px]">
                              <ManagerCard member={mgr} />
                              {reports.length > 0 && (
                                <CollapseToggle collapsed={!branchOpen} onClick={() => toggleBranch(mgr.name)}
                                  title={branchOpen ? `Collapse ${mgr.name}'s team` : `Expand ${mgr.name}'s team`} />
                              )}
                            </div>
                            {(reports.length > 0 || (addedByParent[memberId(mgr)]?.length ?? 0) > 0) && (
                              <Collapsible open={branchOpen}>
                                <div className="pt-5 w-full flex justify-center">
                                  {nested
                                    ? <ReportBranchGrid members={reports} baseDelay={300 + i * 60} directParentId={memberId(mgr)} />
                                    : <ReportLeafList members={reports} baseDelay={300 + i * 60} directParentId={memberId(mgr)} />}
                                </div>
                              </Collapsible>
                            )}
                          </div>
                        );
                      })}
                      {addedManagers.map((person, i) => (
                        <div key={person.person_id} className="ih-pop-in relative flex flex-col items-center w-full sm:w-auto sm:flex-1 sm:min-w-[270px]"
                          style={{ animationDelay: `${140 + (members.length + i) * 100}ms` }}>
                          <div aria-hidden className="hidden sm:block absolute -top-10 left-1/2 -translate-x-1/2 w-px h-10 bg-sky-300" />
                          <div className="relative w-full max-w-[300px]">
                            <AddedPersonCard person={person} size="manager" />
                          </div>
                          <div className="pt-5 w-full flex justify-center">
                            <AddedBranch parentId={person.person_id} size="stack" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </Collapsible>
      </div>
    </div>
  );
}

/* Photo + name/role/department form for whichever card was clicked —
   one modal shared by every card type on the page, since they're all
   editing the same three fields (plus an optional photo) against the same
   endpoint. Pre-filled with the currently-merged/displayed values the card
   was already showing, per the "a save always writes a complete row"
   contract the backend asks for. */
function TreeEditModal({ mode, personId, parentHodId, baseline, hasOverride, onSaved, onReverted, onClose }: {
  mode: 'edit' | 'create';
  personId?: string; parentHodId?: string;
  baseline: EditableBaseline; hasOverride: boolean;
  onSaved: (profile: Profile) => void; onReverted: () => void; onClose: () => void;
}) {
  const [name, setName] = useState(baseline.name);
  const [role, setRole] = useState(baseline.role);
  const [dept, setDept] = useState(baseline.department ?? '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(baseline.photo ?? '');
  const [busy, setBusy] = useState<'save' | 'revert' | null>(null);
  const [error, setError] = useState('');

  const onPickPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (mode === 'create') {
      if (!name.trim()) { setError('Name is required.'); return; }
      if (!role.trim()) { setError('Role / designation is required.'); return; }
      if (!dept.trim()) { setError('Department is required.'); return; }
    }
    setBusy('save'); setError('');
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('role', role.trim());
      fd.append('department', dept.trim());
      if (photoFile) fd.append('photo', photoFile);
      let r: Response;
      if (mode === 'create') {
        fd.append('parent_hod_id', parentHodId ?? '');
        r = await apiFetch(`${TREE_API}/profiles/`, { method: 'POST', body: fd });
      } else {
        r = await apiFetch(`${TREE_API}/profiles/${encodeURIComponent(personId!)}/`, { method: 'PATCH', body: fd });
      }
      if (!r.ok) throw new Error(r.status === 403 ? "You don't have permission to do this." : 'Save failed.');
      const d = await r.json();
      onSaved(d.profile as Profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setBusy(null);
    }
  };

  const revert = async () => {
    setBusy('revert'); setError('');
    try {
      const r = await apiFetch(`${TREE_API}/profiles/${encodeURIComponent(personId!)}/`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Revert failed.');
      onReverted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revert failed.');
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className="ih-pop-in w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-5"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-black text-slate-900">{mode === 'create' ? 'Add person' : 'Edit card'}</p>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          {preview
            ? <img src={preview} alt="" className="w-16 h-16 rounded-full object-cover object-top ring-2 ring-white shadow" />
            : <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-700"><User className="w-7 h-7" /></div>}
          <label className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer">
            Change photo
            <input type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
          </label>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Name{mode === 'create' && <span className="text-rose-500"> *</span>}
            </span>
            <input value={name} onChange={e => setName(e.target.value)} required={mode === 'create'}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400" />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Role / designation{mode === 'create' && <span className="text-rose-500"> *</span>}
            </span>
            <input value={role} onChange={e => setRole(e.target.value)} required={mode === 'create'}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400" />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Department{mode === 'create' && <span className="text-rose-500"> *</span>}
            </span>
            <input value={dept} onChange={e => setDept(e.target.value)} required={mode === 'create'}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400" />
          </label>
        </div>

        {error && <p className="mt-3 text-xs font-bold text-rose-500">{error}</p>}

        <div className="mt-5 flex items-center justify-between gap-2">
          {hasOverride ? (
            <button onClick={revert} disabled={busy !== null}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-rose-500 disabled:opacity-50">
              {busy === 'revert' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Revert to default
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={busy !== null}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button onClick={save} disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black text-white
                         bg-amber-500 hover:bg-amber-600 shadow-sm shadow-amber-500/30 disabled:opacity-50">
              {busy === 'save' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === 'create' ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ApisTreePage() {
  const [selectedId, setSelectedId] = useState<string>(managingDirector.id);
  const [department, setDepartment] = useState('All');
  const [query, setQuery] = useState('');

  // Who's signed in, so we know whether to show edit affordances at all —
  // this page doesn't otherwise need identity, so it fetches it itself on
  // mount rather than requiring a prop from App.tsx (same pattern as any
  // other standalone page that needs the current portal user).
  const [me, setMe] = useState<PortalUser | null>(null);
  useEffect(() => { fetchMe().then(setMe); }, []);
  // Managing implies editing: somebody trusted to add a person is not then
  // barred from correcting their title. Mirrors auth.require_tree_editor.
  const canManage = !!me && (me.is_superadmin || me.can_manage_tree);
  const canEdit = canManage || (!!me && me.can_edit_tree);

  // Live overrides — an empty map is the normal starting state (nobody's
  // edited anything yet), and a failed fetch just leaves it empty too, so
  // the page always falls back to the hardcoded baseline data rather than
  // breaking over this one extra request.
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await apiFetch(`${TREE_API}/profiles/`);
        if (!alive || !r.ok) return;
        const d = await r.json();
        const byId: Record<string, Profile> = {};
        for (const p of (d.profiles ?? []) as Profile[]) byId[p.person_id] = p;
        setProfiles(byId);
      } catch {
        /* Baseline data still renders fine without the overrides. */
      }
    })();
    return () => { alive = false; };
  }, []);

  const [editing, setEditing] = useState<
    | { mode: 'edit'; personId: string; baseline: EditableBaseline }
    | { mode: 'create'; parentHodId: string }
    | null
  >(null);
  const openEditor = (personId: string, baseline: EditableBaseline) => setEditing({ mode: 'edit', personId, baseline });
  const openCreator = (parentHodId: string) => setEditing({ mode: 'create', parentHodId });

  // What "undo" means depends on what the removal actually did: unhide
  // (PATCH hidden=false) for a static card, since hiding never destroyed
  // anything — the override row still holds whatever it held before; a
  // best-effort recreate for an added person, since DELETE genuinely
  // erased that row. A recreate can't bring back a deleted photo (no file
  // survives the delete to re-upload) or any of that person's own added
  // children (cascade-deleted with them) — the undo still succeeds, it
  // just can't be more complete than the tools it's built from allow.
  // No auto-dismiss timer — the Undo control is a permanent header button
  // (see the header rows in ApisTreePage/DeptSubTree), not a toast, so it
  // stays available until the person actually clicks it or removes someone
  // else (which simply replaces it with the newer removal).
  const [undo, setUndo] = useState<
    | { kind: 'unhide'; personId: string; label: string }
    | { kind: 'recreate'; label: string; name: string; role: string; department: string; parentHodId: string }
    | null
  >(null);

  const removePerson = async (personId: string, isNew: boolean, baseline?: EditableBaseline) => {
    const before = profiles[personId];
    if (isNew) {
      const r = await apiFetch(`${TREE_API}/profiles/${encodeURIComponent(personId)}/`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Could not remove.');
      setProfiles(prev => {
        const next = { ...prev };
        delete next[personId];
        return next;
      });
      setUndo({
        kind: 'recreate', label: before?.name || 'That person',
        name: before?.name ?? '', role: before?.role ?? '',
        department: before?.department ?? '', parentHodId: before?.parent_hod_id ?? '',
      });
    } else {
      // Hiding a static card for the first time has no existing override
      // row — get_or_create on the backend makes a blank one, and the PATCH
      // only ever sent `hidden`, so that row stayed permanently blank (no
      // name/role/department) even though the card still displayed fine
      // off the hardcoded baseline. Carrying the caller's already-known
      // name/role/department along with `hidden=true` means the override
      // row is complete from the moment it's created, not just once
      // someone happens to edit that same card later.
      const fd = new FormData();
      fd.append('hidden', 'true');
      const name = before?.name || baseline?.name;
      const role = before?.role || baseline?.role;
      const department = before?.department || baseline?.department;
      if (name) fd.append('name', name);
      if (role) fd.append('role', role);
      if (department) fd.append('department', department);
      const r = await apiFetch(`${TREE_API}/profiles/${encodeURIComponent(personId)}/`, { method: 'PATCH', body: fd });
      if (!r.ok) throw new Error('Could not remove.');
      const d = await r.json();
      setProfiles(prev => ({ ...prev, [personId]: d.profile as Profile }));
      setUndo({ kind: 'unhide', personId, label: (d.profile as Profile).name || 'That card' });
    }
  };

  const performUndo = async () => {
    if (!undo) return;
    const action = undo;
    setUndo(null);
    try {
      if (action.kind === 'unhide') {
        const fd = new FormData();
        fd.append('hidden', 'false');
        const r = await apiFetch(`${TREE_API}/profiles/${encodeURIComponent(action.personId)}/`, { method: 'PATCH', body: fd });
        if (r.ok) {
          const d = await r.json();
          setProfiles(prev => ({ ...prev, [action.personId]: d.profile as Profile }));
        }
      } else {
        const fd = new FormData();
        fd.append('name', action.name);
        fd.append('role', action.role);
        fd.append('department', action.department);
        fd.append('parent_hod_id', action.parentHodId);
        const r = await apiFetch(`${TREE_API}/profiles/`, { method: 'POST', body: fd });
        if (r.ok) {
          const d = await r.json();
          const p = d.profile as Profile;
          setProfiles(prev => ({ ...prev, [p.person_id]: p }));
        }
      }
    } catch { /* the toast is already gone; nothing more to show for a failed undo */ }
  };

  // Added people (is_new rows) live in the same `profiles` map as overrides
  // — one fetch, one source of truth — split out here by where they render.
  const addedTopLevel = useMemo(
    () => Object.values(profiles).filter(p => p.is_new && !p.parent_hod_id),
    [profiles],
  );
  // Keyed by parent_hod_id, which despite the name is really just "whoever
  // this person reports to" — a HOD's id for a direct addition, or any
  // other card's own id for one added under it specifically. See
  // TreeEditContext's addedByParent doc comment.
  const addedByParent = useMemo(() => {
    const byParent: Record<string, Profile[]> = {};
    for (const p of Object.values(profiles)) {
      if (p.is_new && p.parent_hod_id) (byParent[p.parent_hod_id] ??= []).push(p);
    }
    return byParent;
  }, [profiles]);

  // Derived from the data, not hand-copied into a filter list — a hardcoded
  // option list silently drifts out of sync (and quietly hides a whole
  // department from the filter) the moment someone edits `hods` above.
  const departments = useMemo(
    () => Array.from(new Set(hods.map(h => h.department).filter((d): d is string => !!d))),
    [],
  );

  const visibleHods = hods.filter(h => !profiles[h.id]?.is_hidden);
  const filteredHods = department === 'All' ? visibleHods : visibleHods.filter(h => h.department === department);
  // Feeds the header's RemovePicker — every removable top-level card, HOD
  // or added, with live overrides already merged in so the list reads the
  // same names the grid itself currently shows.
  const removableTopLevel = useMemo(() => [
    ...visibleHods.map(h => {
      const m = mergeProfile(profiles[h.id], h);
      return { personId: h.id, name: m.name, role: m.role, department: m.department, isNew: false };
    }),
    ...addedTopLevel.map(p => ({ personId: p.person_id, name: p.name, role: p.role, department: p.department, isNew: true })),
  ], [visibleHods, addedTopLevel, profiles]);

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
    <TreeEditContext.Provider value={{
      profiles, addedByParent, canEdit, canManage, openEditor, openCreator, removePerson,
      undoLabel: undo?.label ?? null, performUndo,
    }}>
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
                {/* Same pill shape as the stats beside it, so adding a HOD
                    reads as one more thing you can do from this header
                    rather than a separate affordance living down in the
                    grid. */}
                <AddCardTile parentHodId="" variant="pill" />
                <RemovePicker people={removableTopLevel} variant="pill" />
                <UndoButton variant="pill" />
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

                {filteredHods.length === 0 && addedTopLevel.length === 0 ? (
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
                      {/* People added straight at the top level — not part of
                          the department filter/search above, since there
                          are only ever a handful and hiding one behind an
                          unrelated filter would make "where did they go"
                          the first question an admin who just added them
                          asks. */}
                      {addedTopLevel.map(person => (
                        <AddedPersonCard key={person.person_id} person={person} size="grid" />
                      ))}
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

      {editing?.mode === 'edit' && (
        <TreeEditModal
          mode="edit"
          personId={editing.personId}
          baseline={editing.baseline}
          hasOverride={!!profiles[editing.personId]}
          onClose={() => setEditing(null)}
          onSaved={(profile) => {
            setProfiles(prev => ({ ...prev, [profile.person_id]: profile }));
            setEditing(null);
          }}
          onReverted={() => {
            setProfiles(prev => {
              const next = { ...prev };
              delete next[editing.personId];
              return next;
            });
            setEditing(null);
          }}
        />
      )}
      {editing?.mode === 'create' && (
        <TreeEditModal
          mode="create"
          parentHodId={editing.parentHodId}
          baseline={{ name: '', role: '', department: '', photo: '' }}
          hasOverride={false}
          onClose={() => setEditing(null)}
          onSaved={(profile) => {
            setProfiles(prev => ({ ...prev, [profile.person_id]: profile }));
            setEditing(null);
          }}
          onReverted={() => setEditing(null)}
        />
      )}

    </div>
    </TreeEditContext.Provider>
  );
}

export default ApisTreePage;

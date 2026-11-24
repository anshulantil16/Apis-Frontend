/* Who reports to whom below each HOD - the data behind the APIS Tree page,
 * kept apart from APIS_TREE.tsx (like hods.ts) so Ask APIS can look people
 * up without pulling in the org-chart page itself. */

/* Full reporting structure below a HOD — real names/roles as provided,
   parsed the same "shown exactly as filed, not normalised" way as `hods`
   in hods.ts. Only P&C, Admin & IT (Pankaj Tripathi) has been supplied so far;
   SUB_TREES is keyed by hod id so other departments fall back to the plain
   card-select behaviour until their structure is provided too. */
export type TeamMember = {
  name: string; role: string; hod?: boolean; photo?: string; location?: string; reports?: TeamMember[];
  /** The name this card was first saved under, when its shown name has
   * since been corrected - its id (and so any saved edit or photo) is
   * built from this, not from `name`. See memberId() in APIS_TREE.tsx. */
  key?: string;
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
export type SubTreeRoot = {
  title: string; vacant?: boolean; department?: string;
  peer?: { name: string; role: string; department?: string };
  peerMembers?: TeamMember[];
  peer2?: { name: string; role: string; department?: string };
  peer2Members?: TeamMember[];
  peer2Label?: string;
};
export const SUB_TREE_ROOTS: Record<string, SubTreeRoot> = {
  'heera-swami': {
    title: 'Plant Head- Roorkee', vacant: true, department: 'Manufacturing',
    peer: { name: 'Heera Polandeappn', role: 'C1- GM- HO', department: 'Manufacturing' },
    peerMembers: [
      { name: 'Sandeep Kumar', key: 'Sandeep', role: 'M1- AM- HO' },
      { name: 'Kamaljeet', role: 'O5- Sr. Executive- HO' },
      { name: 'Vacant', role: 'O4- Executive- HO' },
    ],
    peer2: { name: 'Nischal Bhardwaj', role: 'M4- Sr. Manager- Finance & Accounts- Roorkee', department: 'Finance & Accounts' },
    peer2Members: [
      { name: 'Praveen Kumar Sharma', key: 'Praveen Sharma', role: 'M3- Manager- P&C- Roorkee' },
    ],
    peer2Label: 'Reporting to functional head',
  },
};

export const SUB_TREES: Record<string, TeamMember[]> = {
  'pankaj-tripathi': [
    {
      name: 'Hemant Tripathi', role: 'M2- Dy. Manager- HRBP- HO',
      photo: '/hierarchy/Hemant_Tripathi.jpeg',
      reports: [
        { name: 'Sandhya Singh', role: 'M1- AM- TA & TM- HO' },
        { name: 'Gopa Chakarborty', key: 'Gopa', role: 'O5- Sr. Executive- TA & ER- HO' },
        { name: 'Manoj Kumar', role: 'O5- Sr. Executive- Payroll- HO' },
        { name: 'Sujat Alam', role: 'O5- Sr. Executive- P&C- HO' },
        { name: 'Kanchan Juneja', key: 'Kanchan', role: 'O5- Sr. Executive- Admin & Facilities- HO' },
        { name: 'Shobhit Verma', key: 'Shobhit', role: 'O4- Executive- EA cum Front Desk- Admin & Facilities- HO' },
        { name: 'Abhay', role: 'Management Trainee (MIS)- HR' },
      ],
    },
    {
      name: 'Devender Kumar', role: 'M2- Dy. Manager- IT- HO',
      photo: '/hierarchy/Devender Kumar- Dy. Manager - IT  .jpeg',
      reports: [
        // Anshul Antil sits first, with Rainy Chaudhary nested one level
        // under him; Sahil Jha beside him, then Kunal and Ravi.
        {
          name: 'Anshul Antil', role: 'O5- Business Analyst- IT- HO',
          reports: [{ name: 'Rainy Chaudhary', role: 'AI & ML Automation- IT- HO' }],
        },
        { name: 'Sahil Jha', role: 'O5- Business Analyst- IT- HO' },
        { name: 'Kunal', role: 'IT Support- IT- HO' },
        { name: 'Ravi Sharma', key: 'Ravi', role: 'O5- Sr. Executive- IT- Roorkee' },
      ],
    },
    {
      name: 'Praveen Kumar Sharma', key: 'Praveen Sharma', role: 'M3- Manager- P&C- Roorkee',
      photo: '/hierarchy/Praveen Sharma- Manager- P&C- Roorkee.jpeg',
      reports: [
        { name: 'Anju Tyagi', key: 'Anju', role: 'M1- AM- P&C- Roorkee' },
        { name: 'Mohit Kumar', key: 'Mohit', role: 'O5- Sr. Executive- P&C- Roorkee' },
        { name: 'Amandeep', role: 'O5- Sr. Executive- Admin & Facilities- Roorkee' },
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
    { name: 'Amir Khan', role: 'M1- AM- Stores & Dispatch- Roorkee', location: 'Roorkee' },
    { name: 'Sunil Kumar', role: 'M3- Manager- QA & QC- Roorkee', location: 'Roorkee' },
  ],
  // General Trade Sales (Arun Mishra). Flat — twelve regional GTR heads
  // reporting straight to him, no further nesting — rendered via FlatBranch
  // (FLAT_TREE_IDS) rather than the nested variant's manager tier, which
  // assumes a 3-column grid and doesn't wrap cleanly at this count.
  'arun-mishra': [
    { name: 'Mohinder Sharma', role: 'GTR 1- PB, HP & J&K- M2- Sr. ASM', location: 'Chandigarh',
      photo: '/hierarchy/arun-mishra/mohinder-sharma.jpeg' },
    { name: 'Ramesh Singh', key: 'Ramesh', role: 'GTR 2- DL, HR & RJ- M4- RSM', location: 'Delhi',
      photo: '/hierarchy/arun-mishra/ramesh.jpeg' },
    { name: 'Asif Ali Ansari', key: 'Asif Ali', role: 'GTR 3A- Central & East UP- M4- RSM', location: 'Prayagraj',
      photo: '/hierarchy/arun-mishra/asif-ali.jpeg' },
    { name: 'Rajeev Kumar Saxena', key: 'Rajeev Kumar', role: 'GTR 3B- UK & West UP- M2- Sr. ASM', location: 'Ghaziabad',
      photo: '/hierarchy/arun-mishra/rajeev-kumar.webp' },
    { name: 'Arnab Ghosh', role: 'GTR 4A- WB & NE- M4- RSM', location: 'Kolkata',
      photo: '/hierarchy/arun-mishra/arnab-ghosh.webp' },
    { name: 'Gulshan Kumar', role: 'GTR 4B- BR & JH- M3- Dy. RSM', location: 'Patna',
      photo: '/hierarchy/arun-mishra/gulshan-kumar.jpeg' },
    { name: 'Shakil Ahmed', role: 'GTR 5- OD, CG & MP- M4- RSM', location: 'Bhilai',
      photo: '/hierarchy/arun-mishra/shakil-ahmed.jpeg' },
    { name: 'Sanjay Kumar Singh', key: 'Sanjay Singh', role: 'GTR 6A- Rest of MH- M4- RSM', location: 'Pune',
      photo: '/hierarchy/arun-mishra/sanjay-singh.jpeg' },
    { name: 'Vinod Shah', role: 'GTR 6B- Mumbai & GJ- M2- Sr. ASM', location: 'Mumbai',
      photo: '/hierarchy/arun-mishra/vinod-shah.jpeg' },
    { name: 'B. Bhaskar', role: 'GTR 7- AP & TG- M4- RSM', location: 'Hyderabad',
      photo: '/hierarchy/arun-mishra/b-bhaskar.jpg' },
    { name: 'R. Patil', role: 'GTR 8- KA & Goa- M4- RSM', location: 'Bangalore',
      photo: '/hierarchy/arun-mishra/r-patil.jpeg' },
    { name: 'Vasanthkumar D', key: 'Vasanth D', role: 'GTR 9- TN & KL- M4- RSM', location: 'Chennai',
      photo: '/hierarchy/arun-mishra/vasanth-d.jpeg' },
  ],
  // Business To Business (B2B) Sales (Narendra Gangawar) — no one listed
  // under him. Kept as an empty entry, not dropped, so his card still opens
  // the drill-down where a manager can add someone with the "+" button.
  'narendra-gangwar': [],
  // Sales - Alternate Channel (Vaibhav Mishra). The three level-2 "manager"
  // slots below aren't people, they're the department groupings from the
  // org chart supplied (Modern Trade / Ecommerce / Sales Coordination) —
  // reusing the manager-card slot for a group label instead of a person is
  // what lets this reuse the existing nested/leaf branch rendering as-is:
  // Modern Trade's one report (Gouri Shankar) has his own reports so it
  // draws as a nested box-grid branch; Ecommerce's one report (Hari Om) and
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
            { name: 'Naveen N Anchan', key: 'Navin Anchal', role: 'M1- KAM- HQ- Mumbai' },
            { name: 'Purushotham Kambalapally', role: 'M1- KAM- HQ- Hyderabad' },
            { name: 'Tumpa Biswas', key: 'Tumba Biswas', role: 'M1- KAM- HQ- Kolkata' },
          ],
        },
      ],
    },
    {
      name: 'Ecommerce', role: 'Department',
      reports: [
        { name: 'Hari Om', role: 'M3- Customer Development Manager- HQ- Delhi' },
      ],
    },
    {
      name: 'Sales Coordination', role: 'Department',
      reports: [
        { name: 'Gaurav Dabral', role: 'O5- Sr. Executive- HQ- Delhi' },
        { name: 'Vishal Mahaur', role: 'O5- Sr. Executive- HQ- Delhi' },
        { name: 'Pooja Arora', role: 'O5- Sr. Executive- HQ- Delhi' },
      ],
    },
  ],
  // Business Excellence & Strategy / Supply Chain Management (R. Manigandan)
  // — per the org chart supplied, both level-2 slots are department-group
  // labels (same reuse of the "manager" slot as Vaibhav Mishra's tree
  // above), each recursing three people deep via ReportBoxCard. The vacant
  // seat under Sanjeev Kumar is modelled the same way PPC's vacant Plant
  // Head root is — the position title as the card, "Vacant" as its role.
  'r-manigandan': [
    {
      name: 'Supply Chain Management', role: 'Department',
      reports: [
        {
          name: 'Shri Prakash Chaubey', key: 'S.P. Chaubey', role: 'M4- Sr. Manager- HO',
          reports: [
            {
              name: 'Sanjeev Kumar', role: 'M1- AM- HO',
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
              name: 'Krishna Kumar', key: 'Krishna', role: 'M1- AM- HO',
              reports: [
                { name: 'K Vinay', key: 'K. Vinay', role: 'O4- Executive- SFA & Analytics- HO' },
              ],
            },
          ],
        },
        {
          name: 'Assurance – GT', role: 'Department',
          reports: [
            {
              name: 'Sunetro Banerjee', role: 'M3- Manager- HO',
              reports: [
                { name: 'Rajesh Sharma', role: 'O5- Sr. Executive- HO' },
              ],
            },
          ],
        },
      ],
    },
  ],
  // New Product Development (Dinesh Kumar) — three direct reports, no
  // further nesting, per the org chart supplied. The default nested-variant
  // rendering (HOD card → T-connector → manager boxes) already matches that
  // chart with no extra layout needed.
  'dinesh-kumar': [
    { name: 'Deepak Joshi', role: 'M1- AM- HO' },
    { name: 'Meeran Alam', role: 'O4- Exec- HO' },
    { name: 'Mahesh', role: 'O5- Sr. Exec- HO' },
  ],
  // Purchase & Procurement (Pradeep Kumar) — six flat direct reports,
  // one of them a vacant seat, per the org chart supplied. Added to
  // FLAT_TREE_IDS above (like Arun Mishra's 12 GTRs) rather than the
  // nested variant, since none of these six have reports of their own.
  'pradeep-krishali': [
    { name: 'Kundan Singh Mer', key: 'Kundan', role: 'M2- Dy. Manager', location: 'HO' },
    { name: 'Vacant', role: 'O5- Sr. Executive', location: 'HO' },
    { name: 'Rakesh Rajput', key: 'Rakesh', role: 'O5- Sr. Executive', location: 'HO' },
    { name: 'Swamendra Gupta', key: 'Swamendra', role: 'M2- Dy. Manager', location: 'HO' },
    { name: 'Ashish Pal', role: 'O5- Sr. Executive', location: 'HO' },
    { name: 'Neeraj Krishnatray', role: 'M1- AM', location: 'Roorkee' },
  ],
  // CS & Legal (Vikas Aggarwal) — one direct report, per the org chart
  // supplied. A single manager box under the HOD, no T-bar.
  'vikas-aggarwal': [
    { name: 'Sonal Mishra', key: 'Sonal', role: 'O4- Executive- HO' },
  ],
  // Export (Ershad Alam) — four flat direct reports, one of them a vacant
  // seat. Added to FLAT_TREE_IDS above. A vacant seat needs a distinct name
  // (grade folded in) since every flat-tree card is keyed by name.
  'ershad-alam': [
    { name: 'Vacant (M1-AM)', role: 'M1- AM', location: 'HO' },
    { name: 'Pratik Rai', role: 'O5- Sr. Executive- Export', location: 'HO' },
    { name: 'Gholam Yahya', key: 'Gholam', role: 'M1- AM', location: 'HO' },
    { name: 'Deepak Kumar', key: 'Deepak', role: 'O5- Sr. Executive', location: 'HO' },
  ],
  // Marketing (Naagesh Mishra) — one manager (Pankaj Jha) with four flat
  // direct reports of his own, one a vacant seat, per the org chart
  // supplied. Default nested-variant rendering already matches this shape:
  // HOD → single-manager stem → ManagerCard → green-spine leaf list (none
  // of the four have reports of their own).
  'naagesh-mishra': [
    {
      name: 'Pankaj Kumar Jha', key: 'Pankaj Jha', role: 'M4- Sr. Manager- Marketing- HO',
      reports: [
        { name: 'Aman Bhardwaj', role: 'M1- AM- ATL- HO' },
        { name: 'Abhishek Kumar Nagar', key: 'Abhishek Nagar', role: 'O5- Sr. Executive- HO' },
        { name: 'Anoop Sehgal', role: 'O5- Sr. Executive- Design- HO' },
        { name: 'Performance Marketing (Vacant)', role: 'M1- AM' },
      ],
    },
  ],
  // F&A / Internal Audit (Ankit Nagar) — same two-department-group shape as
  // r-manigandan above (Internal Audit / Finance & Accounting), each
  // recursing through its own manager(s). Nischal Bhardwaj sits at the same
  // level as Prateek Aggarwal and Amit Madan under Finance & Accounting, and
  // like them has his own single-line list of reports below him.
  'ankit-nagar': [
    {
      name: 'Internal Audit', role: 'Department', stemLabel: 'Functional Reporting',
      reports: [
        {
          name: 'Tapan Kumar Behera', key: 'Tapan Behera', role: 'M4- Sr. Manager- HO',
          reports: [
            { name: 'Rishab', role: 'O5- Sr. Executive' },
            { name: 'Pravesh Kumar', key: 'Pravesh', role: 'O5- Sr. Executive' },
            { name: 'Puneet Singh', role: 'O4- Executive' },
            { name: 'Abhishek Bisht', key: 'Abhishek', role: 'O4- Executive' },
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
            { name: 'Satendra Singh', key: 'Satendra', role: 'M1- AM' },
            { name: 'Azad', role: 'O5- Sr. Executive' },
            { name: 'Kumari Bhumika Vishwakarma', key: 'Bhumika', role: 'O4- Executive' },
            { name: 'Gaurav Gupta', key: 'Gaurav', role: 'O5- Sr. Executive' },
            { name: 'Sailabh', role: 'O4- Executive' },
            { name: 'Neha Baig', key: 'Neha', role: 'O4- Executive' },
          ],
        },
        {
          name: 'Amit Madan', role: 'M5- AGM – AR- HO',
          reports: [
            { name: 'Sumit Kumar', key: 'Sumit', role: 'M3- Manager' },
            { name: 'Mayank Jha', key: 'Mayank', role: 'O4- Executive' },
            { name: 'Roshan Kumar', key: 'Roshan', role: 'O5- Sr. Executive' },
            { name: 'Ashu Tyagi', key: 'Ashu', role: 'O5- Sr. Executive' },
            { name: 'Arif Ansari', key: 'Arif', role: 'O3- Officer' },
            { name: 'Sunil Kumar', role: 'O5- Sr. Executive' },
          ],
        },
        {
          name: 'Nischal Bhardwaj', role: 'M4- Sr. Manager- Plant Costing & Budgeting- Roorkee',
          // Finance & Accounts team list supplied by HR — name and
          // designation only, as given (no grade codes on that list).
          reports: [
            { name: 'Mohd. Alim', role: 'O5- Sr. Executive- Roorkee' },
            { name: 'Vipul Kumar', role: 'O4- Executive- Roorkee' },
            { name: 'Mohd Ashraf', role: 'O5- Sr. Executive- Roorkee' },
            { name: 'Rahul Kumar', role: 'M1- AM- Roorkee' },
          ],
        },
      ],
    },
  ],
};

/* Grade order, highest first: C2, C1, then M5 … M1, then O5 … O1, then
   W3 … W1. A grade is read from the role ("O5- Sr. Executive", or
   "GTR 1- PB, HP & J&K- M2- Sr. ASM"). A card with no grade (a department
   label, or a role given without one) ranks 0: department labels keep
   their order among themselves, and ungraded people go to the bottom. */
const BAND: Record<string, number> = { C: 400, M: 300, O: 200, W: 100 };
export function gradeRank(role: string): number {
  const m = /(?:^|[\s-])([CMOW])(\d)(?=\s*-|\s|$)/.exec(role || '');
  return m ? BAND[m[1]] + Number(m[2]) : 0;
}

/** Higher grade first (top of a column), lowest at the bottom. Stable, so
 *  people of the same grade keep the order they were given in. */
export function byGrade<T>(list: T[], role: (x: T) => string): T[] {
  return list.map((x, i) => [x, i] as const)
    .sort((a, b) => gradeRank(role(b[0])) - gradeRank(role(a[0])) || a[1] - b[1])
    .map(([x]) => x);
}

// Every list below each HOD, sorted once at load, before APIS_TREE.tsx
// builds the cards' ids from it.
function sortTeam(list: TeamMember[]): TeamMember[] {
  return byGrade(list, m => m.role).map(m => (m.reports ? { ...m, reports: sortTeam(m.reports) } : m));
}
for (const id of Object.keys(SUB_TREES)) SUB_TREES[id] = sortTeam(SUB_TREES[id]);
for (const r of Object.values(SUB_TREE_ROOTS)) {
  if (r.peerMembers) r.peerMembers = sortTeam(r.peerMembers);
  if (r.peer2Members) r.peer2Members = sortTeam(r.peer2Members);
}

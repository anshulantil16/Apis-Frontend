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
    title: 'Plant Head- Roorkee', vacant: true, department: 'PPC',
    peer: { name: 'Heera Swami', role: 'C1- GM- HO', department: 'PPC' },
    peerMembers: [
      { name: 'Sandeep', role: 'M1- AM- HO' },
      { name: 'Kamaljeet', role: 'O5- Sr. Executive- HO' },
      { name: 'Vacant', role: 'O4- Executive- HO' },
    ],
    peer2: { name: 'Nischal Bharadwaj', role: 'M4- Sr. Manager- Finance & Accounts- Roorkee', department: 'PPC' },
    peer2Members: [
      { name: 'Praveen Sharma', role: 'M3- Manager- P&C- Roorkee' },
    ],
    peer2Label: 'Reporting to functional head',
  },
};

export const SUB_TREES: Record<string, TeamMember[]> = {
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
        { name: 'Abhay', role: 'Management Trainee (MIS)- HR' },
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
    { name: 'Mohinder Sharma', role: 'GTR 1- Punjab, Himachal & Jammu & Kashmir- M3- Dy. RSM', location: 'Chandigarh',
      photo: '/hierarchy/arun-mishra/mohinder-sharma.jpeg' },
    { name: 'Ramesh', role: 'GTR 2- Delhi, Haryana & Rajasthan- M4- RSM', location: 'Delhi',
      photo: '/hierarchy/arun-mishra/ramesh.jpeg' },
    { name: 'Asif Ali', role: 'GTR3A- Central & Eastern UP- M4- RSM', location: 'Pravagraj',
      photo: '/hierarchy/arun-mishra/asif-ali.jpeg' },
    { name: 'Rajeev Kumar', role: 'GTR 3B- Uttarakhand & Western UP- M2- Sr. ASM', location: 'Ghaziabad',
      photo: '/hierarchy/arun-mishra/rajeev-kumar.webp' },
    { name: 'Arnab Ghosh', role: 'GTR 4A- West Bengal, North East Region- M5- RSM', location: 'Kolkata',
      photo: '/hierarchy/arun-mishra/arnab-ghosh.webp' },
    { name: 'Gulshan Kumar', role: 'GTR 4B- Bihar & Jharkhand- M3- Dy. RSM', location: 'Patna',
      photo: '/hierarchy/arun-mishra/gulshan-kumar.jpeg' },
    { name: 'Shakil Ahmed', role: 'GTR 5- Odisha, Chhattisgarh, Madhya Pradesh- M4- RSM', location: 'Bhilai',
      photo: '/hierarchy/arun-mishra/shakil-ahmed.jpeg' },
    { name: 'Sanjay Singh', role: 'GTR 6A- Rest Of Maharashtra- M4- RSM', location: 'Pune',
      photo: '/hierarchy/arun-mishra/sanjay-singh.jpeg' },
    { name: 'Vinod Shah', role: 'GTR 6B- Mumbai & Gujarat- M2- Sr. ASM', location: 'Mumbai',
      photo: '/hierarchy/arun-mishra/vinod-shah.jpeg' },
    { name: 'B. Bhaskar', role: 'GTR 7- AP & Telangana- M4- RSM', location: 'Hyderabad',
      photo: '/hierarchy/arun-mishra/b-bhaskar.jpg' },
    { name: 'R. Patil', role: 'GTR 8- Karnataka, Goa- M4- RSM0', location: 'Bangalore',
      photo: '/hierarchy/arun-mishra/r-patil.jpeg' },
    { name: 'Vasanth D', role: 'GTR 9- Tamil Nadu & Kerala- M4- RSM', location: 'Chennai',
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
          name: 'S.P. Chaubey', role: 'Sr. Manager',
          reports: [
            {
              name: 'Sanjeev Kumar', role: 'AM',
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
                { name: 'K. Vinay', role: 'Executive' },
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
    { name: 'Kundan', role: 'Dy. Manager', location: 'HO' },
    { name: 'Vacant', role: 'O5- Sr. Executive', location: 'HO' },
    { name: 'Rakesh', role: 'O4- Executive', location: 'HO' },
    { name: 'Swamendra', role: 'M2- Dy. Manager', location: 'HO' },
    { name: 'Ashish Pal', role: 'O5- Sr. Executive', location: 'HO' },
    { name: 'Neeraj Krishnatray', role: 'M1- AM', location: 'Factory' },
  ],
  // CS & Legal (Vikas Aggarwal) — one direct report, per the org chart
  // supplied. A single manager box under the HOD, no T-bar.
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
    { name: 'Pratik Rai', role: 'O5- Sr. Executive- Export', location: 'HO' },
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
        { name: 'Aman Bhardwaj', role: 'M1- AM- ATL- HO' },
        { name: 'Abhishek Nagar', role: 'O4- Sr. Executive- HO' },
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
          name: 'Tapan Behera', role: 'M4- Sr. Manager- HO',
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
            { name: 'Satendra', role: 'M1- AM' },
            { name: 'Azad', role: 'O5- Sr. Executive' },
            { name: 'Bhumika', role: 'O4- Executive' },
            { name: 'Gaurav', role: 'O5- Sr. Executive' },
            { name: 'Sailabh', role: 'O4- Executive' },
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
            { name: 'Arif', role: 'O4- Executive' },
            { name: 'Sunil Kumar', role: 'O5- Sr. Executive' },
          ],
        },
        {
          name: 'Nischal Bhardwaj', role: 'M4- Sr. Manager- Plant Costing & Budgeting- Factory',
          // Finance & Accounts team list supplied by HR — name and
          // designation only, as given (no grade codes on that list).
          reports: [
            { name: 'Mohd. Alim', role: 'Senior Executive' },
            { name: 'Vipul Kumar', role: 'Executive' },
            { name: 'Mohd Ashraf', role: 'Senior Executive' },
            { name: 'Rahul Kumar', role: 'Assistant Manager' },
          ],
        },
      ],
    },
  ],
};

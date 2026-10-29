/* The guides Ask APIS answers from — a temporary set kept in the browser for
 * trying the assistant out. One per task, grouped by tool. `keywords` are the
 * words people are likely to type; a guide is found when a question shares
 * words with its title or keywords. */
import type { ShellView } from '../home/IntranetShell';

export interface Guide {
  title: string;
  group: string;
  tool: ShellView;
  toolLabel: string;
  steps: string[];
  keywords: string[];
  /* Opens the exact form or screen inside the tool, not just the tool. */
  action?: { label: string; intent: string };
  /* Short "good to know" notes shown under the steps. */
  tips?: string[];
}

export const GUIDES: Guide[] = [
  // ── Help Desk ──────────────────────────────────────────────────────────
  {
    group: 'Help Desk', title: 'Raise an IT ticket',
    tool: 'helpdesk', toolLabel: 'Help Desk',
    steps: [
      'Open Help Desk (menu → Help & Support).',
      'Click Support Ticket at the top and pick the IT Tickets tab.',
      'Describe the problem, choose how urgent it is, and submit.',
      'IT Support picks it up — follow its status under My Requests.',
    ],
    action: { label: 'Raise an IT ticket now', intent: 'helpdesk:it-ticket' },
    tips: [
      'Have ready: what is wrong, since when, and any error message you see.',
      'Pick Critical only when it stops your work completely — it is handled first.',
    ],
    keywords: ['it', 'ticket', 'laptop', 'computer', 'pc', 'system', 'internet', 'wifi', 'network', 'email',
      'outlook', 'printer', 'mouse', 'keyboard', 'screen', 'software', 'install', 'password', 'slow',
      'vpn', 'connect', 'connection', 'crash', 'crashing', 'hang', 'flicker', 'flickering', 'display',
      'monitor', 'webcam', 'headphone', 'teams', 'virus', 'charger',
      'broken', 'error', 'not', 'working', 'issue', 'problem', 'technical', 'support'],
  },
  {
    group: 'Help Desk', title: 'Request stationery, equipment or other admin items',
    tool: 'helpdesk', toolLabel: 'Help Desk',
    steps: [
      'Open Help Desk (menu → Help & Support).',
      'Click Support Ticket and stay on the Admin Ticket tab.',
      'Pick what you need — stationery, IT equipment, furniture, pantry, printing and so on — and submit.',
      'Admin approves and fulfils it — follow it under My Requests.',
    ],
    action: { label: 'Request an item now', intent: 'helpdesk:admin-ticket' },
    tips: [
      'Admin approves it first, then arranges it — in between it shows as Awaiting Fulfilment.',
    ],
    keywords: ['admin', 'stationery', 'stationary', 'pen', 'notebook', 'furniture', 'chair', 'desk', 'pantry',
      'printing', 'print', 'equipment', 'item', 'items', 'supplies', 'request', 'need', 'order',
      'paper', 'a4', 'printer', 'toner', 'cartridge', 'stapler', 'file', 'folder', 'marker', 'diary'],
  },
  {
    group: 'Help Desk', title: 'Book a meeting room',
    tool: 'helpdesk', toolLabel: 'Help Desk',
    steps: [
      'Open Help Desk (menu → Help & Support).',
      'The room cards show which rooms are Free, Occupied or booked soon.',
      'Click Book Room (or Book on a room card), choose the room, date and time, and confirm.',
      'Your booking appears under My Requests and on the Calendar.',
    ],
    action: { label: 'Book a room now', intent: 'helpdesk:book-room' },
    tips: [
      'Room cards show live status: Free, about to start, or Occupied.',
      'If a meeting ends early, Admin can free the room so others can book it.',
    ],
    keywords: ['room', 'rooms', 'book', 'booking', 'meeting', 'conference', 'hall', 'reserve', 'slot',
      'calendar', 'free', 'available', 'occupied', 'cabin'],
  },
  {
    group: 'Help Desk', title: 'Check the status of my requests',
    tool: 'helpdesk', toolLabel: 'Help Desk',
    steps: [
      'Open Help Desk (menu → Help & Support).',
      'Go to the My Requests tab.',
      'You’ll see your room bookings, item requests and IT tickets with their status — Pending, Approved, In Progress, Closed and so on.',
    ],
    action: { label: 'Show my requests', intent: 'helpdesk:my-requests' },
    keywords: ['status', 'requests', 'request', 'track', 'tracking', 'pending', 'approved', 'closed',
      'progress', 'check', 'update', 'ticket', 'tickets', 'booking', 'bookings', 'raised', 'yet', 'done'],
  },
  {
    group: 'Help Desk', title: 'Approve requests (managers, Admin and IT Support)',
    tool: 'helpdesk', toolLabel: 'Help Desk',
    steps: [
      'Open Help Desk (menu → Help & Support).',
      'Go to the Approvals tab — it shows what is waiting for you.',
      'Open a request and approve or reject it. Admin handles item requests; IT Support handles IT tickets.',
    ],
    action: { label: 'Open my approvals', intent: 'helpdesk:approvals' },
    tips: [
      'The Approvals tab appears only for Admin, IT Support and Super Admin.',
    ],
    keywords: ['approve', 'approval', 'approvals', 'reject', 'pending', 'manager', 'waiting', 'review',
      'team', 'tickets', 'requests'],
  },

  // ── TA/DA ──────────────────────────────────────────────────────────────
  {
    group: 'Travel (TA/DA)', title: 'Sign in to the TA/DA Portal',
    tool: 'tada', toolLabel: 'TA/DA Portal',
    steps: [
      'Open TA/DA Portal (menu → Travel).',
      'Enter your Employee ID and click Send OTP.',
      'Type the one-time password you receive to sign in.',
    ],
    keywords: ['tada', 'ta', 'da', 'travel', 'login', 'sign', 'otp', 'employee', 'id', 'portal'],
  },
  {
    group: 'Travel (TA/DA)', title: 'Get a tour sanctioned before travelling',
    tool: 'tada', toolLabel: 'TA/DA Portal',
    steps: [
      'Open TA/DA Portal (menu → Travel) and sign in.',
      'Click New Request and choose Tour Programme Sanction.',
      'Add your itinerary — each stop, dates and travel mode. Your policy limits are shown as you go.',
      'Click Submit for Approval. Your approver is notified.',
    ],
    tips: [
      'Get the tour sanctioned before you travel; claim the expenses after you are back.',
      'Your limits depend on your level and are shown on the form as you fill it in.',
    ],
    keywords: ['tour', 'sanction', 'programme', 'program', 'trip', 'before', 'travel', 'plan', 'itinerary',
      'advance', 'approval', 'outstation', 'visit'],
  },
  {
    group: 'Travel (TA/DA)', title: 'Claim travel expenses after a trip',
    tool: 'tada', toolLabel: 'TA/DA Portal',
    steps: [
      'Open TA/DA Portal (menu → Travel) and sign in.',
      'Click New Request and choose Travelling Expenses.',
      'Add your bills against each stop and expense head — the form shows what was sanctioned and what policy allows.',
      'Click Submit for Approval.',
    ],
    tips: [
      'Keep your bills — the claim is filled stop by stop against what was sanctioned.',
    ],
    keywords: ['claim', 'expense', 'expenses', 'bill', 'bills', 'reimbursement', 'reimburse', 'hotel', 'fare',
      'after', 'trip', 'travelling', 'traveling', 'allowance', 'receipt', 'train', 'flight', 'air',
      'lodging', 'da'],
  },
  {
    group: 'Travel (TA/DA)', title: 'Claim local travel',
    tool: 'tada', toolLabel: 'TA/DA Portal',
    steps: [
      'Open TA/DA Portal (menu → Travel) and sign in.',
      'Click New Request and choose Local Travel.',
      'Fill in the local trips and amounts, then Submit for Approval.',
    ],
    keywords: ['local', 'conveyance', 'cab', 'auto', 'taxi', 'city', 'travel', 'claim', 'fuel', 'within', 'fare',
      'rickshaw', 'ola', 'uber', 'metro', 'bus', 'petrol', 'bill', 'bills'],
  },

  // ── Policies ───────────────────────────────────────────────────────────
  {
    group: 'Policies & Guidelines', title: 'Read a company policy',
    tool: 'policies', toolLabel: 'Policies & Guidelines',
    steps: [
      'Open Policies & Guidelines (menu → Resources).',
      'Search, or pick a category — SOPs, manual policies, templates, work instructions or formats.',
      'Click a title to read it in place. Documents are read-only and can’t be saved or printed.',
    ],
    tips: [
      'Policies can’t be downloaded, printed or copied — read them here so you always see the current version.',
    ],
    keywords: ['policy', 'policies', 'guideline', 'guidelines', 'sop', 'sops', 'rule', 'rules', 'posh', 'leave',
      'harassment', 'hr', 'manual', 'read', 'document', 'documents', 'handbook', 'code', 'conduct'],
  },
  {
    group: 'Policies & Guidelines', title: 'Add a policy, template or format',
    tool: 'policies', toolLabel: 'Policies & Guidelines',
    steps: [
      'Open Policies & Guidelines (menu → Resources).',
      'Open the category it belongs to and click Add Document.',
      'Fill in the details and upload the file (PDF, Word, Excel or PowerPoint).',
      'It waits for a super admin to approve it before others can see it — until then only you see it, marked Awaiting approval.',
    ],
    action: { label: 'Add a document now', intent: 'policies:add' },
    tips: [
      'Word, Excel and PowerPoint files are turned into PDF when they are uploaded.',
      'Documents added by a super admin are published straight away.',
    ],
    keywords: ['add', 'upload', 'new', 'policy', 'template', 'templates', 'format', 'formats', 'document',
      'instruction', 'work', 'publish', 'sop', 'sops'],
  },

  // ── CTC Calculator ─────────────────────────────────────────────────────
  {
    group: 'CTC Calculator', title: 'Work out a candidate’s CTC break-up',
    tool: 'ctc-calculator', toolLabel: 'CTC Calculator',
    steps: [
      'Open CTC Calculator from the menu.',
      'Download the template and fill in one row per candidate — Category, Cadre, Department, Number of Children and Tax Regime are dropdowns.',
      'Upload the filled template on the same page.',
      'Click a candidate to see their salary break-up, and download the Annexure A PDF from there.',
    ],
    action: { label: 'Download the CTC template', intent: 'ctc-calculator:template' },
    tips: [
      'Number of Children is 0, 1 or 2. Tax Regime and reimbursements are only for a CTC above ₹12 lakh — greyed out otherwise.',
      'A CTC below the state minimum wage is raised to it automatically, and the break-up says so.',
    ],
    keywords: ['ctc', 'salary', 'breakup', 'break', 'calculator', 'offer', 'candidate', 'compensation',
      'annexure', 'structure', 'package', 'gross', 'basic', 'hra'],
  },
  {
    group: 'CTC Calculator', title: 'Fix a CTC template that won’t upload',
    tool: 'ctc-calculator', toolLabel: 'CTC Calculator',
    steps: [
      'Read the problems listed after the upload — each one names the row and what is wrong.',
      'Common ones: a Department or Tax Regime not picked from the dropdown, more than 2 children, a missing Grade or Cadre, or a CTC that isn’t a number.',
      'Fix those rows in the same file and upload it again. Nothing is saved until every row is right.',
    ],
    action: { label: 'Download a fresh template', intent: 'ctc-calculator:template' },
    keywords: ['error', 'errors', 'upload', 'rejected', 'failed', 'wrong', 'template', 'ctc', 'row', 'invalid',
      'fix', 'not', 'uploading'],
  },

  // ── People ─────────────────────────────────────────────────────────────
  {
    group: 'People', title: 'Find someone in the APIS Tree',
    tool: 'apis-tree', toolLabel: 'APIS Tree',
    steps: [
      'Open APIS Tree (menu → Resources).',
      'Pick a department, or click a head of department, to open their team.',
      'Each card shows the person’s name, role and location.',
    ],
    keywords: ['tree', 'org', 'organisation', 'organization', 'chart', 'hierarchy', 'reporting', 'manager',
      'team', 'who', 'head', 'hod', 'department', 'person', 'employee', 'colleague', 'structure'],
  },

  // ── APIS Wall ──────────────────────────────────────────────────────────
  {
    group: 'APIS Wall', title: 'See photos on the APIS Wall',
    tool: 'apis-wall', toolLabel: 'APIS Wall',
    steps: [
      'Open APIS Wall (menu → Resources).',
      'Filter by category — Celebrations, Team Moments, CSR, Events.',
      'Click any photo to see it full size.',
    ],
    keywords: ['wall', 'photo', 'photos', 'picture', 'pictures', 'gallery', 'event', 'events', 'celebration',
      'memories', 'csr'],
  },
  {
    group: 'APIS Wall', title: 'Put a photo on the APIS Wall',
    tool: 'apis-wall', toolLabel: 'APIS Wall',
    steps: [
      'Open APIS Wall (menu → Resources).',
      'Click Upload Image, add a title, pick a category and choose your photo (JPG, PNG, WebP or GIF, up to 8 MB).',
      'It goes to the administrator for approval before everyone can see it.',
    ],
    action: { label: 'Upload a photo now', intent: 'apis-wall:upload' },
    tips: [
      'A clear title helps — it is what people see on the photo.',
    ],
    keywords: ['upload', 'add', 'post', 'share', 'photo', 'image', 'picture', 'wall'],
  },

  // ── Performance ────────────────────────────────────────────────────────
  {
    group: 'Performance', title: 'Set goals (KRAs and KPIs)',
    tool: 'goal-setting', toolLabel: 'Goal Setting',
    steps: [
      'Open Goal Setting (menu → Performance).',
      'Sign in with your Employee ID and the code sent to your email.',
      'Fill in your goal sheet — your KRAs and KPIs — and send it to your manager.',
      'Your manager and HOD review and agree it with you.',
    ],
    tips: [
      'Goal Setting has its own sign-in: your Employee ID and a code sent to your email.',
    ],
    keywords: ['goal', 'goals', 'kra', 'kras', 'kpi', 'kpis', 'target', 'targets', 'objective', 'objectives',
      'setting', 'set'],
  },
  {
    group: 'Performance', title: 'Fill in my annual appraisal',
    tool: 'appraisal', toolLabel: 'Appraisal Hub',
    steps: [
      'Open Appraisal Hub (menu → Performance).',
      'Sign in with your Employee ID and the code sent to your email.',
      'Open the Appraisal Form, fill in your self-assessment and submit it.',
      'Your manager and then your HOD review it.',
    ],
    keywords: ['appraisal', 'annual', 'review', 'self', 'assessment', 'rating', 'form', 'yearly', 'feedback'],
  },
  {
    group: 'Performance', title: 'Track performance during the year',
    tool: 'performance', toolLabel: 'Performance Hub',
    steps: [
      'Open Performance Hub (menu → Performance).',
      'Sign in as Employee, Manager or Admin.',
      'See your goals and reviews, and their progress through the year.',
    ],
    keywords: ['performance', 'track', 'progress', 'hub', 'review', 'reviews', 'quarterly'],
  },
  {
    group: 'Performance', title: 'Nominate someone for Employee of the Month',
    tool: 'eom', toolLabel: 'EOM Hub',
    steps: [
      'Open Employee of the Month (menu → Performance).',
      'Sign in with your role — Employee, HOD, Panel or Admin.',
      'Make or review nominations for the month. The panel picks the winner.',
    ],
    keywords: ['eom', 'employee', 'month', 'nominate', 'nomination', 'award', 'recognition', 'winner', 'best'],
  },
  {
    group: 'Performance', title: 'Simulate salary revisions (HR)',
    tool: 'pms', toolLabel: 'PMS Simulator',
    steps: [
      'Open PMS Simulator (menu → Performance).',
      'Use the Live Simulator to try increment rules by grade and score.',
      'Check the Leadership View for the total cost against the payroll budget.',
    ],
    keywords: ['pms', 'simulator', 'increment', 'hike', 'revision', 'raise', 'payroll', 'cost', 'budget',
      'grade', 'merit', 'calculation', 'calculate', 'percentage', 'percent'],
  },

  // ── HR documents ───────────────────────────────────────────────────────
  {
    group: 'HR documents', title: 'Generate appraisal, warning or arrears letters (HR)',
    tool: 'offer-letters', toolLabel: 'Letters Generator',
    steps: [
      'Open Letters Generator (menu → People & Documents).',
      'Pick the letter type — Appraisal Letters, Warning Letters or Arrears Structure.',
      'Fill in or upload the details and generate the letters.',
    ],
    keywords: ['letter', 'letters', 'appraisal', 'warning', 'arrears', 'generate', 'offer', 'increment',
      'document'],
  },
  {
    group: 'HR documents', title: 'Extract data from joining forms, payroll or medical reports',
    tool: 'extractor', toolLabel: 'Data Extractor',
    steps: [
      'Open Data Extractor (menu → People & Documents).',
      'Pick the tool — Joining Forms, Medical Reports, Payroll Exports, Field Attendance, Delhi / HO Attendance or Territory Mgmt.',
      'Upload the file and download the cleaned-up result.',
    ],
    keywords: ['extract', 'extractor', 'data', 'joining', 'form', 'forms', 'payroll', 'medical', 'attendance',
      'territory', 'excel', 'convert', 'clean', 'export', 'exports'],
  },

  // ── Sales ──────────────────────────────────────────────────────────────
  {
    group: 'Sales', title: 'Look at sales numbers and forecasts',
    tool: 'salesiq', toolLabel: 'SalesIQ',
    steps: [
      'Open SalesIQ (menu → Sales).',
      'Use Overview for the headline numbers, then Geography, Channel, Products, Customers or Sales Team to drill in.',
      'Forecast shows where the numbers are heading.',
    ],
    keywords: ['sales', 'salesiq', 'forecast', 'revenue', 'zone', 'region', 'channel', 'customer', 'customers',
      'secondary', 'primary', 'numbers', 'target'],
  },

  // ── Home and links ─────────────────────────────────────────────────────
  {
    group: 'Home & links', title: 'Apply for leave or check attendance',
    tool: 'home', toolLabel: 'Home',
    steps: [
      'Leave and attendance are in Pocket HRMS, not on the intranet itself.',
      'On the Home page, open the Pocket HRMS link.',
      'Apply for leave or see your attendance there.',
    ],
    keywords: ['leave', 'leaves', 'apply', 'attendance', 'absent', 'punch', 'pocket', 'hrms',
      'payslip', 'salary', 'slip', 'credited', 'credit', 'payday', 'pay', 'paid'],
  },
  {
    group: 'Home & links', title: 'Open Bizom or ERP',
    tool: 'home', toolLabel: 'Home',
    steps: [
      'On the Home page, find the quick links.',
      'Bizom is for sales orders and market data; ERP is for enterprise operations.',
      'Click the one you need — it opens in a new tab.',
    ],
    keywords: ['bizom', 'erp', 'link', 'links', 'order', 'orders', 'operations'],
  },
  {
    group: 'Home & links', title: 'See announcements and holidays',
    tool: 'home', toolLabel: 'Home',
    steps: [
      'Go to the Home page.',
      'The Announcements card shows the latest news — click View all for the full list.',
      'Holidays and celebrations are shown on the Home page as well.',
    ],
    keywords: ['announcement', 'announcements', 'news', 'notice', 'circular', 'holiday', 'holidays',
      'birthday', 'birthdays', 'anniversary', 'celebration'],
  },
  {
    group: 'Home & links', title: 'See APIS products',
    tool: 'home', toolLabel: 'Home',
    steps: [
      'In the menu, under Resources, click Our Products.',
      'It scrolls the Home page to the product range.',
      'Click a product to see its packaging types.',
    ],
    keywords: ['product', 'products', 'honey', 'dates', 'jam', 'misk', 'saffron', 'range', 'packaging', 'brand'],
  },

  // ── Getting around ─────────────────────────────────────────────────────
  {
    group: 'Getting around', title: 'Jump to any tool quickly',
    tool: 'home', toolLabel: 'Home',
    steps: [
      'Press Ctrl + K (or click Search tools at the top of any page).',
      'Type part of the tool’s name.',
      'Press Enter to open it.',
    ],
    keywords: ['search', 'find', 'tool', 'tools', 'shortcut', 'quick', 'jump', 'open', 'navigate'],
  },
  {
    group: 'Getting around', title: 'I can’t see a tool in my menu',
    tool: 'helpdesk', toolLabel: 'Help Desk',
    steps: [
      'Each person sees only the tools they’ve been given access to.',
      'If you need one that’s missing, raise an IT ticket in Help Desk saying which tool and why.',
      'Once access is granted, the tool appears in your menu.',
    ],
    action: { label: 'Raise an IT ticket for access', intent: 'helpdesk:it-ticket' },
    keywords: ['access', 'missing', 'cant', 'cannot', 'see', 'permission', 'allowed', 'hidden',
      'tool', 'denied', 'visible'],
  },
  {
    group: 'Getting around', title: 'Sign-in code or OTP not arriving',
    tool: 'helpdesk', toolLabel: 'Help Desk',
    steps: [
      'Wait a minute and check your spam or junk folder.',
      'Make sure you typed your Employee ID correctly, then ask for a new code.',
      'Still nothing? Raise an IT ticket in Help Desk — your email on record may need updating.',
    ],
    action: { label: 'Raise an IT ticket', intent: 'helpdesk:it-ticket' },
    keywords: ['otp', 'code', 'login', 'sign', 'signin', 'email', 'not', 'received', 'arriving', 'password',
      'locked', 'verification'],
  },
  {
    group: 'Getting around', title: 'What Ask APIS can do',
    tool: 'home', toolLabel: 'Home',
    steps: [
      'Ask how to do something — raise a ticket, claim travel, read a policy — and get the steps, with a button to the right form.',
      'Type a tool or portal’s name (Pocket HRMS, Bizom, ERP) to open it straight away.',
      'Ask “who is …” or “HR head” to find people from the APIS Tree.',
      'Ask about holidays, openings, products, company facts or today’s thought.',
      'Signed in to Help Desk? Ask “my tickets” or “is a room free now”.',
    ],
    tips: [
      'Short questions work best — a few words is plenty.',
      'Say hi any time, and close the chat with the cross to start over.',
    ],
    keywords: ['assistant', 'chatbot', 'bot', 'capabilities', 'features', 'abilities', 'ask', 'apis', 'bee', 'chat'],
  },
];

export const SUGGESTIONS = [
  'My laptop is not working',
  'Book a meeting room',
  'Claim travel expenses',
  'Read the leave policy',
  'Apply for leave',
  'Make a CTC break-up',
  'Who is the HR head?',
  'Next holiday',
];

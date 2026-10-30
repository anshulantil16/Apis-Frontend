/* The skills TalentMatch recognises in a JD and in a resume, and the ways
 * people write each one. Broad on purpose - IT, FMCG sales, marketing,
 * finance, HR, supply chain and production - since APIS hires across all of
 * them. Add a line here and every comparison picks it up.
 *
 * An alias starting with "=" is matched case-sensitively, for acronyms that
 * are ordinary letters in lowercase ("CA" the qualification, not "ca" in an
 * address). */

export type SkillCategory = 'Technical' | 'Tools' | 'Sales & Marketing' | 'Finance' | 'HR' | 'Operations' | 'Soft skills';

export interface SkillDef { name: string; category: SkillCategory; aliases: string[] }

const S = (category: SkillCategory, name: string, ...aliases: string[]): SkillDef =>
  ({ name, category, aliases: [name.toLowerCase(), ...aliases] });

export const SKILLS: SkillDef[] = [
  // ── Technical ──
  S('Technical', 'Python'), S('Technical', 'Java'), S('Technical', 'JavaScript', 'js', 'es6'),
  S('Technical', 'TypeScript'), S('Technical', 'React', 'react.js', 'reactjs'), S('Technical', 'Angular', 'angularjs'),
  S('Technical', 'Vue', 'vue.js', 'vuejs'), S('Technical', 'Node.js', 'nodejs', 'node js', 'express.js', 'expressjs'),
  S('Technical', 'Django'), S('Technical', 'Flask'), S('Technical', 'FastAPI'), S('Technical', 'Spring Boot', 'spring framework'),
  S('Technical', '.NET', 'dotnet', 'asp.net', '.net core'), S('Technical', 'C#', 'c sharp'), S('Technical', 'C++', 'cpp'),
  S('Technical', 'PHP'), S('Technical', 'Laravel'), S('Technical', 'SQL', 't-sql', 'pl/sql', 'plsql'),
  S('Technical', 'MySQL'), S('Technical', 'PostgreSQL', 'postgres'), S('Technical', 'MongoDB', 'mongo'),
  S('Technical', 'Oracle DB', 'oracle database', 'oracle'), S('Technical', 'Redis'), S('Technical', 'HTML', 'html5'),
  S('Technical', 'CSS', 'css3', 'sass', 'scss'), S('Technical', 'Tailwind CSS', 'tailwind'),
  S('Technical', 'REST APIs', 'rest api', 'restful', 'api development', 'web services'),
  S('Technical', 'GraphQL'), S('Technical', 'Git', 'github', 'gitlab', 'bitbucket', 'version control'),
  S('Technical', 'Docker', 'containerization', 'docker compose'), S('Technical', 'Kubernetes', 'k8s'), S('Technical', 'AWS', 'amazon web services', 'ec2', 's3'),
  S('Technical', 'Azure', 'microsoft azure'), S('Technical', 'GCP', 'google cloud'), S('Technical', 'Linux', 'unix', 'ubuntu'),
  S('Technical', 'CI/CD', 'ci cd', 'jenkins', 'github actions', 'devops'), S('Technical', 'Machine Learning', '=ML', 'scikit-learn', 'sklearn'),
  S('Technical', 'Deep Learning', 'neural networks', 'tensorflow', 'pytorch', 'keras'), S('Technical', 'NLP', 'natural language processing'),
  S('Technical', 'Generative AI', 'genai', 'llm', 'llms', 'prompt engineering', 'chatgpt', 'openai'),
  S('Technical', 'Data Analysis', 'data analytics', 'data analyst', 'analytics', 'pandas', 'numpy'),
  S('Technical', 'Process Automation', 'rpa', 'scripting', 'workflow automation', 'automation scripts'), S('Technical', 'Software Testing', 'selenium', 'manual testing', 'automation testing', 'qa testing', 'qa engineer', 'test cases', 'unit testing', 'pytest', 'cypress'),
  S('Technical', 'Networking', '=LAN', '=WAN', 'tcp/ip', 'routing and switching', 'network switches', 'firewall'),
  S('Technical', 'IT Support', 'desktop support', 'technical support', 'hardware troubleshooting', 'helpdesk', 'help desk'),
  S('Technical', 'Active Directory', 'windows server', 'group policy'), S('Technical', 'Cybersecurity', 'information security', 'network security'),
  // ── Tools ──
  S('Tools', 'Excel', 'ms excel', 'advanced excel', 'vlookup', 'pivot tables', 'pivot table', 'spreadsheets'),
  S('Tools', 'Power BI', 'powerbi'), S('Tools', 'Tableau'), S('Tools', 'VBA', 'macros'),
  S('Tools', 'MS Office', 'microsoft office', 'ms word', 'ms-office', 'office 365', 'microsoft 365', 'o365'),
  S('Tools', 'PowerPoint', 'ms powerpoint', 'power point'), S('Tools', 'Google Workspace', 'google sheets', 'g suite', 'gsuite'),
  S('Tools', 'SAP', 'sap erp', 'sap hana', 's/4hana'), S('Tools', 'SAP FICO', 'sap fi', 'sap fi/co'), S('Tools', 'SAP MM', 'sap mm'),
  S('Tools', 'SAP SD'), S('Tools', 'ERP', 'erp systems'), S('Tools', 'Tally', 'tally erp', 'tally prime', 'tally erp 9'),
  S('Tools', 'Salesforce', 'sfdc'), S('Tools', 'Zoho', 'zoho crm', 'zoho books'), S('Tools', 'Bizom'), S('Tools', 'HRMS', 'hris', 'pocket hrms', 'darwinbox', 'successfactors'),
  S('Tools', 'Jira', 'confluence'), S('Tools', 'Figma'), S('Tools', 'Canva'), S('Tools', 'Google Analytics', 'ga4'),
  // ── Sales & marketing ──
  S('Sales & Marketing', 'FMCG', 'fast moving consumer goods', '=CPG', 'consumer goods'),
  S('Sales & Marketing', 'General Trade', '=GT', 'general trade channel', 'traditional trade'),
  S('Sales & Marketing', 'Modern Trade', '=MT', 'modern trade channel', 'key accounts modern trade', 'supermarkets', 'hypermarkets'),
  S('Sales & Marketing', 'E-commerce', 'ecommerce', 'e commerce', 'online marketplace', 'marketplaces', 'quick commerce', 'q-commerce'),
  S('Sales & Marketing', 'Distribution Management', 'distributor management', 'distribution network', 'distributors', 'distributor', 'super stockist', 'stockist'),
  S('Sales & Marketing', 'Channel Sales', 'channel management', 'channel partners'), S('Sales & Marketing', 'B2B Sales', 'b2b', 'institutional sales', 'corporate sales'),
  S('Sales & Marketing', 'Key Account Management', 'key accounts', '=KAM', 'account management'),
  S('Sales & Marketing', 'Territory Management', 'territory', 'area sales', 'beat planning', 'route planning'),
  S('Sales & Marketing', 'Secondary Sales'), S('Sales & Marketing', 'Primary Sales'), S('Sales & Marketing', 'Retail', 'retail sales', 'outlets', 'retailers'),
  S('Sales & Marketing', 'Merchandising', 'visual merchandising'), S('Sales & Marketing', 'Trade Marketing'),
  S('Sales & Marketing', 'Sales Forecasting', 'forecasting', 'sales planning'), S('Sales & Marketing', 'Target Achievement', 'sales targets', 'achieving targets', 'target achievement'),
  S('Sales & Marketing', 'Dealer Management', 'dealer network', 'dealers'), S('Sales & Marketing', 'Market Expansion', 'new market development', 'market development'),
  S('Sales & Marketing', 'Negotiation', 'negotiating', 'negotiations'), S('Sales & Marketing', 'CRM', 'customer relationship management'),
  S('Sales & Marketing', 'Lead Generation', 'prospecting'), S('Sales & Marketing', 'Business Development', 'biz dev'),
  S('Sales & Marketing', 'Export Sales', 'international sales', 'export marketing', 'international business'),
  S('Sales & Marketing', 'Digital Marketing', 'online marketing', 'performance marketing'), S('Sales & Marketing', 'SEO', 'search engine optimization'),
  S('Sales & Marketing', 'SEM', 'google ads', 'adwords', 'ppc'), S('Sales & Marketing', 'Social Media Marketing', 'social media', 'instagram marketing', 'meta ads', 'facebook ads'),
  S('Sales & Marketing', 'Brand Management', 'branding', 'brand building', 'brand strategy'), S('Sales & Marketing', 'Content Marketing', 'content writing', 'copywriting', 'content creation'),
  S('Sales & Marketing', 'Market Research', 'consumer research', 'consumer insights', 'market analysis'),
  S('Sales & Marketing', 'Campaign Management', 'campaigns', 'marketing campaigns'), S('Sales & Marketing', 'Product Marketing', 'product launch', 'product launches', 'new product launch'),
  S('Sales & Marketing', 'ATL/BTL', '=ATL', '=BTL', 'below the line', 'above the line', 'activations'), S('Sales & Marketing', 'Media Planning', 'media buying'),
  // ── Finance ──
  S('Finance', 'Accounting', 'accountancy', 'bookkeeping', 'book keeping', 'general ledger'), S('Finance', 'Financial Reporting', 'financial statements', 'p&l', 'balance sheet'),
  S('Finance', 'GST', 'goods and services tax', 'gst returns'), S('Finance', 'TDS'), S('Finance', 'Taxation', 'income tax', 'direct tax', 'indirect tax', 'tax compliance'),
  S('Finance', 'Audit', 'internal audit', 'statutory audit', 'auditing'), S('Finance', 'Budgeting', 'budget planning', 'budget preparation', 'budgetary control', 'annual budget'),
  S('Finance', 'Financial Analysis', 'financial modelling', 'financial modeling', 'variance analysis', 'fp&a'),
  S('Finance', 'Accounts Payable', 'payables'), S('Finance', 'Accounts Receivable', 'receivables', 'collections'),
  S('Finance', 'Costing', 'cost accounting', 'product costing', 'cost control'), S('Finance', 'MIS Reporting', '=MIS', 'mis reports'),
  S('Finance', 'Reconciliation', 'bank reconciliation', '=BRS', 'reconciliations'), S('Finance', 'Treasury', 'cash flow', 'fund management'),
  S('Finance', 'Compliance', 'regulatory compliance', 'statutory compliance'), S('Finance', 'IFRS', 'ind as', 'ind-as'),
  // ── HR ──
  S('HR', 'Recruitment', 'talent acquisition', 'hiring', 'sourcing candidates', 'end to end recruitment', 'recruiting'),
  S('HR', 'Payroll', 'payroll processing', 'salary processing'), S('HR', 'Employee Engagement', 'engagement activities'),
  S('HR', 'Performance Management', 'appraisals', 'appraisal process', 'kra setting', 'goal setting'), S('HR', 'Compensation & Benefits', 'c&b', 'compensation', 'benefits administration'),
  S('HR', 'Onboarding', 'induction', 'joining formalities'), S('HR', 'Training & Development', 'l&d', 'learning and development', 'training and development', 'training programs'),
  S('HR', 'Labour Laws', 'labour law', 'labor laws', 'pf', 'esic', 'statutory compliances'), S('HR', 'HR Policies', 'policy formulation'),
  S('HR', 'Employee Relations', 'industrial relations', 'grievance handling', 'disciplinary'), S('HR', 'HR Analytics', 'people analytics'),
  S('HR', 'HR Operations', 'hr ops', 'exit formalities', 'full and final', 'f&f', 'attendance management'),
  // ── Operations ──
  S('Operations', 'Supply Chain Management', 'supply chain', '=SCM'), S('Operations', 'Logistics', 'transportation', 'dispatch', 'freight'),
  S('Operations', 'Warehouse Management', 'warehousing', 'warehouse', '=WMS'), S('Operations', 'Inventory Management', 'inventory control', 'inventory', 'stock management'),
  S('Operations', 'Procurement', 'purchase', 'purchasing', 'strategic sourcing', 'material sourcing'), S('Operations', 'Vendor Management', 'vendor development', 'supplier management', 'vendors'),
  S('Operations', 'Demand Planning', 's&op'), S('Operations', 'Production Planning', '=PPC', 'production planning and control', 'production scheduling'),
  S('Operations', 'Quality Control', '=QC', 'quality inspection'), S('Operations', 'Quality Assurance', 'quality management', '=QMS'),
  S('Operations', 'Food Safety', 'food safety management', 'haccp', 'fssai', 'gmp', 'good manufacturing practices'),
  S('Operations', 'ISO Standards', 'iso 22000', 'iso 9001', 'iso 14001', 'brcgs', 'brc'), S('Operations', 'Lean Manufacturing', 'lean six sigma', 'lean principles', 'kaizen', '5s', 'tpm'),
  S('Operations', 'Manufacturing', 'production line', 'production floor', 'production supervisor', 'production manager', 'plant operations', 'shop floor', 'assembly line'), S('Operations', 'Export Documentation', 'exim', 'export import', 'customs clearance', 'letter of credit', 'incoterms'),
  S('Operations', 'Plant Maintenance', 'preventive maintenance', 'breakdown maintenance', 'machine maintenance', 'equipment maintenance'), S('Operations', 'Health & Safety', 'health and safety', 'ehs', 'hse', 'workplace safety', 'occupational safety', 'industrial safety', 'fire safety', 'safety officer', 'safety audit', 'safety audits', 'osha'),
  // ── Soft skills ──
  S('Soft skills', 'Communication', 'communication skills', 'verbal and written'), S('Soft skills', 'Leadership', 'leading teams', 'led a team'),
  S('Soft skills', 'Team Management', 'team handling', 'people management', 'managed a team', 'team of'),
  S('Soft skills', 'Problem Solving', 'problem-solving', 'troubleshooting'), S('Soft skills', 'Stakeholder Management', 'stakeholders', 'cross-functional', 'cross functional'),
  S('Soft skills', 'Project Management', 'project planning', 'project coordination'), S('Soft skills', 'Time Management', 'multitasking', 'prioritization'),
  S('Soft skills', 'Analytical Skills', 'analytical', 'analytical thinking'), S('Soft skills', 'Customer Service', 'customer support', 'client servicing', 'customer handling'),
  S('Soft skills', 'Presentation Skills', 'public speaking'),
];

export interface CertDef { name: string; aliases: string[] }
const C = (name: string, ...aliases: string[]): CertDef => ({ name, aliases: [name.toLowerCase(), ...aliases] });

export const CERTIFICATIONS: CertDef[] = [
  C('PMP', 'project management professional'), C('PRINCE2'), C('Certified Scrum Master', 'csm', 'scrum master', 'psm'),
  C('Six Sigma', 'green belt', 'black belt', 'yellow belt', 'lean six sigma'), C('ITIL'), C('CCNA'), C('CCNP'),
  C('AWS Certified', 'aws certified', 'aws solutions architect', 'aws cloud practitioner'), C('Azure Certified', 'az-900', 'az-104', 'az-204', 'microsoft certified'),
  C('Google Analytics Certified', 'google analytics certification', 'google ads certification'),
  C('Chartered Accountant', '=CA', 'ca final', 'ca inter', 'ca intermediate', 'chartered accountant'), C('CMA', 'cost and management accountant', 'icwa'),
  C('Company Secretary', '=CS', 'company secretary'), C('CFA'), C('CPA'), C('ACCA'), C('SHRM', 'shrm-cp', 'shrm-scp'), C('CIPD'),
  C('NEBOSH'), C('HACCP Certified', 'haccp certification', 'haccp certified'), C('ISO Lead Auditor', 'lead auditor', 'internal auditor iso'),
  C('Salesforce Certified', 'salesforce certified'), C('SAP Certified', 'sap certified', 'sap certification'), C('Tally Certified', 'tally certification'),
  C('Digital Marketing Certified', 'digital marketing certification', 'hubspot certification', 'meta certified'),
];

/* Education, by level - a JD asking for a graduate is met by a postgraduate. */
export interface EduDef { label: string; level: number; pattern: RegExp }
export const EDUCATION: EduDef[] = [
  { label: 'PhD', level: 5, pattern: /\bph\.?\s?d\b|\bdoctorate\b/i },
  { label: 'MBA / PGDM', level: 4, pattern: /\bm\.?b\.?a\b|\bpgdm\b|\bpgdbm\b|\bpgpm\b|post ?graduate diploma in management/i },
  { label: 'M.Tech / M.E.', level: 4, pattern: /\bm\.?\s?tech\b|\bm\.e\.|master of (technology|engineering)/i },
  { label: 'MCA', level: 4, pattern: /\bm\.?c\.?a\b|master of computer applications/i },
  { label: 'M.Com', level: 4, pattern: /\bm\.?\s?com\b|master of commerce/i },
  { label: 'M.Sc', level: 4, pattern: /\bm\.?\s?sc\b|master of science/i },
  { label: 'M.A.', level: 4, pattern: /\bm\.a\.|master of arts/i },
  { label: 'Postgraduate', level: 4, pattern: /\bpost ?graduat(e|ion)\b|\bmasters?\b(?! of business)|\bpg\b/i },
  { label: 'B.Tech / B.E.', level: 3, pattern: /\bb\.?\s?tech\b|\bb\.e\.|bachelor of (technology|engineering)|\bengineering graduate\b/i },
  { label: 'BCA', level: 3, pattern: /\bb\.?c\.?a\b|bachelor of computer applications/i },
  { label: 'B.Com', level: 3, pattern: /\bb\.?\s?com\b|bachelor of commerce/i },
  { label: 'BBA / BBM', level: 3, pattern: /\bb\.?b\.?a\b|\bbbm\b|bachelor of business/i },
  { label: 'B.Sc', level: 3, pattern: /\bb\.?\s?sc\b|bachelor of science/i },
  { label: 'B.A.', level: 3, pattern: /\bb\.a\.|bachelor of arts/i },
  { label: 'Graduate', level: 3, pattern: /\bgraduat(e|ion)\b|\bbachelor'?s?\b|\bdegree\b/i },
  { label: 'Diploma', level: 2, pattern: /\bdiploma\b|\bpolytechnic\b|\b[iI]\.?T\.?I\b/ },
  { label: '12th / HSC', level: 1, pattern: /\b12th\b|\bhsc\b|\bintermediate\b|senior secondary/i },
];

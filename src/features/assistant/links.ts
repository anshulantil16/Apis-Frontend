/* What Ask APIS can open straight away when someone types its name:
 * the intranet's own tools, the portals on the home page and APIS's social
 * pages. Built from the same lists the sidebar and home page use, so a
 * renamed tool or changed address shows up here too. */
import type { ShellView } from '../home/IntranetShell';
import { QUICK_ACCESS, QUICK_PORTALS, SOCIAL_LINKS } from '../home/IntranetHomeShared';

export interface QuickLink {
  label: string;
  sub: string;
  /* An intranet page, or an outside address opened in a new tab. */
  view?: ShellView;
  href?: string;
  /* Words that mean this link, beyond the words in its label. */
  also: string[];
}

/* Other names people use for each link. */
const ALSO: Record<string, string[]> = {
  'Data Extractor': ['joining', 'payroll', 'medical', 'attendance', 'extract'],
  'Performance Hub': ['performance'],
  'Appraisal Hub': ['appraisal', 'review'],
  'Goal Setting': ['kra', 'kpi', 'goals'],
  'EOM Hub': ['eom', 'employee', 'month', 'nomination'],
  'PMS Simulator': ['pms', 'increment', 'simulator'],
  'Letters Generator': ['letter', 'letters', 'warning', 'arrears'],
  'Help Desk': ['helpdesk', 'ticket', 'room', 'booking', 'support', 'it'],
  'SalesIQ': ['salesiq', 'sales', 'forecast'],
  'TA/DA Portal': ['tada', 'ta', 'da', 'travel', 'allowance', 'claim'],
  'Home': ['home', 'dashboard', 'announcements'],
  'APIS Tree': ['tree', 'org', 'chart', 'hierarchy'],
  'Policies & Guidelines': ['policy', 'policies', 'sop', 'guidelines'],
  'APIS Wall': ['wall', 'photos', 'gallery'],
  'CTC Calculator': ['ctc', 'salary', 'breakup'],
  'Pocket HRMS': ['hrms', 'pocket', 'leave', 'attendance', 'payslip', 'ess'],
  'Bizom': ['bizom', 'orders'],
  'ERP': ['erp'],
  'Health Insurance': ['health', 'insurance', 'hospital', 'hospitals', 'mediclaim', 'tata', 'aig', 'ewatpa'],
  'LinkedIn': ['linkedin'],
  'YouTube': ['youtube', 'videos'],
  'Instagram': ['instagram', 'insta'],
  'Facebook': ['facebook', 'fb'],
  'X': ['twitter', 'x'],
  'AmbitionBox': ['ambitionbox', 'ambition', 'reviews', 'ratings', 'rating', 'glassdoor', 'employer'],
};

/* Employee reviews of APIS - the blue mark beside the social icons in the
   home page header. */
export const AMBITIONBOX_HREF = 'https://www.ambitionbox.com/reviews/apis-india-limited-reviews';

/* `canOpen` is the sidebar's own access check - a tool someone can't open
   isn't offered to them here either. */
export function quickLinks(canOpen: (id: string) => boolean): QuickLink[] {
  const tool = (view: ShellView, label: string, sub: string): QuickLink =>
    ({ label, sub, view, also: ALSO[label] ?? [] });
  const link = (label: string, sub: string, href: string): QuickLink =>
    ({ label, sub, href, also: ALSO[label] ?? [] });
  return [
    tool('home', 'Home', 'Announcements, holidays, quick links'),
    tool('apis-tree', 'APIS Tree', 'Who is who, by department'),
    tool('policies', 'Policies & Guidelines', 'SOPs, policies, templates and formats'),
    tool('apis-wall', 'APIS Wall', 'Photos from events and celebrations'),
    ...(canOpen('ctc-calculator') ? [tool('ctc-calculator', 'CTC Calculator', 'Salary break-ups for candidates')] : []),
    ...QUICK_ACCESS.filter(t => canOpen(t.id)).map(t => tool(t.id, t.label, t.desc)),
    ...QUICK_PORTALS.filter(p => p.href).map(p => link(p.label, p.sub, p.href as string)),
    ...SOCIAL_LINKS.map(s => link(s.label, `APIS India on ${s.label === 'X' ? 'X (Twitter)' : s.label}`, s.href)),
    link('AmbitionBox', 'What employees say about working at APIS', AMBITIONBOX_HREF),
  ];
}

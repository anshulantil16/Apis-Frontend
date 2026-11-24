/* The Managing Director and the Heads of Department, as shown at the top of
 * the APIS Tree. Kept apart from APIS_TREE.tsx so other pages (the Policies
 * upload form's "Reviewed by" list) can read the same names without pulling
 * in the whole org-chart page. Edit HODs here and both follow.
 */
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

export type Level = 'md' | 'hod';

export type Person = {
  id: string;
  name: string;
  role: string;
  department?: string;
  level: Level;
  photo: string;   // imported asset URL
  tag?: string;     // small callout, e.g. "New"
};

export const managingDirector: Person = {
  id: 'md-1', name: 'Amit Anand', role: 'Managing Director', department: 'Director Office',
  level: 'md', photo: amitAnandPhoto,
};

// Order below is deliberate (not alphabetical) — it sets the row-by-row
// layout: 4 per row, [Arun, Vaibhav, Narendra, Naagesh] / [Pankaj, Ankit,
// Pradeep, Vikash] / [Manigandan, Heera Swami, Dinesh, Ershad].
export const hods: Person[] = [
  { id: 'arun-mishra', name: 'Arun Mishra', role: 'C2- NSH- HO', department: 'General Trade', level: 'hod', photo: arunMishraPhoto },
  { id: 'vaibhav-mishra', name: 'Vaibhav Mishra', role: 'M5- AGM- HO', department: 'Alternate Channels', level: 'hod', photo: vaibhavMishraPhoto },
  { id: 'narendra-gangwar', name: 'Narendra Kumar Gangwar', role: 'M4- Sr. Manager- B2B- HO', department: 'Sales', level: 'hod', photo: narendraGangwarPhoto },
  { id: 'naagesh-mishra', name: 'Naagesh Mishra', role: 'C1- GM- HO', department: 'Marketing', level: 'hod', photo: naageshMishraPhoto },
  { id: 'pankaj-tripathi', name: 'Pankaj Tripathi', role: 'C1- GM- HO', department: 'People & Culture', level: 'hod', photo: '/hierarchy/Pankaj_Tripathi1.png' },
  { id: 'ankit-nagar', name: 'Ankit Nagar', role: 'C2- AVP- HO', department: 'Finance & Accounts', level: 'hod', photo: ankitNagarPhoto },
  { id: 'pradeep-krishali', name: 'Pradeep Kumar', role: 'M5- AGM- HO', department: 'Procurement', level: 'hod', photo: pradeepKrishaliPhoto },
  { id: 'vikas-aggarwal', name: 'Vikas Aggarwal', role: 'M5- AGM- HO', department: 'Company Secretarial', level: 'hod', photo: vikashAggarwalPhoto },
  { id: 'r-manigandan', name: 'R. Manigandan', role: 'C1- GM- HO', department: 'Business Excellence', level: 'hod', photo: manigandanPhoto },
  { id: 'heera-swami', name: 'Heera Polandeappn', role: 'C1- GM- HO', department: 'Manufacturing', level: 'hod', photo: heeraSwamiPhoto },
  { id: 'dinesh-kumar', name: 'Dinesh Kumar', role: 'M3- Manager- HO', department: 'New Product Development', level: 'hod', photo: dineshPhoto },
  { id: 'ershad-alam', name: 'Ershad Alam', role: 'Hod export', department: 'Export',level: 'hod', photo: ershadAlamPhoto },
];

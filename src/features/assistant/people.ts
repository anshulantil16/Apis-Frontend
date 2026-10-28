/* "Who is …" for Ask APIS: everyone on the APIS Tree, with their role and who
 * they report to, searchable by name or by department ("HR head"). Read from
 * the same lists the APIS Tree page draws, so it is only as current as the
 * tree - edits made on the tree page itself (saved on the server) aren't seen
 * here. */
import { hods, managingDirector } from '../tree/hods';
import { SUB_TREE_ROOTS, SUB_TREES, type TeamMember } from '../tree/teams';

export interface PersonHit {
  name: string;
  role: string;
  department: string;
  /* Who they report to; empty for the Managing Director. */
  reportsTo: string;
}

function buildDirectory(): PersonHit[] {
  const out: PersonHit[] = [{
    name: managingDirector.name, role: managingDirector.role,
    department: managingDirector.department ?? '', reportsTo: '',
  }];
  const walk = (members: TeamMember[], department: string, boss: string) => {
    for (const m of members) {
      if (m.name.toLowerCase() !== 'vacant') out.push({ name: m.name, role: m.role, department, reportsTo: boss });
      if (m.reports) walk(m.reports, department, m.name);
    }
  };
  for (const h of hods) {
    const department = h.department ?? '';
    const root = SUB_TREE_ROOTS[h.id];
    if (!root?.peer) out.push({ name: h.name, role: `${h.role} (Head of Department)`, department, reportsTo: managingDirector.name });
    if (root?.peer) {
      out.push({ name: root.peer.name, role: root.peer.role, department, reportsTo: managingDirector.name });
      walk(root.peerMembers ?? [], department, root.peer.name);
    }
    if (root?.peer2) {
      out.push({ name: root.peer2.name, role: root.peer2.role, department, reportsTo: root.peer?.name ?? managingDirector.name });
      walk(root.peer2Members ?? [], department, root.peer2.name);
    }
    walk(SUB_TREES[h.id] ?? [], department, h.name);
  }
  /* A few people appear twice (the HOD card and a sub-tree card) - keep the first. */
  const seen = new Set<string>();
  return out.filter(p => {
    const key = `${p.name}|${p.role}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const DIRECTORY = buildDirectory();

/* Words people use for a department, mapped to the HOD whose department it is. */
const DEPARTMENT_WORDS: Record<string, string> = {
  hr: 'pankaj-tripathi', people: 'pankaj-tripathi', admin: 'pankaj-tripathi', it: 'pankaj-tripathi',
  finance: 'ankit-nagar', accounts: 'ankit-nagar', audit: 'ankit-nagar', cfo: 'ankit-nagar',
  legal: 'vikas-aggarwal', cs: 'vikas-aggarwal', secretarial: 'vikas-aggarwal',
  marketing: 'naagesh-mishra', brand: 'naagesh-mishra',
  procurement: 'pradeep-krishali', purchase: 'pradeep-krishali',
  export: 'ershad-alam', exports: 'ershad-alam',
  npd: 'dinesh-kumar', ppc: 'heera-swami', plant: 'heera-swami', production: 'heera-swami',
  scm: 'r-manigandan', bex: 'r-manigandan', supply: 'r-manigandan', logistics: 'r-manigandan',
  b2b: 'narendra-gangwar', gt: 'arun-mishra', trade: 'arun-mishra',
  alternate: 'vaibhav-mishra', modern: 'vaibhav-mishra', ecommerce: 'vaibhav-mishra',
};

/* Asking for a department only means "who" when the question says so -
   "IT ticket" is a guide, "who is IT head" is a person. */
const WHO_WORDS = new Set(['who', 'whom', 'head', 'hod', 'contact', 'incharge', 'manager', 'boss', 'reports', 'report']);

/* Words in a question that are never the name being asked about. */
const NOT_NAMES = new Set(['the', 'how', 'can', 'for', 'and', 'who', 'whom', 'you', 'what', 'where',
  'with', 'want', 'need', 'get', 'not', 'our', 'all', 'new', 'apis', 'head', 'hod', 'contact',
  'manager', 'team', 'plant', 'room', 'leave', 'book', 'claim', 'policy', 'travel', 'ticket']);

export function searchPeople(query: string): PersonHit[] {
  const words = query.toLowerCase().replace(/[’'.]/g, '').match(/[a-z0-9]+/g) ?? [];
  const terms = words.filter(w => w.length >= 3 && !NOT_NAMES.has(w) && !DEPARTMENT_WORDS[w]);

  /* By name: every typed word of 3+ letters has to start a word of the name,
     so "pratik" and "pratik rai" both find Pratik Rai. */
  if (terms.length) {
    const byName = DIRECTORY
      .map(p => {
        const nameWords = p.name.toLowerCase().replace(/[.]/g, ' ').match(/[a-z0-9]+/g) ?? [];
        const hits = terms.filter(t => nameWords.some(n => n.startsWith(t))).length;
        return { p, hits };
      })
      .filter(r => r.hits > 0)
      .sort((a, b) => b.hits - a.hits);
    const best = byName[0]?.hits ?? 0;
    if (best > 0) return byName.filter(r => r.hits === best).slice(0, 4).map(r => r.p);
  }

  /* By department: "who is the HR head", "finance hod". */
  if (words.some(w => WHO_WORDS.has(w))) {
    const ids = new Set(words.map(w => DEPARTMENT_WORDS[w]).filter(Boolean));
    const heads = hods.filter(h => ids.has(h.id)).map(h => h.name.toLowerCase());
    return DIRECTORY.filter(p => heads.includes(p.name.toLowerCase())).slice(0, 4);
  }
  return [];
}

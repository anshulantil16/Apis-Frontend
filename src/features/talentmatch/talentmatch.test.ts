/* What TalentMatch must get right.
 *
 * This is a shortlisting tool: a wrong answer here is a person who does not
 * get called. The cases below are the ones that were wrong, or that would
 * be quietly wrong again if the rules changed - not a sweep of the happy
 * path, which the tool manages on its own. */
import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHTS, compare, profileJob, profileResume, rank, verdict } from './analyze';
import { csvOf } from './report';
import { layoutText, type TextBit } from './readFile';

const JD = `APIS India Limited
Job Title: Area Sales Manager - General Trade
Location: Lucknow

About us: APIS India is a leading FMCG company running SAP across its plants.

Key Responsibilities:
- Drive secondary sales through the distributor network in the territory
- Appoint and manage super stockists and distributors
- Plan beats and ensure retail coverage across outlets

Required Skills:
- Strong knowledge of General Trade and Distribution Management
- Experience with Secondary Sales and Territory Management

Preferred:
- Exposure to Modern Trade is an added advantage

Qualification: Graduate in any discipline; MBA in Marketing preferred
Experience: 4-8 years of experience in FMCG sales
`;

const job = () => profileJob(JD, 'asm.pdf');

const CV = (body: string) => profileResume('1', body, 'cv.pdf');

describe('reading the job description', () => {
  it('does not let a "Preferred" block run on into the rest of the JD', () => {
    /* "Qualification: Graduate in any discipline; MBA in Marketing
       preferred" is nine words, so it was not recognised as a heading and
       every line below it stayed in the preferred section. FMCG - the
       industry the whole role is in - became a nice-to-have. */
    const j = job();
    expect(j.required).toContain('FMCG');
    expect(j.preferred).not.toContain('FMCG');
    expect(j.preferred).toEqual(['Modern Trade']);
  });

  it('does not turn the company blurb into requirements', () => {
    /* The JD says APIS runs SAP. That describes the employer, not the
       candidate, and counting it marked down everybody who has never
       touched SAP. */
    expect(job().required).not.toContain('SAP');
  });

  it('still reads a requirement that is only in the required section', () => {
    expect(job().required).toEqual(expect.arrayContaining(
      ['General Trade', 'Distribution Management', 'Secondary Sales', 'Territory Management']));
  });

  it('asks for the lowest degree it names, not the highest', () => {
    /* "Graduate; MBA preferred" is a bar of Graduate with a bonus, and
       reading it as MBA would fail every graduate who applied. */
    const j = job();
    expect(j.education.labels).toContain('Graduate');
    expect(j.education.level).toBe(3);
  });

  it('reads the range, the city and the field of study', () => {
    const j = job();
    expect([j.minExp, j.maxExp]).toEqual([4, 8]);
    expect(j.location).toBe('Lucknow');
    expect(j.fields).toContain('Marketing');
    expect(j.industries).toEqual(['FMCG & Food']);
  });
});

describe('reading a resume', () => {
  it('counts years of work without counting the degree years', () => {
    const c = CV(`Amit Kumar
Work Experience
Sales Officer, Dabur, Jan 2019 - Dec 2021
Sales Executive, ITC, Jan 2022 - Dec 2023
Education
B.Com, Delhi University, 2012 - 2015
`);
    expect(c.experience).toBe(5);
  });

  it('counts an overlap once', () => {
    const c = CV(`Work Experience
Role A, Jan 2019 - Dec 2021
Role B, Jan 2020 - Dec 2021
`);
    expect(c.experience).toBe(3);
  });

  it('takes the address over a city in the work history', () => {
    const c = CV(`Rahul Verma
Address: Kanpur, Uttar Pradesh
Work Experience
Sales Officer, Hindustan Foods, Mumbai, Jan 2019 - Present
`);
    expect([c.location, c.locationFrom]).toEqual(['Kanpur', 'address']);
  });

  it('does not read a job title as the person’s name', () => {
    expect(CV(`Senior Sales Manager
Rahul Verma
rahul.verma@gmail.com
`).name).toBe('Rahul Verma');
  });
});

describe('scoring', () => {
  const strong = `Rahul Verma
rahul.verma@gmail.com
Address: Lucknow

Professional Summary
FMCG sales professional with 6 years in general trade and distribution.

Work Experience
Sales Officer, Hindustan Foods, Jan 2021 - Dec 2026
- Managed distributors and super stockists, beat planning for 350 outlets
- Grew secondary sales by 28%

Education
MBA in Marketing, 2015
`;

  it('says why, part by part, and the parts add up to the score', () => {
    const m = compare(job(), CV(strong), DEFAULT_WEIGHTS);
    const total = m.parts.reduce((t, p) => t + p.weight, 0);
    const expected = Math.round(m.parts.reduce((t, p) => t + p.weight * p.score, 0) / total);
    expect(m.score).toBe(expected);
    expect(m.parts.map(p => p.key)).toContain('industry');
    for (const p of m.parts) expect(p.note).not.toBe('');
  });

  it('marks nobody down for something the JD never asked for', () => {
    /* No certifications in the JD, so there is no certifications part to
       lose marks on - the rest are scaled up instead. */
    const m = compare(job(), CV(strong), DEFAULT_WEIGHTS);
    expect(m.parts.find(p => p.key === 'certifications')).toBeUndefined();
  });

  it('says plainly when somebody is over the range', () => {
    const over = compare(job(), CV(`Work Experience\nRole, Jan 2014 - Dec 2026\n`), DEFAULT_WEIGHTS);
    const part = over.parts.find(p => p.key === 'experience')!;
    expect(part.note).toMatch(/above the range/);
    expect(part.score).toBeLessThan(100);
    expect(over.meetsExperience).toBe(true);
  });

  it('does not fail somebody for a missing year count, but does not pretend either', () => {
    const m = compare(job(), CV(`Rahul\nSkills\nGeneral Trade, Distribution Management\n`), DEFAULT_WEIGHTS);
    const part = m.parts.find(p => p.key === 'experience')!;
    expect(part.note).toMatch(/not found in resume/i);
    expect(m.meetsExperience).toBe(false);
  });

  it('ranks the better fit first, and the reasons say why', () => {
    const near = CV(strong);
    const far = profileResume('2', `Priya Singh
Address: Chennai
Work Experience
Software Engineer, Infosys, Jan 2021 - Dec 2026
- Built REST APIs in Python
Education
B.Tech in Computer Science
`, 'priya.pdf');
    const [first, second] = rank(job(), [far, near], DEFAULT_WEIGHTS);
    expect(first.candidate.name).toBe('Rahul Verma');
    expect(first.score).toBeGreaterThan(second.score);
    expect(second.missingRequired.length).toBeGreaterThan(0);
  });
});

describe('reading a two-column PDF', () => {
  /* A resume with contact details down one side and the work history down
     the other. Read in the order the PDF hands the pieces over, the two
     sides interleave and every line is nonsense. */
  const bit = (str: string, x: number, y: number, width = str.length * 5): TextBit => ({ str, x, y, width });

  const twoColumn: TextBit[] = [
    bit('Rahul Verma', 40, 700), bit('Work Experience', 320, 700),
    bit('Kanpur', 40, 680), bit('Sales Officer, Dabur', 320, 680),
    bit('Skills', 40, 660), bit('Jan 2019 - Present', 320, 660),
    bit('Distribution', 40, 640), bit('Managed 40 distributors', 320, 640),
    bit('Excel', 40, 620), bit('Grew sales 28%', 320, 620),
    bit('Education', 40, 600), bit('Beat planning', 320, 600),
    bit('MBA Marketing', 40, 580), bit('Retail coverage', 320, 580),
    bit('B.Com', 40, 560), bit('Reporting in Excel', 320, 560),
  ];

  it('reads one column and then the other, not across both', () => {
    const text = layoutText(twoColumn, 595);
    expect(text.split('\n')[0]).toBe('Rahul Verma');
    expect(text).not.toMatch(/Rahul Verma Work Experience/);
    expect(text.indexOf('B.Com')).toBeLessThan(text.indexOf('Work Experience'));
  });

  it('leaves an ordinary one-column page alone', () => {
    const oneColumn: TextBit[] = [
      bit('Rahul Verma', 40, 700, 300), bit('Work Experience', 40, 680, 300),
      bit('Sales Officer, Dabur, Jan 2019 - Present', 40, 660, 400),
      ...Array.from({ length: 30 }, (_, i) => bit(`Line ${i} of the work history`, 40, 640 - i * 20, 400)),
    ];
    expect(layoutText(oneColumn, 595).split('\n').slice(0, 2))
      .toEqual(['Rahul Verma', 'Work Experience']);
  });

  it('a heading that spans both columns is not mistaken for a gutter', () => {
    const spanning: TextBit[] = [
      bit('PROFESSIONAL RESUME OF RAHUL VERMA', 40, 720, 500),
      ...twoColumn,
    ];
    expect(layoutText(spanning, 595).split('\n')[0]).toBe('PROFESSIONAL RESUME OF RAHUL VERMA');
  });
});

describe('the verdict in words', () => {
  const near = `Rahul Verma
Address: Lucknow
Work Experience
Sales Officer, Hindustan Foods, Jan 2021 - Dec 2026
- Managed distributors and super stockists in general trade
- Secondary sales and territory management across 350 outlets
Education
MBA in Marketing
`;
  const far = `Priya Singh
Address: Chennai
Work Experience
Software Engineer, Infosys, Jan 2024 - Dec 2026
- Built REST APIs in Python
Education
B.Tech in Computer Science
`;

  it('names what carried the score, strongest first', () => {
    const v = verdict(compare(job(), CV(near), DEFAULT_WEIGHTS), job());
    expect(v.strengths[0]).toMatch(/right industry/);
    expect(v.headline).toMatch(/^Right industry/);
  });

  it('names the misses, and the biggest one first', () => {
    const m = compare(job(), profileResume('2', far, 'priya.pdf'), DEFAULT_WEIGHTS);
    const v = verdict(m, job());
    expect(v.concerns.join(' ')).toMatch(/missing/);
    expect(v.concerns.join(' ')).toMatch(/km away|Chennai/);
  });

  it('never praises what the JD did not ask for', () => {
    /* The phrases are built from the same parts as the score, and a part
       the JD says nothing about is not among them -- so a certification
       nobody asked for can never appear as a reason to hire. */
    const m = compare(job(), CV(near), DEFAULT_WEIGHTS);
    const keys = new Set(m.parts.map(p => p.key));
    expect(keys.has('certifications')).toBe(false);
    expect(verdict(m, job()).strengths.join(' ')).not.toMatch(/holds/);
  });

  it('says something even when the resume answers nothing', () => {
    const v = verdict(compare(job(), CV('Someone\nNo details at all.\n'), DEFAULT_WEIGHTS), job());
    expect(v.headline.length).toBeGreaterThan(0);
  });

  it('puts the same words in the CSV as on the screen', () => {
    const j = job();
    const ms = rank(j, [CV(near), profileResume('2', far, 'priya.pdf')], DEFAULT_WEIGHTS);
    const csv = csvOf(ms, j);
    expect(csv.split('\r\n')[0]).toContain('Why');
    expect(csv).toContain(verdict(ms[0], j).strengths[0]);
  });
});

/* TalentMatch's exports: the ranking as a CSV, and a full comparison report
 * as a single HTML file (opens anywhere, prints to PDF). Built here in the
 * browser from the same results the page shows. */
import { verdict, type JobProfile, type Match } from './analyze';

const h = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const yrs = (n: number | null) => (n === null ? '—' : `${n} yrs`);

export function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* The CSV is what gets mailed round and pasted into a sheet, so the
   written reason travels with the number rather than only the score. */
export function csvOf(matches: Match[], job: JobProfile): string {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ['Rank', 'Candidate', 'File', 'Score', 'Match', 'Why', 'Concerns', 'Experience', 'Education', 'Industry', 'Location',
    'Distance (km)', 'Required skills matched',
    'Required skills missing', 'Preferred skills matched', 'Email', 'Phone'];
  const rows = matches.map((m, i) => [
    i + 1, m.candidate.name, m.candidate.fileName, m.score, m.band,
    verdict(m, job).strengths.join('; '), verdict(m, job).concerns.join('; '),
    yrs(m.candidate.experience),
    m.candidate.education.labels.join(' / ') || '—', m.candidate.industries.map(x => x.name).join('; ') || '—',
    m.candidate.location ?? '—', m.distance ?? '—', m.matchedRequired.join('; '), m.missingRequired.join('; '),
    m.matchedPreferred.join('; '), m.candidate.email, m.candidate.phone,
  ]);
  return [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
}

const BAND_COLOUR: Record<Match['band'], string> = {
  'Strong match': '#059669', 'Good match': '#d97706', 'Partial match': '#ea580c', 'Low match': '#e11d48',
};

const chips = (items: string[], bg: string, fg: string) => items.length
  ? items.map(s => `<span style="display:inline-block;margin:2px;padding:2px 8px;border-radius:999px;background:${bg};color:${fg};font-size:11px">${h(s)}</span>`).join('')
  : '<span style="color:#94a3b8;font-size:11px">—</span>';

export function reportHtml(job: JobProfile, matches: Match[], jdFile: string): string {
  const date = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const rows = matches.map((m, i) => `
    <tr>
      <td style="font-weight:800">${i + 1}</td>
      <td><b>${h(m.candidate.name)}</b><br><span style="color:#64748b;font-size:11px">${h(m.candidate.fileName)}</span></td>
      <td><b style="color:${BAND_COLOUR[m.band]}">${m.score}</b><br><span style="font-size:11px;color:${BAND_COLOUR[m.band]}">${m.band}</span></td>
      <td>${m.matchedRequired.length}/${job.required.length}</td>
      <td>${yrs(m.candidate.experience)}</td>
      <td>${h(m.candidate.education.labels[0] ?? '—')}</td>
      <td>${h(m.candidate.industries[0]?.name ?? '—')}</td>
      <td>${h(m.candidate.location ?? '—')}${m.distance !== null && m.distance > 40 ? ` · ${m.distance} km` : ''}</td>
    </tr>
    <tr><td></td><td colspan="7" style="padding-top:0;border-top:none;color:#475569;font-size:11.5px">
      ${h(verdict(m, job).headline)}
    </td></tr>`).join('');
  const details = matches.map((m, i) => `
    <div style="page-break-inside:avoid;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin:12px 0">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <h3 style="margin:0">#${i + 1} ${h(m.candidate.name)}</h3>
        <b style="color:${BAND_COLOUR[m.band]};font-size:18px">${m.score}/100 · ${m.band}</b>
      </div>
      <p style="color:#64748b;font-size:12px;margin:4px 0 10px">${h(m.candidate.fileName)}${m.candidate.email ? ` · ${h(m.candidate.email)}` : ''}${m.candidate.phone ? ` · ${h(m.candidate.phone)}` : ''}</p>
      <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:8px">
        ${m.parts.map(p => `<tr><td style="padding:3px 0;width:170px">${p.label} <span style="color:#94a3b8">(${p.weight}%)</span></td>
          <td style="width:60px"><b>${p.score}%</b></td><td style="color:#64748b">${h(p.note)}</td></tr>`).join('')}
      </table>
      <p style="margin:6px 0 2px;font-size:12px"><b>Required skills found</b></p>${chips(m.matchedRequired, '#dcfce7', '#166534')}
      <p style="margin:6px 0 2px;font-size:12px"><b>Required skills missing</b></p>${chips(m.missingRequired, '#ffe4e6', '#9f1239')}
      ${job.preferred.length ? `<p style="margin:6px 0 2px;font-size:12px"><b>Preferred skills found</b></p>${chips(m.matchedPreferred, '#e0f2fe', '#075985')}` : ''}
      <p style="margin:6px 0 2px;font-size:12px"><b>Other skills</b></p>${chips(m.otherSkills.slice(0, 20), '#f1f5f9', '#334155')}
      <p style="font-size:12px;margin:8px 0 0"><b>Experience:</b> ${yrs(m.candidate.experience)} · <b>Education:</b> ${h(m.candidate.education.labels.join(', ') || '—')}
        · <b>Certifications:</b> ${h(m.candidate.certifications.join(', ') || '—')}
        <br><b>Industry:</b> ${h(m.candidate.industries.map(x => x.name).join(', ') || 'not clear')}
        · <b>Location:</b> ${h(m.candidate.location ?? 'not found')}${m.distance !== null ? ` (${m.distance} km from the job)` : ''}${m.candidate.relocate ? ' · willing to relocate' : ''}</p>
      ${m.candidate.achievements.length ? `<p style="font-size:12px;margin:8px 0 2px"><b>Achievements</b></p><ul style="font-size:12px;margin:0">${m.candidate.achievements.map(a => `<li>${h(a)}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>TalentMatch report — ${h(job.title)}</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;color:#0f172a;max-width:960px;margin:24px auto;padding:0 16px}
table.rank{width:100%;border-collapse:collapse;font-size:13px}table.rank th{text-align:left;background:#fef3c7;padding:8px}
table.rank td{padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:top}</style></head><body>
<h1 style="margin:0">TalentMatch report</h1>
<p style="color:#64748b;margin:4px 0 16px">${h(job.title)} · JD: ${h(jdFile)} · ${matches.length} candidates · ${date}</p>
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px;font-size:12px;margin-bottom:16px">
  <b>Shortlisting aid only.</b> Scores come from matching words in the JD and resumes; they don't judge quality, potential or fit,
  and they can miss skills worded differently. Read the resumes before deciding.</div>
<h2>Job requirements</h2>
<p style="font-size:12px"><b>Experience:</b> ${job.minExp === null ? 'not stated' : `${job.minExp}${job.maxExp ? `–${job.maxExp}` : '+'} yrs`}
 · <b>Education:</b> ${h(job.education.labels.join(', ') || 'not stated')} · <b>Certifications:</b> ${h(job.certifications.join(', ') || 'none')}
 · <b>Industry:</b> ${h(job.industries.join(', ') || 'any')} · <b>Location:</b> ${h(job.location ?? 'not set')}</p>
<p style="margin:6px 0 2px;font-size:12px"><b>Required skills</b></p>${chips(job.required, '#fef3c7', '#92400e')}
<p style="margin:6px 0 2px;font-size:12px"><b>Preferred skills</b></p>${chips(job.preferred, '#e0f2fe', '#075985')}
<h2>Ranking</h2>
<table class="rank"><tr><th>#</th><th>Candidate</th><th>Score</th><th>Required</th><th>Experience</th><th>Education</th><th>Industry</th><th>Location</th></tr>${rows}</table>
<h2>Candidate details</h2>${details}
</body></html>`;
}

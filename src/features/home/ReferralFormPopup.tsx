/* The referral form living inside the Vacancies popup — its own file since
   IntranetHomePage.tsx was already large before this. Submits to the real
   `referrals` Django app (POST /api/referrals/submit/); most fields are
   plain uncontrolled inputs read via FormData on submit rather than one
   useState per field — this form has ~25 fields and that would otherwise
   be a lot of boilerplate for a single "fill in and submit once" form.
   Only the few fields the UI itself needs to react to (relationship,
   recommendation, disciplinary) are real React state. */
import { useState, type FormEvent } from 'react';
import {
  Info, User, Briefcase, Award, ThumbsUp, ThumbsDown, ShieldCheck, Lock,
  Send, ThumbsUp as RecommendIcon, AlertTriangle, CheckCircle2, Loader2,
} from 'lucide-react';
import type { VacancyListing } from './IntranetHomeShared';

const _API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const REFERRALS_API = `${_API_BASE}/api/referrals`;

const DEPARTMENTS = ['Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'IT', 'Production', 'Other'];
const RELATIONSHIPS = ['Former Colleague', 'Manager / Supervisor', 'Subordinate', 'Friend', 'Other (Please specify)'];
const PERFORMANCE_LEVELS = ['Outstanding', 'Exceeds Expectations', 'Meets Expectations', 'Needs Improvement'];
const RECOMMENDATIONS = [
  { id: 'strong', label: 'Strongly Recommend', icon: ThumbsUp, cls: 'text-emerald-600 border-emerald-200 bg-emerald-50' },
  { id: 'recommend', label: 'Recommend', icon: ThumbsUp, cls: 'text-sky-600 border-sky-200 bg-sky-50' },
  { id: 'reservations', label: 'Recommend with Reservations', icon: AlertTriangle, cls: 'text-amber-600 border-amber-200 bg-amber-50' },
  { id: 'not', label: 'Do Not Recommend', icon: ThumbsDown, cls: 'text-rose-600 border-rose-200 bg-rose-50' },
] as const;

const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all';
const labelCls = 'block text-[11.5px] font-bold text-slate-600 mb-1.5';

function Field({ label, required, ...props }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-rose-500"> *</span>}</label>
      <input {...props} className={inputCls} />
    </div>
  );
}

function Select({ label, required, options, ...props }: {
  label: string; required?: boolean; options: string[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-rose-500"> *</span>}</label>
      <select {...props} className={inputCls}>
        <option value="">{`Select ${label.replace(/\s*\*?$/, '').toLowerCase()}`}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function SectionHead({ n, icon: Icon, title }: { n: number; icon: typeof User; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3.5">
      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-[11px] font-black flex items-center justify-center shrink-0">
        {n}
      </span>
      <Icon className="w-4 h-4 text-amber-600" />
      <h3 className="text-[13.5px] font-black text-slate-800">{title}</h3>
    </div>
  );
}

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-amber-100 bg-amber-50/40 p-4 ${className}`}>
      {children}
    </div>
  );
}

export function ReferralForm({ onCancel, vacancies }: { onCancel: () => void; vacancies: VacancyListing[] }) {
  /* "Title — location, state" rather than just the title: several open
     roles share a designation (six "ASE" openings alone) across different
     cities, so the title on its own wouldn't say which seat is being
     referred for. Closed/filled seats are left out — referring someone for
     a position that's no longer open isn't useful — so this list tracks
     whatever's live in the Vacancies popup, including anything just added
     or closed there. */
  const vacancyOptions = vacancies
    .filter(v => v.status === 'Active')
    .map(v => `${v.title} — ${v.location}, ${v.state}`);

  const [relationship, setRelationship] = useState('');
  const [recommendation, setRecommendation] = useState<typeof RECOMMENDATIONS[number]['id'] | ''>('');
  const [disciplinary, setDisciplinary] = useState<'yes' | 'no' | ''>('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!recommendation) { setError('Please choose a recommendation before submitting.'); return; }
    if (!disciplinary) { setError('Please answer the disciplinary-issues question before submitting.'); return; }

    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    fd.forEach((value, key) => {
      if (typeof value === 'string' && value.trim()) payload[key] = value;
    });
    payload.recommendation = recommendation;
    payload.disciplinary_issues = disciplinary === 'yes' ? 'true' : 'false';

    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${REFERRALS_API}/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Submission failed.');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the referral. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="p-10 text-center">
        <span className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </span>
        <h3 className="text-lg font-black text-slate-900 mb-1.5">Referral submitted</h3>
        <p className="text-[13px] text-slate-500 max-w-xs mx-auto">
          Thanks for helping us grow the team — P&C will review this shortly.
        </p>
        <button onClick={onCancel}
          className="mt-6 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-black transition-colors">
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-amber-800 leading-relaxed">
          Please fill in the details below to refer a candidate for a vacancy.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Section>
          <SectionHead n={1} icon={User} title="Candidate Details" />
          <div className="space-y-3">
            <Field label="Candidate Full Name" name="candidate_name" required placeholder="Enter full name" />
            <Select label="Position Applied For" name="position_applied_for" required options={vacancyOptions} />
            <Select label="Department" name="candidate_department" required options={DEPARTMENTS} />
            <Field label="Employee ID (if applicable)" name="candidate_employee_id" placeholder="Enter employee ID" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact Number" name="candidate_contact" required placeholder="Enter contact number" />
              <Field label="Email ID" name="candidate_email" required type="email" placeholder="Enter email ID" />
            </div>
          </div>
        </Section>

        <Section>
          <SectionHead n={2} icon={User} title="Referrer Details" />
          <div className="space-y-3">
            <Field label="Referrer Name" name="referrer_name" required placeholder="Enter your full name" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Employee ID" name="referrer_employee_id" required placeholder="Enter employee ID" />
              <Field label="Designation" name="referrer_designation" required placeholder="Enter designation" />
            </div>
            <Select label="Department" name="referrer_department" required options={DEPARTMENTS} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact Number" name="referrer_contact" required placeholder="Enter contact number" />
              <Field label="Official Email ID" name="referrer_email" required type="email" placeholder="Enter official email ID" />
            </div>
          </div>
        </Section>
      </div>

      <Section>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Relationship with Candidate <span className="text-rose-500">*</span></label>
            <div className="space-y-1.5">
              {RELATIONSHIPS.map(r => (
                <label key={r} className="flex items-center gap-2 text-[12.5px] text-slate-700 cursor-pointer">
                  <input type="radio" name="relationship" value={r} checked={relationship === r}
                    onChange={() => setRelationship(r)} className="accent-amber-500" />
                  {r}
                </label>
              ))}
              {relationship === 'Other (Please specify)' && (
                <input name="relationship_other" placeholder="Specify relationship (if other)" className={`${inputCls} mt-1.5`} />
              )}
            </div>
          </div>
          <Field label="Duration of Association with Candidate" name="association_duration" required placeholder="e.g., 2 years 6 months" />
        </div>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section>
          <SectionHead n={3} icon={Briefcase} title="Candidate Employment Details (If Previously Worked Together)" />
          <div className="space-y-3">
            <Field label="Previous Organization Name" name="previous_organization" placeholder="Enter organization name" />
            <Field label="Candidate's Designation" name="candidate_previous_designation" placeholder="Enter designation" />
            <div>
              <label className={labelCls}>Employment Duration</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 shrink-0">From</span>
                  <input type="date" name="employment_from" className={inputCls} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 shrink-0">To</span>
                  <input type="date" name="employment_to" className={inputCls} />
                </div>
              </div>
            </div>
            <Field label="Reporting To" name="reporting_to" placeholder="Enter reporting manager name" />
          </div>
        </Section>

        <Section>
          <SectionHead n={4} icon={Award} title="Candidate Skills & Performance" />
          <div className="space-y-3">
            <Field label="Technical Skills" name="technical_skills" placeholder="Enter key technical skills" />
            <Field label="Strengths" name="strengths" placeholder="Enter candidate strengths" />
            <Field label="Areas of Improvement" name="areas_of_improvement" placeholder="Enter areas of improvement" />
            <Select label="Overall Performance" name="overall_performance" options={PERFORMANCE_LEVELS} />
          </div>
        </Section>
      </div>

      <Section>
        <SectionHead n={5} icon={RecommendIcon} title="Overall Recommendation" />
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Do you recommend this candidate for employment? <span className="text-rose-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {RECOMMENDATIONS.map(({ id, label, icon: Icon, cls }) => (
                <button key={id} type="button" onClick={() => { setRecommendation(id); setError(''); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-bold transition-all ${
                    recommendation === id ? cls : 'text-slate-500 border-slate-200 bg-white hover:border-slate-300'}`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Any Disciplinary Issues Known? <span className="text-rose-500">*</span></label>
            <div className="flex items-center gap-4">
              {(['yes', 'no'] as const).map(v => (
                <label key={v} className="flex items-center gap-1.5 text-[12.5px] text-slate-700 cursor-pointer">
                  <input type="radio" name="disciplinary" value={v} checked={disciplinary === v}
                    onChange={() => { setDisciplinary(v); setError(''); }} className="accent-amber-500" />
                  {v === 'yes' ? 'Yes' : 'No'}
                </label>
              ))}
            </div>
          </div>
          {disciplinary === 'yes' && (
            <div>
              <label className={labelCls}>If Yes, please specify</label>
              <textarea name="disciplinary_details" rows={2} placeholder="Enter details if any" className={`${inputCls} resize-y`} />
            </div>
          )}
        </div>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section>
          <SectionHead n={6} icon={ShieldCheck} title="Declaration by Referrer" />
          <p className="text-[11.5px] text-slate-500 leading-relaxed mb-3">
            I hereby confirm that the information provided above is true to the best of my knowledge.
            I understand that any false information may lead to disciplinary action as per company policy.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Referrer Signature" name="referrer_signature" required placeholder="Type your name" />
            <Field label="Date" name="declaration_date" required type="date" />
          </div>
        </Section>

        <Section className="bg-sky-50/50 border-sky-100">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Lock className="w-3 h-3" />
            </span>
            <h3 className="text-[13.5px] font-black text-slate-800">For HR Use Only</h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
            Filled in later from the review console, not part of this submission.
          </p>
          <div className="space-y-3 opacity-60 pointer-events-none">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Verified By" placeholder="Enter name" disabled />
              <Field label="Verification Date" type="date" disabled />
            </div>
            <Field label="Remarks" placeholder="Enter remarks" disabled />
            <Select label="Status" options={['Pending', 'Shortlisted', 'Interviewing', 'Hired', 'Rejected']} disabled />
          </div>
        </Section>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-[12.5px] text-rose-700 font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2.5 pt-1">
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-bold hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={submitting}
          className="ih-sheen flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500
            hover:from-amber-600 hover:to-orange-600 text-white text-[13px] font-black shadow-sm transition-all disabled:opacity-60">
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {submitting ? 'Submitting…' : 'Submit Referral'}
        </button>
      </div>
    </form>
  );
}

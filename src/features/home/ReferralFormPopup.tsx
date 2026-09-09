/* The referral form living inside the Vacancies popup — its own file since
   IntranetHomePage.tsx was already large before this. Pure client-side
   state; nothing here is wired to a real referral pipeline yet, same
   "sample data" honesty convention every other placeholder feed in this
   app follows. */
import { useState } from 'react';
import {
  Info, User, Briefcase, Award, ThumbsUp, ThumbsDown, ShieldCheck, Lock,
  Send, ThumbsUp as RecommendIcon, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { SAMPLE_VACANCIES } from './IntranetHomeShared';

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

export function ReferralForm({ onCancel }: { onCancel: () => void }) {
  const [relationship, setRelationship] = useState('');
  const [recommendation, setRecommendation] = useState<typeof RECOMMENDATIONS[number]['id'] | ''>('');
  const [disciplinary, setDisciplinary] = useState<'yes' | 'no' | ''>('');
  const [submitted, setSubmitted] = useState(false);

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
    <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="p-6 space-y-5">
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
            <Field label="Candidate Full Name" required placeholder="Enter full name" />
            <Select label="Position Applied For" required options={SAMPLE_VACANCIES.map(v => v.title)} />
            <Select label="Department" required options={DEPARTMENTS} />
            <Field label="Employee ID (if applicable)" placeholder="Enter employee ID" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact Number" required placeholder="Enter contact number" />
              <Field label="Email ID" required type="email" placeholder="Enter email ID" />
            </div>
          </div>
        </Section>

        <Section>
          <SectionHead n={2} icon={User} title="Referrer Details" />
          <div className="space-y-3">
            <Field label="Referrer Name" required placeholder="Enter your full name" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Employee ID" required placeholder="Enter employee ID" />
              <Field label="Designation" required placeholder="Enter designation" />
            </div>
            <Select label="Department" required options={DEPARTMENTS} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact Number" required placeholder="Enter contact number" />
              <Field label="Official Email ID" required type="email" placeholder="Enter official email ID" />
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
                  <input type="radio" name="relationship" checked={relationship === r}
                    onChange={() => setRelationship(r)} className="accent-amber-500" />
                  {r}
                </label>
              ))}
              {relationship === 'Other (Please specify)' && (
                <input placeholder="Specify relationship (if other)" className={`${inputCls} mt-1.5`} />
              )}
            </div>
          </div>
          <Field label="Duration of Association with Candidate" required placeholder="e.g., 2 years 6 months" />
        </div>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section>
          <SectionHead n={3} icon={Briefcase} title="Candidate Employment Details (If Previously Worked Together)" />
          <div className="space-y-3">
            <Field label="Previous Organization Name" placeholder="Enter organization name" />
            <Field label="Candidate's Designation" placeholder="Enter designation" />
            <div>
              <label className={labelCls}>Employment Duration</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 shrink-0">From</span>
                  <input type="date" className={inputCls} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 shrink-0">To</span>
                  <input type="date" className={inputCls} />
                </div>
              </div>
            </div>
            <Field label="Reporting To" placeholder="Enter reporting manager name" />
          </div>
        </Section>

        <Section>
          <SectionHead n={4} icon={Award} title="Candidate Skills & Performance" />
          <div className="space-y-3">
            <Field label="Technical Skills" placeholder="Enter key technical skills" />
            <Field label="Strengths" placeholder="Enter candidate strengths" />
            <Field label="Areas of Improvement" placeholder="Enter areas of improvement" />
            <Select label="Overall Performance" options={PERFORMANCE_LEVELS} />
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
                <button key={id} type="button" onClick={() => setRecommendation(id)}
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
                  <input type="radio" name="disciplinary" checked={disciplinary === v}
                    onChange={() => setDisciplinary(v)} className="accent-amber-500" />
                  {v === 'yes' ? 'Yes' : 'No'}
                </label>
              ))}
            </div>
          </div>
          {disciplinary === 'yes' && (
            <div>
              <label className={labelCls}>If Yes, please specify</label>
              <textarea rows={2} placeholder="Enter details if any" className={`${inputCls} resize-y`} />
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
            <Field label="Referrer Signature" required placeholder="Type your name" />
            <Field label="Date" required type="date" />
          </div>
        </Section>

        <Section className="bg-sky-50/50 border-sky-100">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Lock className="w-3 h-3" />
            </span>
            <h3 className="text-[13.5px] font-black text-slate-800">For HR Use Only</h3>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Verified By" placeholder="Enter name" />
              <Field label="Verification Date" type="date" />
            </div>
            <Field label="Remarks" placeholder="Enter remarks" />
            <Select label="Status" options={['Pending', 'Shortlisted', 'Interviewing', 'Hired', 'Rejected']} />
          </div>
        </Section>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-1">
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-bold hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button type="submit"
          className="ih-sheen flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500
            hover:from-amber-600 hover:to-orange-600 text-white text-[13px] font-black shadow-sm transition-all">
          <Send className="w-3.5 h-3.5" />Submit Referral
        </button>
      </div>
    </form>
  );
}

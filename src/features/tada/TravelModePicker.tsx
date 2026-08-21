/* Travel-mode selection: the grade-aware picker used on the sanction form and
   on every stop of an itinerary, plus the generic "Other..." dropdown the older
   forms still use. */
import { useState } from 'react';
import {
  AlertCircle,
} from 'lucide-react';
import { TRAVEL_MODES } from './shared';

export function TravelModePicker({ value, onChange, options, reason, onReason, className }: {
  value: string; onChange: (v: string) => void; options: any;
  reason: string; onReason: (v: string) => void; className: string;
}) {
  /* Sessions predating the entitlement grouping have a cached caps object with
     no mode_options. Fall back to the plain list rather than rendering an empty
     dropdown — an unusable form is far worse than an ungrouped one. */
  const hasGroups = !!(options?.entitled?.length || options?.exception?.length);
  const entitled: any[] = hasGroups ? options.entitled || [] : TRAVEL_MODES.map(m => ({ mode: m, note: '' }));
  const exception: any[] = hasGroups ? options.exception || [] : [];
  const isException = exception.some(o => o.mode === value);
  const picked = [...entitled, ...exception].find(o => o.mode === value);

  return (
    <div className="space-y-2">
      <select className={className} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select mode…</option>
        {entitled.length > 0 && (
          <optgroup label="✓ As per your grade">
            {entitled.map(o => <option key={o.mode} value={o.mode}>{o.mode}</option>)}
          </optgroup>
        )}
        {exception.length > 0 && (
          <optgroup label="⚠ Needs approval — emergency / exception">
            {exception.map(o => <option key={o.mode} value={o.mode}>{o.mode}</option>)}
          </optgroup>
        )}
      </select>

      {picked?.note && !isException && (
        <p className="text-[11px] text-slate-500 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px text-slate-400" />{picked.note}</p>
      )}

      {isException && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
          <p className="text-xs text-amber-800 font-bold flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {picked?.note || `${value} is outside your grade's entitlement.`}
          </p>
          <div>
            <label className="text-xs font-bold text-amber-700 mb-1 block">Reason for exception <span className="text-rose-500">*</span></label>
            <textarea rows={2} className={className} value={reason} onChange={e => onReason(e.target.value)}
              placeholder="e.g. no train available at short notice, medical emergency, client meeting moved up" />
          </div>
        </div>
      )}
    </div>
  );
}

// Dropdown that always includes an "Other…" option → reveals a free-text input
export function SelectOther({ value, onChange, options, className, placeholder = 'Select…' }: {
  value: string; onChange: (v: string) => void; options: string[]; className?: string; placeholder?: string;
}) {
  const [other, setOther] = useState(!!value && !options.includes(value));
  return (
    <div className="space-y-2">
      <select className={className} value={other ? '__other__' : value}
        onChange={e => {
          if (e.target.value === '__other__') { setOther(true); onChange(''); }
          else { setOther(false); onChange(e.target.value); }
        }}>
        <option value="" disabled>{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__other__">Other…</option>
      </select>
      {other && <input className={className} placeholder="Please specify" value={value} onChange={e => onChange(e.target.value)} autoFocus />}
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

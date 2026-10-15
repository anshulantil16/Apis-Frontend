/* Calculation settings — the values P & C's compensation workbook leaves
   open (LTA by cadre, Gratuity, the D cadre's "Actual" reimbursements)
   plus the two statutory limits. Minimum wages are by state, in the
   server's rules. Everyone signed in can read these; only a super admin can
   change them. A change applies to every candidate's break-up straight away. */
import { useEffect, useState } from 'react';
import { ChevronDown, Loader2, Save, Settings2 } from 'lucide-react';
import { getCtcSettings, saveCtcSettings, type CtcSettings } from './api';

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Leave Travel Allowance (monthly)', keys: ['ltaD', 'ltaC', 'ltaM', 'ltaO', 'ltaW'] },
  { title: 'Cadre D "Actual" reimbursements (monthly)', keys: ['dFuel', 'dDriver', 'dHealth'] },
  { title: 'Other', keys: ['gratuityPercent', 'pfWageCeiling', 'esiBonusGrossLimit'] },
];

export function SettingsPanel({ onSaved }: { onSaved: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<CtcSettings | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getCtcSettings()
      .then(d => {
        if (!alive) return;
        setS(d);
        setDraft(Object.fromEntries(Object.entries(d.values).map(([k, v]) => [k, String(v)])));
      })
      .catch((e: Error) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

  const save = async () => {
    setBusy(true); setError('');
    try {
      const d = await saveCtcSettings(draft);
      setS(d);
      onSaved(d.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-amber-50/40 transition-colors">
        <span className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Settings2 className="w-4.5 h-4.5 text-amber-600" />
          </span>
          <span>
            <span className="block text-[13px] font-black text-slate-800">Calculation settings</span>
            <span className="block text-[11px] text-slate-400 font-semibold">
              LTA, Gratuity, cadre D actuals, PF &amp; ESI limits
              {s?.updatedBy ? ` · last changed by ${s.updatedBy}` : ''}
            </span>
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4">
          {!s ? (
            <p className="text-[12px] text-slate-400 py-3">{error || 'Loading…'}</p>
          ) : (
            <>
              {GROUPS.map(g => (
                <div key={g.title}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{g.title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {g.keys.map(k => (
                      <label key={k} className="block">
                        <span className="block text-[11px] font-bold text-slate-500 mb-1">{s.labels[k]}</span>
                        <input type="number" min={0} step={k === 'gratuityPercent' ? '0.01' : '1'}
                          value={draft[k] ?? ''} disabled={!s.canEdit || busy}
                          onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 font-mono
                                     focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                                     disabled:bg-slate-50 disabled:text-slate-500" />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {error && <p className="text-[12px] font-bold text-rose-600">{error}</p>}
              {s.canEdit ? (
                <button type="button" onClick={save} disabled={busy}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white
                             text-[12.5px] font-black shadow-md shadow-amber-500/30 transition-all disabled:opacity-60">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save settings
                </button>
              ) : (
                <p className="text-[11.5px] text-slate-400 font-semibold">Only a super admin can change these.</p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

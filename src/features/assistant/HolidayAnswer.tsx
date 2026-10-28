/* Ask APIS's answer to "next holiday" / "is Diwali a holiday": dates from
 * APIS's own zone-wise holiday list - the one the home page's holiday card
 * shows, maintained from Admin Console. Holidays differ by zone, so the
 * person picks theirs; the pick is remembered in this browser. */
import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useHolidayZones } from '../home/IntranetHomeShared';
import { GENERIC, HOLIDAY_WORDS, wordsOf } from './holidays';

const ZONE_KEY = 'ask_apis_holiday_zone';

function readZone() {
  try { return localStorage.getItem(ZONE_KEY) ?? ''; } catch { return ''; }
}

const fmt = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export function HolidayAnswer({ query }: { query: string }) {
  const { zones, loading } = useHolidayZones();
  const [zoneId, setZoneId] = useState(readZone);
  const zone = zones.find(z => z.id === zoneId) ?? zones[0];

  const pickZone = (id: string) => {
    setZoneId(id);
    try { localStorage.setItem(ZONE_KEY, id); } catch { /* the pick just isn't remembered */ }
  };

  const { title, rows } = useMemo(() => {
    if (!zone) return { title: '', rows: [] };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const all = zone.holidays
      .map(h => ({ ...h, when: new Date(`${h.date}T00:00:00`) }))
      .sort((a, b) => a.when.getTime() - b.when.getTime());
    /* A named festival: show it, past or coming. Otherwise the next three. */
    const named = wordsOf(query).filter(w => !GENERIC.has(w) && HOLIDAY_WORDS.includes(w));
    if (named.length) {
      const hits = all.filter(h => wordsOf(h.name).some(w => named.includes(w)));
      return { title: hits.length ? 'In your zone' : 'Not on this zone’s holiday list', rows: hits };
    }
    return { title: 'Coming up', rows: all.filter(h => h.when >= today).slice(0, 3) };
  }, [zone, query]);

  return (
    <div className="rounded-xl ring-1 ring-emerald-200 bg-emerald-50/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <p className="flex-1 text-[12.5px] font-black text-slate-800">Holidays</p>
        {zones.length > 1 && (
          <select value={zone?.id ?? ''} onChange={e => pickZone(e.target.value)} title="Your zone"
            className="max-w-[10rem] text-[11px] font-bold text-slate-600 bg-white rounded-md ring-1 ring-slate-200 px-1.5 py-1 focus:outline-none">
            {zones.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
          </select>
        )}
      </div>
      {loading ? (
        <p className="text-[11.5px] text-slate-500">Loading the holiday list…</p>
      ) : !zone ? (
        <p className="text-[11.5px] text-slate-500">The holiday list couldn’t be loaded. It’s also on the Home page.</p>
      ) : (
        <>
          <p className="text-[10.5px] font-black uppercase tracking-wide text-emerald-700">{title}</p>
          {rows.length === 0 && title === 'Coming up' && (
            <p className="text-[11.5px] text-slate-500">No more holidays on this zone’s list this year.</p>
          )}
          {rows.map(h => (
            <div key={`${h.date}-${h.name}`} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white ring-1 ring-emerald-100">
              <span className="text-[12px] font-bold text-slate-700 truncate">{h.name}</span>
              <span className="text-[11px] font-semibold text-slate-500 flex-shrink-0">{fmt(h.when)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

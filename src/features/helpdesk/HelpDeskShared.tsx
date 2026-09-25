/* Shared primitives for Help Desk — formatting, animated components, and the
   "live radar" visual language (cyan/violet accents on a light control-room
   background, radar sweeps, pulsing live-status dots). Deliberately distinct
   from SalesIQ's warm honey theme — this is a live-ops tool, not a
   data-analysis one — while staying light per the house style. */
import { useState, useEffect, useRef } from 'react';
import { Users2 } from 'lucide-react';

export const _API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const API = `${_API_BASE}/api/roompulse`;

/* Ticket attachments come back as a root-relative, signed path
   (/api/roompulse/attachments/<token>/), not an absolute URL: the server
   cannot reliably know its own public address from behind the proxy, and the
   absolute one it used to guess pointed somewhere the browser could not
   reach. The frontend does know, so it joins the two here. Absolute URLs are
   still accepted so an older response does not break. */
export const fileHref = (url: string) =>
  !url ? '' : /^https?:\/\//i.test(url) ? url : `${_API_BASE}${url}`;

export const SESSION_KEY = 'roompulse_session';
export type Role = 'employee' | 'admin' | 'it_support' | 'super_admin';
export interface Session { email: string; name: string; role: Role; token: string; ts: number; }

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.email || Date.now() - (s.ts || 0) > 12 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch { return null; }
}
export const saveSession = (s: Omit<Session, 'ts'>) =>
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, ts: Date.now() }));
export const clearSession = () => localStorage.removeItem(SESSION_KEY);

/* Every AdminPulse call goes through here.
 *
 * The server used to take the caller's word for who they were — each request
 * carried an `email` field and was believed — so the sign-in bought nothing
 * and anybody could act as anybody. Identity is now the token minted when the
 * OTP was verified, sent in a header; the server looks it up rather than
 * reading a name off the request body.
 *
 * Nothing calls fetch directly any more, so there is no call site that can
 * quietly forget to identify itself. */
export async function rpFetch(url: string, init: RequestInit = {}) {
  const token = loadSession()?.token || '';
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers['X-AdminPulse-Session'] = token;
  if (!isForm && init.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...init, headers });
  // The token has a 12-hour life and can be revoked; when it is gone the
  // honest thing is to send them back to the sign-in screen rather than
  // render a page full of empty panels.
  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.reload();
  }
  return res;
}

export const ROLE_LABEL: Record<Role, string> = {
  employee: 'Employee', admin: 'Admin', it_support: 'IT Support', super_admin: 'Super Admin',
};

/* ── animated counter ───────────────────────────────────────────────────── */
export function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) { setVal(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setVal(from + delta * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}
export function Counter({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const v = useCountUp(value || 0);
  return <>{v.toFixed(decimals)}</>;
}

/* ── staggered reveal ───────────────────────────────────────────────────── */
export function Reveal({ delay = 0, children, className = '' }:
  { delay?: number; children: any; className?: string }) {
  return (
    <div className={`rp-reveal ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── live status pill ───────────────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string; ring: string }> = {
  occupied: { label: 'Occupied', dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50', ring: 'ring-rose-200' },
  upcoming: { label: 'Starting soon', dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200' },
  free:     { label: 'Free', dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
};
const STATUS_GLOW: Record<string, string> = {
  occupied: 'rgba(244,63,94,.4)', upcoming: 'rgba(245,158,11,.4)', free: 'rgba(16,185,129,.35)',
};
export function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.free;
  return (
    <span className={`rp-pop-in inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]
                      font-black uppercase tracking-wide ring-1 ${m.bg} ${m.text} ${m.ring}`}
      style={{ '--rp-glow': STATUS_GLOW[status] || STATUS_GLOW.free } as any}>
      <span className={`relative w-1.5 h-1.5 rounded-full ${m.dot}`}>
        {status !== 'free' && <span className={`rp-ping absolute inset-0 rounded-full ${m.dot}`} />}
      </span>
      {m.label}
    </span>
  );
}
export { STATUS_META };

/* ── glass panel ────────────────────────────────────────────────────────── */
export function Panel({ title, icon: Icon, subtitle, right, children, delay = 0, className = '' }: any) {
  return (
    <Reveal delay={delay} className={className}>
      <div className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200
                      shadow-sm p-5 h-full transition-all duration-300
                      hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-500/[0.06] hover:-translate-y-0.5">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-50 to-violet-50
                              ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0
                              transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <Icon className="w-4 h-4 text-cyan-600" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {right}
        </div>
        {children}
      </div>
    </Reveal>
  );
}

export const Skel = ({ className = '' }: { className?: string }) => (
  <div className={`rp-shimmer rounded-xl bg-slate-100 ${className}`} />
);

export const Empty = ({ msg, icon: Icon = Users2 }: { msg: string; icon?: any }) => (
  <div className="flex flex-col items-center justify-center py-10 text-slate-300">
    <Icon className="w-8 h-8 mb-2" />
    <p className="text-[12px] font-semibold text-slate-400 text-center max-w-xs">{msg}</p>
  </div>
);

/* ── purpose badge ──────────────────────────────────────────────────────── */
export const PURPOSE_LABEL: Record<string, string> = {
  client_meeting: 'Client Meeting', internal_meeting: 'Internal Team Meeting',
  interview: 'Interview', training: 'Training / Workshop', board_meeting: 'Board Meeting',
  presentation: 'Presentation', vendor_meeting: 'Vendor Meeting', other: 'Other',
};
export const PURPOSE_COLOUR: Record<string, string> = {
  client_meeting: '#f59e0b', internal_meeting: '#6366f1', interview: '#ec4899',
  training: '#10b981', board_meeting: '#ef4444', presentation: '#06b6d4',
  vendor_meeting: '#8b5cf6', other: '#94a3b8',
};

/* ── resource/item request badges — everything Admin covers that isn't IT
   (that lives on the ticket side — see TICKET_CATEGORY_LABEL in
   HelpDeskTickets.tsx). Keys mirror ResourceRequest.CATEGORY_CHOICES. ── */
export const CATEGORY_LABEL: Record<string, string> = {
  stationery_office_supplies: 'Stationery & Office Supplies',
  housekeeping: 'Housekeeping',
  pantry_refreshments: 'Pantry & Refreshments',
  furniture_seating: 'Furniture & Seating',
  facility_maintenance: 'Facility Maintenance',
  electricity_lighting: 'Electricity & Lighting',
  plumbing: 'Plumbing',
  security_access: 'Security & Access',
  id_card_employee_badge: 'ID Card / Employee Badge',
  courier_dispatch: 'Courier & Dispatch',
  travel_accommodation: 'Travel & Accommodation',
  cab_transportation: 'Cab / Transportation',
  meeting_room: 'Meeting Room',
  office_equipment: 'Office Equipment',
  printing_photocopy: 'Printing & Photocopy',
  events_administration: 'Events & Administration',
  vendor_service_request: 'Vendor / Service Request',
  workplace_safety: 'Workplace Safety',
  general_administration: 'General Administration',
  other: 'Other',
};
export const CATEGORY_COLOUR: Record<string, string> = {
  stationery_office_supplies: '#0891b2',
  housekeeping: '#10b981',
  pantry_refreshments: '#f59e0b',
  furniture_seating: '#b45309',
  facility_maintenance: '#64748b',
  electricity_lighting: '#eab308',
  plumbing: '#3b82f6',
  security_access: '#e11d48',
  id_card_employee_badge: '#8b5cf6',
  courier_dispatch: '#f97316',
  travel_accommodation: '#0ea5e9',
  cab_transportation: '#6366f1',
  meeting_room: '#14b8a6',
  office_equipment: '#a855f7',
  printing_photocopy: '#d946ef',
  events_administration: '#ec4899',
  vendor_service_request: '#84cc16',
  workplace_safety: '#ef4444',
  general_administration: '#6b7280',
  other: '#94a3b8',
};
export const URGENCY_LABEL: Record<string, string> = {
  low: 'Low', normal: 'Normal', urgent: 'Urgent',
};
export const URGENCY_COLOUR: Record<string, string> = {
  low: '#64748b', normal: '#0891b2', urgent: '#e11d48',
};

/* Shared across all three request types (room bookings, item requests, IT
   tickets) — the union of every status any of them can have, so one badge
   map covers all in the unified My Requests / Approvals views. `in_progress`
   and `closed` only apply to tickets; the rest are shared. */
export const REQUEST_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
  fulfilled: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  in_progress: 'bg-sky-50 text-sky-600 ring-sky-200',
  closed: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-600 ring-rose-200',
  cancelled: 'bg-slate-50 text-slate-400 ring-slate-200',
  // Nobody turned it down -- the slot came and went unanswered. Grey like
  // cancelled rather than red like rejected, because no one decided
  // anything, and that difference is the whole point of the state.
  expired: 'bg-slate-100 text-slate-500 ring-slate-300',
};

export const fmtTime = (t: string) => t; // already HH:MM from the API
export const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

// yyyy-mm-dd for a Date, read from its LOCAL fields. toISOString() reads UTC,
// which between midnight and 5:30 AM IST is still yesterday - so "today", and
// day-shifting arithmetic built on it, would silently land a day off.
export const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* Shared page-scoped keyframes — one <style> block, imported by every screen
   in this feature so the whole app doesn't carry unused animation CSS. */

/* ── Who should handle this? ──────────────────────────────────────
   Two or three people share each desk, so every request names one of them
   and lands on that person's screen alone. The list is the roster the super
   admin keeps — /desk-staff/ is that roster reduced to a name and an
   address, which is all a dropdown needs.

   Required, so it opens unset rather than on whoever happens to be first:
   a pre-picked name is a name nobody chose. ────────────────────── */
export type DeskPerson = { email: string; name: string };

export function useDeskStaff(desk: 'it' | 'admin') {
  const [people, setPeople] = useState<DeskPerson[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    rpFetch(`${API}/desk-staff/?desk=${desk}`)
      .then(r => r.json())
      .then(d => { if (live) setPeople(d.results || []); })
      .catch(() => { if (live) setErr('Could not load the list.'); });
    return () => { live = false; };
  }, [desk]);
  return { people, err };
}

export function AssigneePicker({ desk, value, onChange, label, labelCls, inputCls }: {
  desk: 'it' | 'admin';
  value: string;
  onChange: (email: string) => void;
  label?: string;
  // Each form has its own look; the picker borrows it rather than importing
  // a third one into the middle of somebody else's layout.
  labelCls?: string;
  inputCls?: string;
}) {
  const { people, err } = useDeskStaff(desk);
  const cls = inputCls
    || "w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm "
     + "focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10";
  return (
    <div>
      <label className={labelCls || "text-[11px] font-black text-slate-500 uppercase tracking-wide"}>
        {label || (desk === 'it' ? 'Who in IT should handle this?' : 'Which admin should handle this?')}
      </label>
      <select className={cls} value={value} onChange={e => onChange(e.target.value)} required>
        <option value="" disabled>Choose a person…</option>
        {people.map(p => <option key={p.email} value={p.email}>{p.name}</option>)}
      </select>
      {err && <p className="text-[11px] text-rose-600 mt-1">{err}</p>}
      {!err && !people.length && (
        <p className="text-[11px] text-amber-600 mt-1">
          Nobody is set up on this desk yet — a Super Admin adds them under Manage.
        </p>
      )}
    </div>
  );
}

export const RP_STYLES = `
  @keyframes rpReveal { from { opacity:0; transform: translateY(14px) scale(.985);} to {opacity:1;transform:none;} }
  .rp-reveal { animation: rpReveal .55s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes rpShimmer { 0%{background-position:-500px 0} 100%{background-position:500px 0} }
  .rp-shimmer { background-image:linear-gradient(90deg,#f1f5f9 0px,#e2e8f0 100px,#f1f5f9 200px);
                background-size:600px 100%; animation:rpShimmer 1.3s linear infinite; }
  @keyframes rpPing { 75%,100%{ transform: scale(2.4); opacity:0; } }
  .rp-ping { animation: rpPing 1.6s cubic-bezier(0,0,.2,1) infinite; }
  @keyframes rpFloat { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-24px) scale(1.06)} }
  .rp-blob { animation: rpFloat 18s ease-in-out infinite; }
  @keyframes rpSweep { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  .rp-radar-sweep { animation: rpSweep 4s linear infinite; }
  @keyframes rpGrow { from { width:0 !important; } }
  .rp-grow { animation: rpGrow .8s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes rpPulseGlow{0%,100%{opacity:.5}50%{opacity:1}}
  .rp-pulse-glow{animation:rpPulseGlow 2.4s ease-in-out infinite;}

  /* button/card hover sheen — a light sweep that reads as "alive" on hover */
  .rp-sheen{position:relative;overflow:hidden;}
  @keyframes rpSheenMove{from{transform:translateX(-130%) skewX(-12deg);}to{transform:translateX(230%) skewX(-12deg);}}
  .rp-sheen::after{content:'';position:absolute;top:0;left:0;height:100%;width:35%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);
    opacity:0;pointer-events:none;}
  .rp-sheen:hover::after{opacity:1;animation:rpSheenMove .9s ease-in-out;}

  /* card lift + tilt on hover — subtle 3D feel without a JS mousemove handler */
  .rp-tilt{transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s;}
  .rp-tilt:hover{transform:translateY(-6px) rotateX(2deg) rotateY(-1.5deg) scale(1.012);}

  /* coloured glow ring — status-aware "this room is live" pulse */
  @keyframes rpGlowRing{0%,100%{box-shadow:0 0 0 0 var(--rp-glow,rgba(239,68,68,.35))}
                         50%{box-shadow:0 0 0 8px transparent}}
  .rp-glow-ring{animation:rpGlowRing 2.6s ease-in-out infinite;}

  /* animated conic-gradient border — used sparingly, on the single most
     "this is live" element per screen so it doesn't become visual noise */
  @keyframes rpBorderSpin{to{--rp-angle:360deg;}}
  @property --rp-angle{syntax:'<angle>';inherits:false;initial-value:0deg;}
  .rp-border-flow{position:relative;}
  .rp-border-flow::before{content:'';position:absolute;inset:-1.5px;border-radius:inherit;
    padding:1.5px;background:conic-gradient(from var(--rp-angle),#22d3ee,#8b5cf6,#22d3ee);
    -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
    -webkit-mask-composite:xor;mask-composite:exclude;
    animation:rpBorderSpin 3.5s linear infinite;pointer-events:none;}

  /* modal entrance — scale+fade reads as "materialising" rather than a flat fade */
  @keyframes rpPop{from{opacity:0;transform:scale(.92) translateY(10px);}to{opacity:1;transform:none;}}
  .rp-pop{animation:rpPop .35s cubic-bezier(.2,.9,.25,1.15) both;}
  @keyframes rpBackdrop{from{opacity:0;}to{opacity:1;}}
  .rp-backdrop{animation:rpBackdrop .25s ease both;}

  /* drifting mesh background for the main dashboard — cheap (CSS only),
     gives the page a sense of motion even when no data is loading */
  @keyframes rpMeshDrift{0%,100%{transform:translate(0,0) rotate(0deg);}
                          33%{transform:translate(3%,-4%) rotate(1.5deg);}
                          66%{transform:translate(-2%,3%) rotate(-1deg);}}
  .rp-mesh{animation:rpMeshDrift 26s ease-in-out infinite;}

  /* slow decorative spin for background icons/rings */
  @keyframes rpSpinSlow{to{transform:rotate(360deg);}}
  .rp-spin-slow{animation:rpSpinSlow 16s linear infinite;}

  /* number/icon pop when a KPI updates */
  @keyframes rpPopIn{0%{transform:scale(.6);opacity:0;}60%{transform:scale(1.08);opacity:1;}100%{transform:scale(1);}}
  .rp-pop-in{animation:rpPopIn .5s cubic-bezier(.2,.9,.25,1.2) both;}
`;

/* "Welcome aboard" for someone on the New Joiners list: a note in the top
 * right the first time they open the intranet, and a row in the bell's
 * notifications for the rest of that day. The server decides who gets it
 * (user.welcome: a new joiner not yet shown it; user.welcome_today: shown
 * today) and is told the moment the note appears, so the note shows once
 * only - not on the next visit, and not on another computer either.
 * IntranetShell places both, and keeps the note clear of the Quote of the
 * Day popup.
 *
 * ?welcome-preview in the address shows both to anyone, without telling the
 * server - for seeing what new joiners see. */
import { X } from 'lucide-react';
import type { PortalUser } from '../portal/session';
import { BeeMascot } from '../assistant/BeeMascot';

const firstName = (user: PortalUser) => user.name.trim().split(/\s+/)[0] || 'there';

export function WelcomeToast({ user, onClose }: { user: PortalUser; onClose: () => void }) {
  return (
    <div role="status" aria-live="polite"
      className="ih-pop-in fixed top-20 right-4 left-4 sm:left-auto z-[70] sm:w-[22rem] rounded-2xl overflow-hidden
                 bg-white shadow-2xl shadow-amber-900/20 ring-1 ring-amber-200">
      <div className="relative bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-4 pt-4 pb-3 text-white">
        <button type="button" onClick={onClose} title="Close"
          className="absolute top-2.5 right-2.5 p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <BeeMascot size={52} waving />
          <div className="min-w-0">
            <p className="text-[10.5px] font-black uppercase tracking-widest text-amber-50/90">New joiner</p>
            <p className="text-[17px] font-black leading-tight">Welcome aboard, {firstName(user)}!</p>
          </div>
        </div>
      </div>
      <div className="px-4 py-3.5 space-y-2.5">
        <p className="text-[13px] leading-relaxed text-slate-700">
          We're delighted to have you in the APIS family{user.department ? <> — <b>{user.department}</b></> : null}.
          Everything you need at work is right here: book a meeting room, raise an IT ticket, apply for leave and much more.
        </p>
        <p className="text-[12px] leading-relaxed text-slate-500">
          🐝 Not sure where something is? Ask APIS — the bee at the bottom right — can find it for you.
        </p>
        <button type="button" onClick={onClose}
          className="w-full mt-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700
                     text-white text-[13px] font-black shadow-md shadow-amber-500/30 transition-colors">
          Thank you!
        </button>
      </div>
    </div>
  );
}

/* The same welcome, as a row in the notifications dropdown. */
export function WelcomeNotification({ user }: { user: PortalUser }) {
  return (
    <div className="flex gap-3 rounded-xl bg-amber-50/70 ring-1 ring-amber-100 p-3">
      <BeeMascot size={34} still />
      <div className="min-w-0">
        <p className="text-[12.5px] font-black text-slate-800">Welcome aboard, {firstName(user)}! 🎉</p>
        <p className="text-[11.5px] leading-snug text-slate-600 mt-0.5">
          We're delighted to have you in the APIS family{user.department ? ` — ${user.department}` : ''}.
          Ask APIS, the bee at the bottom right, can help you find anything.
        </p>
        <p className="text-[10px] font-bold text-amber-600 mt-1">Today</p>
      </div>
    </div>
  );
}

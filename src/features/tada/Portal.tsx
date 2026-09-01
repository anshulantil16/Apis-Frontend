/* The signed-in shell: tab bar, and whichever screen the tab selects. */
import { useState, useEffect } from 'react';
import {
  LogOut, Plus, Clock, FileText, Shield, TrendingUp, Wallet, Plane,
} from 'lucide-react';
import { API, roleLabel, type User } from './shared';
import { Count } from './components';
import { NewRequest } from './NewRequest';
import { Detail, ReqCard } from './RequestDetail';
import { ApproverBoard } from './ApproverBoard';
import { AdminDashboard } from './AdminDashboard';
import { BookingDesk } from './BookingDesk';

/* Cursor tilt from the shared kit, which measures once per hover and batches
   its writes. The private copy that used to live here measured inside every
   mousemove, forcing a synchronous layout on each one. */
import { onTilt3dMove as onTilt, onTilt3dLeave as offTilt } from '../../ui';

export function Portal({ user, onLogout }: { user: User; onLogout: () => void }) {
  const isApprover = ['manager', 'hr', 'finance'].includes(user.role);
  // The Travel Help Desk raises tickets; it approves nothing, so it lands on
  // its booking queue rather than an approvals tab it can never act on.
  const isDesk = user.role === 'travel_desk';
  const [tab, setTab] = useState<string>(isDesk ? 'bookings' : isApprover ? 'approvals' : 'new');
  const [refresh, setRefresh] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [mine, setMine] = useState<any[]>([]);
  useEffect(() => { if (tab === 'mine') fetch(`${API}/requests/mine/?employee_id=${user.employee_id}`).then(r => r.json()).then(d => setMine(d.requests || [])); }, [tab, refresh]);

  const isAdmin = user.role === 'admin';
  const tabs = isDesk
    ? [{ k: 'bookings', l: 'Ticket Bookings', i: Plane }, { k: 'new', l: 'My New Request', i: Plus }, { k: 'mine', l: 'My Requests', i: FileText }]
    : isApprover
      ? [{ k: 'approvals', l: 'Approvals', i: Shield }, { k: 'new', l: 'My New Request', i: Plus }, { k: 'mine', l: 'My Requests', i: FileText }]
      : [{ k: 'new', l: 'New Request', i: Plus }, { k: 'mine', l: 'My Requests', i: FileText }];

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <header className="bg-white border-b border-slate-200 text-slate-800 relative z-20">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-3 relative">
          <div className="flex-1"><p className="font-black leading-tight text-slate-900">{user.name}</p><p className="text-slate-500 text-xs">{user.designation} · {isAdmin ? 'Oversight & Setup' : `Level ${user.level}`}</p></div>
          <span className="hidden sm:inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide">{roleLabel(user.role)}</span>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm">{(user.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
          <button onClick={onLogout} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 text-sm transition-colors"><LogOut className="w-4 h-4" /><span className="hidden md:inline">Logout</span></button>
        </div>
        {!isAdmin && (
          <div className="max-w-6xl mx-auto px-5 flex gap-1">
            {tabs.map(t => <button key={t.k} onClick={() => { setTab(t.k); setSel(null); }} data-active={tab === t.k} className={`ih-underline flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all ${tab === t.k ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><t.i className="w-4 h-4" />{t.l}</button>)}
          </div>
        )}
      </header>
      <main className="max-w-6xl mx-auto px-5 py-6">
        {isAdmin && <AdminDashboard user={user} />}
        {tab === 'approvals' && !isAdmin && <ApproverBoard user={user} />}
        {tab === 'bookings' && !isAdmin && <BookingDesk user={user} />}
        {tab === 'new' && !isAdmin && <NewRequest user={user} onDone={() => { setRefresh(x => x + 1); setTab('mine'); }} />}
        {tab === 'mine' && !isAdmin && (sel ? <Detail id={sel} user={user} onBack={() => setSel(null)} /> : (
          <div className="space-y-4">
            {mine.length > 0 && (() => {
              const isPending = (s: string) => ['submitted', 'manager_approved', 'hr_approved', 'finance_approved'].includes(s);
              const stats = [
                { l: 'Total', v: mine.length, i: FileText, g: 'from-sky-500 to-indigo-600' },
                { l: 'In Progress', v: mine.filter(r => isPending(r.status)).length, i: Clock, g: 'from-amber-500 to-orange-600' },
                { l: 'Paid', v: mine.filter(r => r.status === 'paid').length, i: Wallet, g: 'from-emerald-500 to-teal-600' },
                { l: 'Claimed ₹', v: mine.reduce((s, r) => s + (Number(r.total_claimed) || 0), 0), i: TrendingUp, g: 'from-violet-500 to-purple-600', money: true },
              ];
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
                  {stats.map(s => (
                    <div key={s.l} onMouseMove={onTilt} onMouseLeave={offTilt}
                      className={`ih-tilt3d ih-sweep hover-lift rounded-2xl p-4 text-white bg-gradient-to-br ${s.g} shadow-md relative overflow-hidden`}>
                      <div className="ih-drift absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
                      <s.i className="ih-float w-5 h-5 opacity-90 mb-2" />
                      <p className="text-3xl font-black leading-none"><Count n={s.v} prefix={s.money ? '₹' : ''} /></p>
                      <p className="text-xs text-white/85 font-semibold mt-1">{s.l}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="space-y-2 stagger">
              {mine.map(r => <ReqCard key={r.id} r={r} onClick={() => setSel(r.id)} />)}
            </div>
            {mine.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 animate-pop">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center mb-3 animate-float"><FileText className="w-8 h-8 text-indigo-400" /></div>
                <p className="font-bold text-slate-500">No requests yet</p>
                <p className="text-slate-400 text-sm mt-1">Head to <b>New Request</b> to raise a tour sanction or expense claim.</p>
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}

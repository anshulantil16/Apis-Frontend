import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Users, TrendingUp, AlertTriangle, CheckCircle, Clock,
  ChevronDown, ChevronUp, Search, Zap,
} from 'lucide-react';
import { getTeamProgressReport, getAllCycles } from '../../../Services/progressApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ProgressBar({ pct, thin = false }: { pct: number; thin?: boolean }) {
  const h = thin ? 'h-1.5' : 'h-2.5';
  const color = pct >= 80 ? 'from-emerald-500 to-teal-400'
    : pct >= 50 ? 'from-violet-500 to-purple-400'
    : pct >= 25 ? 'from-amber-500 to-yellow-400'
    : 'from-rose-500 to-pink-400';
  return (
    <div className={`${h} bg-white/5 rounded-full overflow-hidden`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  on_track: 'text-emerald-300',
  ahead: 'text-violet-300',
  at_risk: 'text-amber-300',
  blocked: 'text-rose-300',
  completed: 'text-sky-300',
  not_started: 'text-slate-400',
};

const STATUS_DOT: Record<string, string> = {
  on_track: 'bg-emerald-400',
  ahead: 'bg-violet-400',
  at_risk: 'bg-amber-400',
  blocked: 'bg-rose-400',
  completed: 'bg-sky-400',
  not_started: 'bg-slate-500',
};

// ─── Employee Card ────────────────────────────────────────────────────────────

function EmployeeProgressCard({ member }: { member: any }) {
  const [expanded, setExpanded] = useState(false);
  const gc = member.goal_card;

  const statusBorder = !gc ? 'border-slate-700/50'
    : gc.at_risk ? 'border-amber-500/30'
    : gc.avg_completion >= 70 ? 'border-emerald-500/20'
    : 'border-white/8';

  return (
    <div className={`bg-white/3 border rounded-2xl overflow-hidden transition-all ${statusBorder}`}>
      <div className="p-4">
        {/* Employee info */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {member.name.charAt(0)}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{member.name}</p>
              <p className="text-slate-500 text-xs">{member.designation}</p>
            </div>
          </div>
          {gc ? (
            <div className="text-right">
              <p className="text-white font-black text-lg">{gc.avg_completion}%</p>
              {gc.final_weighted_score > 0 && (
                <p className="text-amber-400 text-xs font-bold">{gc.final_weighted_score.toFixed(2)}/5</p>
              )}
            </div>
          ) : (
            <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-700/50 text-slate-400 border border-slate-600/30">
              Not Started
            </span>
          )}
        </div>

        {gc ? (
          <>
            <ProgressBar pct={gc.avg_completion} />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[gc.at_risk ? 'at_risk' : 'on_track']}`} />
                <span className={`text-xs font-semibold ${gc.at_risk ? STATUS_COLORS.at_risk : STATUS_COLORS.on_track}`}>
                  {gc.at_risk ? 'At Risk' : 'On Track'}
                </span>
              </div>
              <span className="text-slate-500 text-xs">{gc.total_goals} goals · {gc.status_display}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-slate-500 text-xs">No goals submitted for this cycle</p>
          </div>
        )}
      </div>

      {/* Expand goals */}
      {gc && gc.total_goals > 0 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full border-t border-white/5 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <span>View {gc.total_goals} goals</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="border-t border-white/5 p-4 space-y-3">
              {gc.goals.map((g: any) => (
                <div key={g.id}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-slate-300 text-xs font-semibold line-clamp-1 flex-1 mr-2">{g.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[g.status]}`} />
                      {g.final_score && (
                        <span className="text-amber-400 text-xs font-bold">{g.final_score.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <ProgressBar pct={g.completion_pct} thin />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">{g.completion_pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeamProgressView({ manager }: { manager: any }) {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState<'all' | 'at_risk' | 'not_started'>('all');

  useEffect(() => {
    getAllCycles().then(data => {
      setCycles(data);
      if (data.length > 0) setSelectedCycleId(data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCycleId) return;
    setLoading(true);
    getTeamProgressReport(manager.employee_id, selectedCycleId)
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [manager.employee_id, selectedCycleId]);

  const team: any[] = report?.team || [];
  const stats = report?.stats || {};

  const filtered = team.filter(m => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRisk === 'at_risk' && !m.goal_card?.at_risk) return false;
    if (filterRisk === 'not_started' && m.goal_card) return false;
    return true;
  });

  // Bar chart: completion by member
  const barData = team
    .filter(m => m.goal_card)
    .map(m => ({ name: m.name.split(' ')[0], completion: m.goal_card.avg_completion }))
    .sort((a, b) => b.completion - a.completion);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-white font-bold text-xl">Team Progress Dashboard</h2>
          <p className="text-slate-400 text-sm mt-0.5">{manager.name} · {manager.designation}</p>
        </div>
        <select
          value={selectedCycleId || ''}
          onChange={e => setSelectedCycleId(+e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50 transition"
        >
          {cycles.map((c: any) => <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.name}</option>)}
        </select>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Team Size', value: stats.team_size ?? '—', icon: Users, color: 'text-slate-300', bg: 'bg-white/5' },
          { label: 'Submitted', value: stats.submitted ?? '—', icon: CheckCircle, color: 'text-emerald-300', bg: 'bg-emerald-500/8' },
          { label: 'At Risk', value: stats.at_risk ?? '—', icon: AlertTriangle, color: 'text-amber-300', bg: 'bg-amber-500/8' },
          { label: 'Not Started', value: stats.not_started ?? '—', icon: Clock, color: 'text-rose-300', bg: 'bg-rose-500/8' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border border-white/8 rounded-2xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Bar chart ── */}
      {barData.length > 0 && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <h3 className="text-slate-300 text-sm font-bold mb-4">Team Completion Overview</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#1e1e3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  formatter={(v: any) => [`${v}%`, 'Completion']}
                />
                <Bar dataKey="completion" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.completion >= 80 ? '#34d399' : entry.completion >= 50 ? '#a78bfa' : entry.completion >= 25 ? '#fbbf24' : '#f87171'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition"
          />
        </div>
        {(['all', 'at_risk', 'not_started'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterRisk(f)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition border ${
              filterRisk === f
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'border-white/8 text-slate-400 hover:border-white/20'
            }`}
          >
            {f === 'all' ? 'All Members' : f === 'at_risk' ? '⚠ At Risk' : '⏸ Not Started'}
          </button>
        ))}
      </div>

      {/* ── Team grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No team members found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m: any) => (
            <EmployeeProgressCard key={m.employee_id} member={m} />
          ))}
        </div>
      )}

      {/* ── At-risk callout ── */}
      {stats.at_risk > 0 && (
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h4 className="text-amber-300 font-bold">Action Needed</h4>
          </div>
          <div className="space-y-2">
            {team.filter(m => m.goal_card?.at_risk).map(m => (
              <div key={m.employee_id} className="flex items-center gap-3 text-sm">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-slate-300 font-semibold">{m.name}</span>
                <span className="text-slate-400">—</span>
                <span className="text-amber-300">
                  {m.goal_card.goals.filter((g: any) => g.status === 'blocked' || g.status === 'at_risk').length} goal(s) at risk
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

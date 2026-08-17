import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { BarChart3, Trophy, TrendingUp, Users, Target, Globe, Building } from 'lucide-react';
import { getOrgAnalytics, getAllCycles } from '../../../Services/progressApi';
import { TOOL_STYLES } from '../../toolStyles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BAND_META: Record<string, { color: string; hex: string; label: string }> = {
  outstanding: { color: 'text-amber-300',   hex: '#f59e0b', label: '🏆 Outstanding' },
  exceeds:     { color: 'text-violet-300',  hex: '#a78bfa', label: '⭐ Exceeds' },
  meets:       { color: 'text-emerald-300', hex: '#34d399', label: '✅ Meets' },
  below:       { color: 'text-orange-300',  hex: '#fb923c', label: '⚠️ Below' },
  poor:        { color: 'text-rose-300',    hex: '#f87171', label: '❌ Needs Improv.' },
};

const CAT_COLORS = ['#a78bfa', '#34d399', '#f59e0b', '#38bdf8', '#f87171'];

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1e1e3a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#fff',
  },
};

function StatCard({ label, value, sub, icon: Icon, color, delay = 0 }: {
  label: string; value: string | number; sub?: string;
  icon: typeof BarChart3; color: string; delay?: number;
}) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-5 tp-reveal tp-tilt" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center tp-pop-in ${color}/15`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ─── Custom Donut Label ───────────────────────────────────────────────────────

function CustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrgAnalyticsView({ hrUser: _hrUser }: { hrUser: any }) {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'zones' | 'categories' | 'leaderboard'>('overview');

  useEffect(() => {
    getAllCycles().then(data => {
      setCycles(data);
      if (data.length > 0) setSelectedCycleId(data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCycleId) return;
    setLoading(true);
    getOrgAnalytics(selectedCycleId)
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCycleId]);

  const bandDist: any[] = (analytics?.band_distribution || [])
    .filter((b: any) => b.count > 0)
    .map((b: any) => ({
      ...b,
      fill: BAND_META[b.band]?.hex || '#64748b',
      displayLabel: BAND_META[b.band]?.label || b.label,
    }));

  const deptChart = analytics?.department_performance || [];
  const zoneChart = analytics?.zone_performance || [];
  const catChart = analytics?.category_analytics || [];
  const topPerformers = analytics?.top_performers || [];
  const summary = analytics?.summary || {};
  const cycle = analytics?.cycle;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <style>{TOOL_STYLES}</style>
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4 tp-reveal">
        <div>
          <h2 className="text-white font-bold text-xl">Org Analytics Dashboard</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {cycle ? `${cycle.name} · ${cycle.status_display}` : 'Select a cycle to view analytics'}
          </p>
        </div>
        <select
          value={selectedCycleId || ''}
          onChange={e => setSelectedCycleId(+e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50 transition"
        >
          {cycles.map((c: any) => (
            <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.name}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      )}

      {!loading && analytics && (
        <>
          {/* ── KPI Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Goal Cards" value={summary.total_goal_cards} icon={Target} color="text-violet-400" delay={0} />
            <StatCard label="Submitted" value={summary.submitted_goal_cards} sub={`${summary.submission_rate}% rate`} icon={TrendingUp} color="text-emerald-400" delay={70} />
            <StatCard label="Finalized" value={summary.finalized_goal_cards} icon={Users} color="text-sky-400" delay={140} />
            <StatCard label="Published" value={summary.published_reviews} icon={Trophy} color="text-amber-400" delay={210} />
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 p-1 bg-white/3 rounded-2xl flex-wrap tp-reveal">
            {([
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'departments', label: 'Departments', icon: Building },
              { id: 'zones', label: 'Zones', icon: Globe },
              { id: 'categories', label: 'Goal Categories', icon: Target },
              { id: 'leaderboard', label: 'Top Performers', icon: Trophy },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`tp-tilt flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {/* ── Overview Tab ── */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Band distribution donut */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6 tp-reveal">
                <h3 className="text-slate-300 text-sm font-bold mb-4">Performance Band Distribution</h3>
                {bandDist.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bandDist}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="count"
                          nameKey="displayLabel"
                          labelLine={false}
                          label={CustomPieLabel}
                        >
                          {bandDist.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip
                          {...TOOLTIP_STYLE}
                          formatter={(v: any, name: any) => [v, name]}
                        />
                        <Legend
                          formatter={(value) => (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
                    No finalized reviews yet
                  </div>
                )}
              </div>

              {/* Submission progress */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6 tp-reveal" style={{ animationDelay: '80ms' }}>
                <h3 className="text-slate-300 text-sm font-bold mb-4">Cycle Progress</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Goal Cards Submitted', value: summary.submitted_goal_cards, total: summary.total_goal_cards, color: 'from-violet-500 to-purple-400' },
                    { label: 'Goals Finalized', value: summary.finalized_goal_cards, total: summary.total_goal_cards, color: 'from-emerald-500 to-teal-400' },
                    { label: 'Reviews Published', value: summary.published_reviews, total: summary.total_goal_cards, color: 'from-amber-500 to-yellow-400' },
                  ].map(({ label, value, total, color }) => {
                    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-400">{label}</span>
                          <span className="text-slate-200 font-bold">{value} / {total} <span className="text-slate-500">({pct}%)</span></span>
                        </div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Band count legend */}
                {bandDist.length > 0 && (
                  <div className="mt-6 grid grid-cols-2 gap-2">
                    {bandDist.map((b: any) => (
                      <div key={b.band} className="flex items-center gap-2 bg-white/3 rounded-xl px-3 py-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: b.fill }} />
                        <span className="text-slate-300 text-xs font-semibold flex-1">{b.displayLabel}</span>
                        <span className="text-white font-black text-sm">{b.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Departments Tab ── */}
          {activeTab === 'departments' && (
            <div className="space-y-4">
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6 tp-reveal">
                <h3 className="text-slate-300 text-sm font-bold mb-4">Department Performance (Avg Score)</h3>
                {deptChart.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptChart} layout="vertical" barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis type="number" domain={[0, 5]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [Number(v).toFixed(2), 'Avg Score']} />
                        <Bar dataKey="avg_score" radius={[0, 6, 6, 0]}>
                          {deptChart.map((_: any, i: number) => (
                            <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No department data available</div>
                )}
              </div>

              {/* Department table */}
              {deptChart.length > 0 && (
                <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden tp-reveal" style={{ animationDelay: '80ms' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-slate-400 text-xs font-bold uppercase tracking-wider px-5 py-3">Department</th>
                        <th className="text-center text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3">Employees</th>
                        <th className="text-center text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3">Avg Score</th>
                        <th className="text-right text-slate-400 text-xs font-bold uppercase tracking-wider px-5 py-3">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {deptChart.map((d: any, i: number) => (
                        <tr key={d.name} className="hover:bg-white/2 transition">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                              <span className="text-white font-semibold">{d.name}</span>
                            </div>
                          </td>
                          <td className="text-center text-slate-300 px-4 py-3">{d.count}</td>
                          <td className="text-center px-4 py-3">
                            <span className="text-white font-black">{d.avg_score.toFixed(2)}</span>
                            <span className="text-slate-500">/5</span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(d.avg_score / 5) * 100}%`,
                                    background: CAT_COLORS[i % CAT_COLORS.length],
                                  }}
                                />
                              </div>
                              <span className="text-slate-400 text-xs w-8 text-right">{Math.round((d.avg_score / 5) * 100)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Zones Tab ── */}
          {activeTab === 'zones' && (
            <div className="space-y-4">
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6 tp-reveal">
                <h3 className="text-slate-300 text-sm font-bold mb-4">Zone-wise Performance</h3>
                {zoneChart.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={zoneChart} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 5]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [Number(v).toFixed(2), 'Avg Score']} />
                        <Bar dataKey="avg_score" radius={[6, 6, 0, 0]}>
                          {zoneChart.map((_: any, i: number) => (
                            <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No zone data available</div>
                )}
              </div>

              {/* Zone cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {zoneChart.map((z: any, i: number) => (
                  <div key={z.name} className="bg-white/3 border border-white/8 rounded-2xl p-4 tp-reveal tp-tilt" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                      <p className="text-white font-bold text-sm">{z.name}</p>
                    </div>
                    <p className="text-3xl font-black text-white">{z.avg_score.toFixed(2)}</p>
                    <p className="text-slate-400 text-xs mt-1">{z.count} employees</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Categories Tab ── */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Avg completion by category */}
                <div className="bg-white/3 border border-white/8 rounded-2xl p-6 tp-reveal">
                  <h3 className="text-slate-300 text-sm font-bold mb-4">Avg Completion % by Category</h3>
                  {catChart.length > 0 ? (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={catChart} barSize={28}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                          <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, 'Avg Completion']} />
                          <Bar dataKey="avg_completion" radius={[6, 6, 0, 0]}>
                            {catChart.map((_: any, i: number) => (
                              <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-slate-500 text-sm">No data</div>
                  )}
                </div>

                {/* Avg score by category */}
                <div className="bg-white/3 border border-white/8 rounded-2xl p-6 tp-reveal" style={{ animationDelay: '80ms' }}>
                  <h3 className="text-slate-300 text-sm font-bold mb-4">Avg Score by Category</h3>
                  {catChart.length > 0 ? (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={catChart} barSize={28}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 5]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [Number(v).toFixed(2), 'Avg Score']} />
                          <Bar dataKey="avg_score" radius={[6, 6, 0, 0]}>
                            {catChart.map((_: any, i: number) => (
                              <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-slate-500 text-sm">No rated goals yet</div>
                  )}
                </div>
              </div>

              {/* Category detail cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {catChart.map((c: any, i: number) => (
                  <div key={c.category} className="bg-white/3 border border-white/8 rounded-2xl p-4 text-center tp-reveal tp-tilt" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                    <p className="text-lg mb-1">{c.label.split(' ')[0]}</p>
                    <p className="text-white text-xs font-bold mb-3 line-clamp-1">
                      {c.label.split(' ').slice(1).join(' ')}
                    </p>
                    <p className="text-2xl font-black text-white">{c.avg_completion}%</p>
                    <p className="text-slate-500 text-xs mt-0.5">completion</p>
                    <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${c.avg_completion}%`, background: CAT_COLORS[i % CAT_COLORS.length] }}
                      />
                    </div>
                    <p className="text-slate-400 text-xs mt-2">{c.count} goals</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Leaderboard Tab ── */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              {topPerformers.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-bold text-white mb-1">No published results yet</p>
                  <p className="text-sm">HR must finalize and publish reviews to populate the leaderboard.</p>
                </div>
              ) : (
                <>
                  {/* Top 3 podium */}
                  {topPerformers.length >= 3 && (
                    <div className="flex items-end justify-center gap-4 py-6">
                      {[topPerformers[1], topPerformers[0], topPerformers[2]].map((p: any, i: number) => {
                        const heights = ['h-24', 'h-32', 'h-20'];
                        const colors = ['bg-slate-500/20', 'bg-amber-500/20', 'bg-amber-700/20'];
                        const rankColors = ['text-slate-300', 'text-amber-300', 'text-orange-300'];
                        const ranks = [2, 1, 3];
                        return (
                          <div key={p.employee_id} className="flex flex-col items-center gap-2 tp-reveal" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-sm tp-pop-in">
                              {p.name.charAt(0)}
                            </div>
                            <p className="text-white text-xs font-bold text-center w-20 line-clamp-1">{p.name.split(' ')[0]}</p>
                            <p className="text-slate-400 text-[10px] text-center">{p.score?.toFixed(2)}</p>
                            <div className={`${heights[i]} w-20 ${colors[i]} border border-white/10 rounded-t-xl flex items-center justify-center`}>
                              <p className={`text-2xl font-black ${rankColors[i]}`}>#{ranks[i]}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Full list */}
                  <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden tp-reveal">
                    <div className="px-6 py-3 border-b border-white/5 grid grid-cols-12 text-xs text-slate-400 font-bold uppercase tracking-wider">
                      <span className="col-span-1">#</span>
                      <span className="col-span-4">Employee</span>
                      <span className="col-span-3">Department</span>
                      <span className="col-span-2">Zone</span>
                      <span className="col-span-2 text-right">Score / Band</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {topPerformers.map((p: any, pi: number) => {
                        const band = BAND_META[p.band];
                        return (
                          <div
                            key={p.employee_id}
                            className={`px-6 py-3.5 grid grid-cols-12 items-center hover:bg-white/2 transition tp-reveal ${
                              p.rank === 1 ? 'bg-amber-500/5' : ''
                            }`}
                            style={{ animationDelay: `${Math.min(pi, 10) * 40}ms` }}
                          >
                            <span className={`col-span-1 font-black text-lg ${
                              p.rank === 1 ? 'text-amber-400' : p.rank === 2 ? 'text-slate-300' : p.rank === 3 ? 'text-orange-400' : 'text-slate-500'
                            }`}>
                              {p.rank === 1 ? '🏆' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : p.rank}
                            </span>
                            <div className="col-span-4">
                              <p className="text-white font-bold text-sm">{p.name}</p>
                              <p className="text-slate-500 text-xs">{p.designation}</p>
                            </div>
                            <span className="col-span-3 text-slate-400 text-sm">{p.department || '—'}</span>
                            <span className="col-span-2 text-slate-400 text-sm">{p.zone || '—'}</span>
                            <div className="col-span-2 text-right">
                              <p className="text-white font-black">{p.score?.toFixed(2)}</p>
                              {band && <p className={`text-xs ${band.color} font-bold`}>{band.label}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {!loading && !analytics && selectedCycleId && (
        <div className="text-center py-16 text-slate-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No data available for this cycle yet.</p>
        </div>
      )}
    </div>
  );
}

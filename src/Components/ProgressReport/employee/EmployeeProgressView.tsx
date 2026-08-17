import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  Target, TrendingUp, Plus, CheckCircle, AlertTriangle,
  Clock, Zap, Trophy, ChevronDown, ChevronUp, Send, X,
} from 'lucide-react';
import { getEmployeeProgressReport, addGoalProgress } from '../../../Services/progressApi';
import { TOOL_STYLES } from '../../toolStyles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressUpdate {
  id: number;
  completion_pct: number;
  status: string;
  status_display: string;
  notes: string;
  highlights: string;
  blockers: string;
  update_date: string;
}

interface GoalData {
  id: number;
  title: string;
  category: string;
  category_display: string;
  weightage: number;
  kpi_metric: string;
  target_value: string;
  self_completion_pct: number;
  self_rating: number | null;
  manager_rating: number | null;
  final_score: number | null;
  current_status: string;
  current_status_display: string;
  progress_updates: ProgressUpdate[];
}

interface CycleData {
  cycle_id: number;
  cycle_name: string;
  quarter: number;
  fiscal_year: string;
  cycle_status: string;
  goal_card_id: number;
  goal_card_status: string;
  goal_card_status_display: string;
  final_weighted_score: number;
  goals: GoalData[];
  review: {
    performance_band: string;
    performance_band_display: string;
    final_weighted_score: number | null;
    status: string;
    manager_overall_rating: number | null;
    hr_final_rating: number | null;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  on_track:   { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-300', icon: CheckCircle },
  ahead:      { bg: 'bg-violet-500/15 border-violet-500/30',   text: 'text-violet-300',  icon: Zap },
  at_risk:    { bg: 'bg-amber-500/15 border-amber-500/30',     text: 'text-amber-300',   icon: AlertTriangle },
  blocked:    { bg: 'bg-rose-500/15 border-rose-500/30',       text: 'text-rose-300',    icon: X },
  completed:  { bg: 'bg-sky-500/15 border-sky-500/30',         text: 'text-sky-300',     icon: Trophy },
  not_started:{ bg: 'bg-slate-700/50 border-slate-600/30',     text: 'text-slate-400',   icon: Clock },
};

const BAND_GRADIENT: Record<string, string> = {
  outstanding: 'from-amber-400 to-yellow-300',
  exceeds:     'from-violet-400 to-purple-300',
  meets:       'from-emerald-400 to-teal-300',
  below:       'from-orange-400 to-amber-300',
  poor:        'from-rose-400 to-red-300',
};

function StatusPill({ status, label }: { status: string; label: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.not_started;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border tp-pop-in ${s.bg} ${s.text}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function ProgressBar({ pct, color = 'violet' }: { pct: number; color?: string }) {
  const colorMap: Record<string, string> = {
    violet: 'from-violet-500 to-purple-400',
    emerald: 'from-emerald-500 to-teal-400',
    amber: 'from-amber-500 to-yellow-400',
    rose: 'from-rose-500 to-pink-400',
    sky: 'from-sky-500 to-blue-400',
  };
  return (
    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${colorMap[color] || colorMap.violet} transition-all duration-700`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function ScoreGauge({ score, max = 5 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const band = score >= 4.5 ? 'outstanding' : score >= 3.75 ? 'exceeds' : score >= 2.75 ? 'meets' : score >= 1.75 ? 'below' : 'poor';
  const strokeColor = { outstanding: '#f59e0b', exceeds: '#a78bfa', meets: '#34d399', below: '#fb923c', poor: '#f87171' }[band];

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={strokeColor} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-black text-white">{score.toFixed(1)}</p>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">/ {max}</p>
      </div>
    </div>
  );
}

// ─── Add Progress Modal ───────────────────────────────────────────────────────

function AddProgressModal({
  goal,
  onClose,
  onSaved,
}: { goal: GoalData; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    completion_pct: goal.self_completion_pct || 0,
    status: goal.current_status === 'not_started' ? 'on_track' : goal.current_status,
    notes: '',
    highlights: '',
    blockers: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await addGoalProgress(goal.id, form);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#16162a] border border-white/10 rounded-3xl p-7 w-full max-w-lg shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-white font-bold text-lg">Log Progress Update</h3>
            <p className="text-slate-400 text-sm mt-0.5 line-clamp-1">{goal.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Completion slider */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider">Completion %</span>
            <span className="text-violet-300 font-black text-base">{form.completion_pct}%</span>
          </div>
          <input
            type="range" min={0} max={100} step={5}
            value={form.completion_pct}
            onChange={e => setForm(f => ({ ...f, completion_pct: +e.target.value }))}
            className="w-full accent-violet-500"
          />
          <ProgressBar pct={form.completion_pct} />
        </div>

        {/* Status picker */}
        <div className="mb-5">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Status</p>
          <div className="grid grid-cols-3 gap-2">
            {(['on_track', 'ahead', 'at_risk', 'blocked', 'completed'] as const).map(s => {
              const style = STATUS_STYLE[s];
              const Icon = style.icon;
              return (
                <button
                  key={s}
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                    form.status === s
                      ? `${style.bg} ${style.text}`
                      : 'border-white/10 text-slate-500 hover:border-white/20'
                  }`}
                >
                  <Icon className="w-3 h-3" /> {s.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Text fields */}
        {[
          { key: 'notes', label: 'What did you work on?', placeholder: 'Key activities this period...' },
          { key: 'highlights', label: 'Wins & Highlights', placeholder: 'What went well...' },
          { key: 'blockers', label: 'Blockers (if any)', placeholder: 'What is slowing you down...' },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="mb-4">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">{label}</label>
            <textarea
              rows={2}
              placeholder={placeholder}
              value={(form as any)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 resize-none focus:outline-none focus:border-violet-500/50 transition"
            />
          </div>
        ))}

        {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="tp-sheen w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold flex items-center justify-center gap-2 transition disabled:opacity-40"
        >
          <Send className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Progress Update'}
        </button>
      </div>
    </div>
  );
}

// ─── Goal Progress Card ───────────────────────────────────────────────────────

function GoalProgressCard({ goal, onUpdate }: { goal: GoalData; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const catColor: Record<string, string> = {
    sales: 'amber', customer: 'sky', learning: 'violet', process: 'emerald', innovation: 'rose',
  };
  const color = catColor[goal.category] || 'violet';

  return (
    <>
      <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-all tp-reveal tp-tilt">
        {/* Header */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-slate-500 font-semibold">{goal.category_display}</span>
                <span className="text-slate-700">·</span>
                <span className="text-xs text-slate-500">{goal.weightage}% weight</span>
              </div>
              <h4 className="text-white font-bold text-sm leading-snug line-clamp-2">{goal.title}</h4>
              {goal.kpi_metric && (
                <p className="text-slate-400 text-xs mt-1">KPI: {goal.kpi_metric}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <StatusPill status={goal.current_status} label={goal.current_status_display} />
              {goal.final_score && (
                <span className="text-amber-400 font-black text-sm">{goal.final_score.toFixed(1)}<span className="text-slate-500 font-normal text-xs">/5</span></span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar pct={goal.self_completion_pct} color={color} />
            </div>
            <span className="text-xs font-bold text-slate-300 w-10 text-right shrink-0">
              {goal.self_completion_pct}%
            </span>
          </div>

          {/* Rating pills */}
          {(goal.manager_rating || goal.self_rating) && (
            <div className="flex gap-2 mt-3">
              {goal.self_rating && (
                <span className="px-2 py-0.5 rounded-md bg-white/5 text-xs text-slate-400">
                  Self: {'★'.repeat(goal.self_rating)}{'☆'.repeat(5 - goal.self_rating)}
                </span>
              )}
              {goal.manager_rating && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-xs text-amber-300">
                  Mgr: {'★'.repeat(goal.manager_rating)}{'☆'.repeat(5 - goal.manager_rating)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-white/5 px-5 py-3 flex items-center justify-between">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            {goal.progress_updates.length} update{goal.progress_updates.length !== 1 ? 's' : ''}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="tp-sheen flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/25 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Log Update
          </button>
        </div>

        {/* Progress timeline (expanded) */}
        {expanded && goal.progress_updates.length > 0 && (
          <div className="border-t border-white/5 px-5 py-4 space-y-3">
            {goal.progress_updates.map((u, i) => {
              const s = STATUS_STYLE[u.status] || STATUS_STYLE.not_started;
              const Icon = s.icon;
              return (
                <div key={u.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${s.bg} ${s.text}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    {i < goal.progress_updates.length - 1 && <div className="w-px flex-1 bg-white/5 mt-1" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold ${s.text}`}>{u.status_display}</span>
                      <span className="text-slate-600 text-xs">{u.update_date}</span>
                      <span className="ml-auto text-xs font-bold text-slate-300">{u.completion_pct}%</span>
                    </div>
                    {u.notes && <p className="text-slate-400 text-xs">{u.notes}</p>}
                    {u.highlights && <p className="text-emerald-400 text-xs mt-1">✓ {u.highlights}</p>}
                    {u.blockers && <p className="text-rose-400 text-xs mt-1">⚡ {u.blockers}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <AddProgressModal goal={goal} onClose={() => setShowModal(false)} onSaved={onUpdate} />
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EmployeeProgressView({ employee }: { employee: any }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCycleIdx, setSelectedCycleIdx] = useState(0);
  const [tab, setTab] = useState<'goals' | 'history'>('goals');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getEmployeeProgressReport(employee.employee_id);
      setReport(data);
      // Default to the most recent cycle
      if (data.cycles?.length > 0) setSelectedCycleIdx(data.cycles.length - 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [employee.employee_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading your performance report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-rose-400">
          <p className="font-bold mb-1">Failed to load report</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm transition">Retry</button>
        </div>
      </div>
    );
  }

  if (!report || report.cycles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-slate-400">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold text-white mb-1">No goals yet</p>
          <p className="text-sm">Set your quarterly goals to start tracking progress here.</p>
        </div>
      </div>
    );
  }

  const cycle: CycleData = report.cycles[selectedCycleIdx];
  const latestScore = report.score_trend[report.score_trend.length - 1]?.score;
  const latestBand = report.score_trend[report.score_trend.length - 1]?.band;

  // Radar chart data — goal category scores
  const radarData = cycle.goals.map((g: GoalData) => ({
    subject: g.category_display.split(' ').slice(1).join(' ') || g.category_display,
    score: g.final_score ? g.final_score * 20 : (g.self_completion_pct || 0),
    fullMark: 100,
  }));

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <style>{TOOL_STYLES}</style>
      {/* ── Hero row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score gauge */}
        <div className="bg-white/3 border border-white/8 rounded-3xl p-6 flex items-center gap-5 md:col-span-1 tp-reveal tp-tilt">
          {latestScore ? (
            <>
              <ScoreGauge score={latestScore} />
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Latest Score</p>
                <p className={`text-sm font-black bg-gradient-to-r ${BAND_GRADIENT[latestBand] || 'from-slate-300 to-slate-400'} bg-clip-text text-transparent`}>
                  {report.score_trend[report.score_trend.length - 1]?.label}
                </p>
                <p className="text-slate-300 text-xs mt-0.5">{report.score_trend[report.score_trend.length - 1]?.band?.replace('_', ' ')}</p>
              </div>
            </>
          ) : (
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Performance Score</p>
              <p className="text-slate-500 text-sm">Results pending</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="md:col-span-2 grid grid-cols-3 gap-4">
          {[
            { label: 'Total Cycles', value: report.total_cycles, sub: 'quarters tracked', color: 'violet' },
            { label: 'Active Goals', value: cycle.goals.length, sub: `in ${cycle.cycle_name}`, color: 'sky' },
            { label: 'Avg Completion', value: `${cycle.goals.length ? Math.round(cycle.goals.reduce((s: number, g: GoalData) => s + g.self_completion_pct, 0) / cycle.goals.length) : 0}%`, sub: 'this quarter', color: 'emerald' },
          ].map(({ label, value, sub, color }, si) => {
            const colorMap: Record<string, string> = { violet: 'text-violet-400', sky: 'text-sky-400', emerald: 'text-emerald-400' };
            return (
              <div key={label} className="bg-white/3 border border-white/8 rounded-2xl p-4 tp-reveal tp-tilt" style={{ animationDelay: `${si * 70}ms` }}>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
                <p className={`text-3xl font-black ${colorMap[color]} tp-pop-in`}>{value}</p>
                <p className="text-slate-500 text-xs mt-1">{sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Cycle selector ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Quarter:</p>
        {report.cycles.map((c: CycleData, i: number) => (
          <button
            key={c.cycle_id}
            onClick={() => setSelectedCycleIdx(i)}
            className={`tp-tilt px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
              i === selectedCycleIdx
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'border-white/8 text-slate-400 hover:border-white/20 hover:text-slate-200'
            }`}
          >
            {c.cycle_name}
          </button>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-white/3 rounded-2xl w-fit">
        {([
          { id: 'goals', label: 'Goals & Progress', icon: Target },
          { id: 'history', label: 'Performance History', icon: TrendingUp },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`tp-tilt flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Goals Tab ── */}
      {tab === 'goals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold">{cycle.cycle_name} — Goals</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Status: <span className="text-violet-300">{cycle.goal_card_status_display}</span>
              </p>
            </div>
            {cycle.review && (
              <div className={`px-4 py-2 rounded-2xl border bg-gradient-to-r ${BAND_GRADIENT[cycle.review.performance_band] || ''}/10 border-white/10`}>
                <p className="text-xs text-slate-400">Final Score</p>
                <p className="text-white font-black">{cycle.review.final_weighted_score?.toFixed(2) ?? '—'}</p>
              </div>
            )}
          </div>

          {cycle.goals.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No goals set for this quarter yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {cycle.goals.map((g: GoalData) => (
                <GoalProgressCard key={g.id} goal={g} onUpdate={load} />
              ))}
            </div>
          )}

          {/* Radar chart for current cycle */}
          {cycle.goals.length >= 3 && (
            <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mt-4 tp-reveal">
              <h4 className="text-slate-300 text-sm font-bold mb-4">Goal Category Overview</h4>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Progress" dataKey="score" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── History Tab ── */}
      {tab === 'history' && (
        <div className="space-y-6">
          {/* Score trend chart */}
          {report.score_trend.length >= 2 ? (
            <div className="bg-white/3 border border-white/8 rounded-2xl p-6 tp-reveal">
              <h4 className="text-slate-300 text-sm font-bold mb-4">Performance Score Trend</h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.score_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1e1e3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      formatter={(v: any) => [Number(v).toFixed(2), 'Score']}
                    />
                    <Line type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={3} dot={{ fill: '#a78bfa', r: 5, strokeWidth: 0 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-white/3 border border-white/8 rounded-2xl p-6 text-center text-slate-400">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Complete at least 2 quarters to see the trend chart.</p>
            </div>
          )}

          {/* Cycle history table */}
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden tp-reveal">
            <div className="px-6 py-4 border-b border-white/5">
              <h4 className="text-slate-300 text-sm font-bold">Quarter-by-Quarter Breakdown</h4>
            </div>
            <div className="divide-y divide-white/5">
              {[...report.cycles].reverse().map((c: CycleData, ci: number) => (
                <div key={c.cycle_id} className="px-6 py-4 flex items-center gap-4 tp-reveal" style={{ animationDelay: `${Math.min(ci, 8) * 50}ms` }}>
                  <div className="w-20 text-center">
                    <p className="text-white font-bold text-sm">{c.cycle_name}</p>
                    <p className="text-slate-500 text-xs">{c.fiscal_year}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs text-slate-400">{c.goals.length} goals</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        c.goal_card_status === 'finalized' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : c.goal_card_status === 'manager_approved' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-slate-400'
                      }`}>
                        {c.goal_card_status_display}
                      </span>
                    </div>
                    <ProgressBar
                      pct={c.goals.length ? c.goals.reduce((s: number, g: GoalData) => s + g.self_completion_pct, 0) / c.goals.length : 0}
                    />
                  </div>
                  <div className="text-right w-20">
                    {c.review?.final_weighted_score ? (
                      <>
                        <p className="text-white font-black text-lg">{c.review.final_weighted_score.toFixed(2)}</p>
                        <p className={`text-xs bg-gradient-to-r ${BAND_GRADIENT[c.review.performance_band] || 'from-slate-400 to-slate-300'} bg-clip-text text-transparent font-bold`}>
                          {c.review.performance_band}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500 text-xs">Pending</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

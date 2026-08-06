/* Intelligence and Customers tabs for SalesIQ. */
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ComposedChart, Area, Line,
  PieChart, Pie, ReferenceLine,
} from 'recharts';
import {
  Crown, TrendingUp, TrendingDown, AlertTriangle, Gauge as GaugeIcon, CalendarRange,
  Grid3x3, Users, Repeat, Sparkles, Target, Layers, Activity, Zap, ArrowUpRight,
  ArrowDownRight, Flame, Snowflake,
} from 'lucide-react';
import {
  Panel, Empty, Leaderboard, ChartTip, Counter, Reveal, Gauge, HeatGrid, CohortGrid,
  shortInr, inr, PALETTE,
} from './SalesIQShared';

const QUAD = {
  star:     { label: 'Star',        colour: '#10b981', icon: Crown,        hint: 'Big and growing — protect and invest' },
  cash_cow: { label: 'Cash Cow',    colour: '#6366f1', icon: Layers,       hint: 'Big but slowing — defend the base' },
  rising:   { label: 'Rising',      colour: '#f59e0b', icon: TrendingUp,   hint: 'Small but fast — worth backing' },
  watch:    { label: 'Watch',       colour: '#ef4444', icon: TrendingDown, hint: 'Small and slowing — review or exit' },
};

const SEG_COLOUR: Record<string, string> = {
  'Champions': '#10b981', 'Loyal': '#6366f1', 'Potential': '#06b6d4',
  'New': '#f59e0b', 'At Risk': '#f97316', 'Hibernating': '#94a3b8',
};

/* ════════════════════════════════════════════════════════════════════════ */
export function IntelligencePanel({ data, dim, setDim }: {
  data: any; dim: string; setDim: (d: string) => void;
}) {
  const { pareto, matrix, movers, anomalies, seasonality, heatmap, pacing, price } = data;

  const DIMS = ['state', 'category', 'product', 'channel', 'salesperson', 'customer'];

  const quadCounts = (matrix?.results || []).reduce((a: any, r: any) => {
    a[r.quadrant] = (a[r.quadrant] || 0) + 1; return a;
  }, {});

  return (
    <div className="space-y-5">
      {/* dimension switcher */}
      <Reveal>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Analyse by
          </span>
          {DIMS.map(d => (
            <button key={d} onClick={() => setDim(d)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold capitalize transition-all
                ${dim === d
                  ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}>
              {d}
            </button>
          ))}
        </div>
      </Reveal>

      {/* pacing + anomalies */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Panel title="Target pacing" icon={GaugeIcon} delay={0}
          subtitle="Are we on track to finish on plan?">
          {pacing?.has_target ? (
            <div className="space-y-4">
              <Gauge value={pacing.projected_vs_target_pct} label="Projected vs target"
                sublabel={pacing.on_track
                  ? 'On track to finish at or above plan'
                  : `Short by ₹${shortInr(Math.abs(pacing.target - pacing.projected_total))} at current pace`} />
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { l: 'Current run-rate', v: `₹${shortInr(pacing.run_rate_per_day)}/day`, c: 'text-slate-800' },
                  { l: 'Needed run-rate', v: `₹${shortInr(pacing.required_per_day)}/day`,
                    c: pacing.required_per_day > pacing.run_rate_per_day ? 'text-rose-600' : 'text-emerald-600' },
                  { l: 'Period elapsed', v: `${pacing.elapsed_pct}%`, c: 'text-slate-800' },
                  { l: 'Days remaining', v: `${pacing.days_remaining}`, c: 'text-slate-800' },
                ].map(x => (
                  <div key={x.l} className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{x.l}</p>
                    <p className={`text-sm font-black tabular-nums ${x.c}`}>{x.v}</p>
                  </div>
                ))}
              </div>
              {!pacing.on_track && pacing.required_per_day > pacing.run_rate_per_day && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3">
                  <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    Daily sales need to rise{' '}
                    <b>{((pacing.required_per_day / (pacing.run_rate_per_day || 1) - 1) * 100).toFixed(0)}%</b>
                    {' '}for the rest of the period to hit target.
                  </p>
                </div>
              )}
            </div>
          ) : <Empty msg={pacing?.note || 'Add a Target column to your upload to enable pacing'} />}
        </Panel>

        <Panel title="Anomaly radar" icon={Zap} delay={60} className="xl:col-span-2"
          subtitle={anomalies?.note}>
          {anomalies?.results?.length ? (
            <div className="space-y-2.5">
              {anomalies.results.map((a: any, i: number) => (
                <div key={a.period}
                  className={`siq-reveal flex items-center gap-3 rounded-xl border p-3
                    ${a.direction === 'spike'
                      ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}
                  style={{ animationDelay: `${i * 70}ms` }}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                    ${a.direction === 'spike' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                    {a.direction === 'spike'
                      ? <Flame className="w-4 h-4 text-emerald-600" />
                      : <Snowflake className="w-4 h-4 text-rose-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black text-slate-800">
                      {a.label} — {a.direction === 'spike' ? 'unusual high' : 'unusual low'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      ₹{shortInr(a.value)} · {a.vs_mean_pct > 0 ? '+' : ''}{a.vs_mean_pct}% vs the
                      period average · {Math.abs(a.z_score)}σ from normal
                    </p>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-slate-400 pt-1">
                Months more than 2 standard deviations from the mean. A spike worth repeating,
                a drop worth explaining.
              </p>
            </div>
          ) : <Empty msg={anomalies?.note || 'No unusual months detected — the series is stable'} />}
        </Panel>
      </div>

      {/* growth quadrant */}
      <Panel title={`Growth quadrant — by ${dim}`} icon={Target} delay={120}
        subtitle="Revenue size vs momentum against the prior equal period">
        {matrix?.results?.length ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
              {Object.entries(QUAD).map(([k, q]) => {
                const I = q.icon;
                return (
                  <div key={k} className="rounded-xl border p-3"
                    style={{ borderColor: `${q.colour}33`, background: `${q.colour}0d` }}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <I className="w-3.5 h-3.5" style={{ color: q.colour }} />
                      <p className="text-[11px] font-black" style={{ color: q.colour }}>{q.label}</p>
                      <span className="ml-auto text-sm font-black tabular-nums text-slate-700">
                        {quadCounts[k] || 0}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">{q.hint}</p>
                  </div>
                );
              })}
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="revenue" name="Revenue" tickFormatter={shortInr}
                  tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  label={{ value: 'Revenue →', position: 'insideBottom', offset: -10,
                           style: { fontSize: 10, fill: '#94a3b8', fontWeight: 700 } }} />
                <YAxis type="number" dataKey="growth_pct" name="Growth %" unit="%"
                  tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  label={{ value: 'Growth % →', angle: -90, position: 'insideLeft',
                           style: { fontSize: 10, fill: '#94a3b8', fontWeight: 700 } }} />
                <ZAxis type="number" dataKey="revenue" range={[60, 420]} />
                <ReferenceLine x={matrix.median_revenue} stroke="#cbd5e1" strokeDasharray="4 4" />
                <ReferenceLine y={matrix.median_growth} stroke="#cbd5e1" strokeDasharray="4 4" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const q = (QUAD as any)[d.quadrant];
                  return (
                    <div className="rounded-xl bg-slate-900/95 backdrop-blur px-3 py-2 shadow-2xl border border-white/10">
                      <p className="text-[12px] font-black text-white">{d.name}</p>
                      <p className="text-[11px] font-bold" style={{ color: q.colour }}>{q.label}</p>
                      <p className="text-[11px] text-slate-300">Revenue ₹{shortInr(d.revenue)}</p>
                      <p className="text-[11px] text-slate-300">
                        Growth {d.growth_pct === null ? 'new entrant' : `${d.growth_pct}%`}
                      </p>
                    </div>
                  );
                }} />
                {Object.keys(QUAD).map(k => (
                  <Scatter key={k} name={(QUAD as any)[k].label}
                    data={matrix.results.filter((r: any) => r.quadrant === k)}
                    fill={(QUAD as any)[k].colour} fillOpacity={0.75} animationDuration={900} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-slate-400 mt-2">
              Dashed lines are the medians of this selection — "big" and "fast" are relative to the
              rest of your book, not fixed thresholds.
            </p>
          </>
        ) : <Empty msg="Need two comparable periods of data to build the quadrant" />}
      </Panel>

      {/* movers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Panel title="Biggest gainers" icon={ArrowUpRight} delay={180}
          subtitle={`Top ${dim}s by rupee gain vs prior period`}>
          {movers?.gainers?.length ? (
            <div className="space-y-2">
              {movers.gainers.map((m: any, i: number) => (
                <div key={m.name} className="siq-reveal flex items-center gap-3 rounded-xl
                                             bg-emerald-50/50 border border-emerald-100 p-2.5"
                  style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-[10px]
                                   font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-slate-800 truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-500">
                      ₹{shortInr(m.prev_revenue)} → ₹{shortInr(m.revenue)}
                      {m.is_new && <span className="ml-1 text-emerald-600 font-black">NEW</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[12px] font-black text-emerald-600 tabular-nums">
                      +₹{shortInr(m.change)}
                    </p>
                    {m.growth_pct !== null && (
                      <p className="text-[10px] font-bold text-emerald-500">+{m.growth_pct}%</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty msg="No prior period to compare against" />}
        </Panel>

        <Panel title="Biggest declines" icon={ArrowDownRight} delay={220}
          subtitle="Where revenue was lost — fix these first">
          {movers?.losers?.length ? (
            <div className="space-y-2">
              {movers.losers.map((m: any, i: number) => (
                <div key={m.name} className="siq-reveal flex items-center gap-3 rounded-xl
                                             bg-rose-50/50 border border-rose-100 p-2.5"
                  style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 text-[10px]
                                   font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-slate-800 truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-500">
                      ₹{shortInr(m.prev_revenue)} → ₹{shortInr(m.revenue)}
                      {m.is_lost && <span className="ml-1 text-rose-600 font-black">STOPPED</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[12px] font-black text-rose-600 tabular-nums">
                      ₹{shortInr(m.change)}
                    </p>
                    {m.growth_pct !== null && (
                      <p className="text-[10px] font-bold text-rose-500">{m.growth_pct}%</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty msg="Nothing declined — everything held or grew" />}
        </Panel>
      </div>

      {/* pareto */}
      <Panel title={`Concentration — 80/20 by ${dim}`} icon={Crown} delay={260}
        subtitle="How much of the business rests on how few">
        {pareto?.results?.length ? (
          <>
            {pareto.pareto_point && (
              <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-50
                              to-violet-50 border border-indigo-100 p-4 mb-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                                flex items-center justify-center shadow-lg shadow-indigo-500/25 flex-shrink-0">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <p className="text-[13px] text-slate-700 leading-relaxed">
                  <b className="text-indigo-700">{pareto.pareto_point.count} {dim}s</b>
                  {' '}({pareto.pareto_point.pct_of_groups}% of the total) generate{' '}
                  <b className="text-indigo-700">{pareto.pareto_point.pct_of_revenue}% of revenue</b>.
                  {pareto.pareto_point.pct_of_groups < 25 &&
                    ' That is heavy concentration — losing any one of them would hurt.'}
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {[['A', pareto.a_count, 'Top 80% of revenue', '#10b981'],
                ['B', pareto.b_count, 'Next 15%', '#f59e0b'],
                ['C', pareto.c_count, 'Last 5%', '#94a3b8']].map(([c, n, d, col]: any) => (
                <div key={c} className="rounded-xl border p-3 text-center"
                  style={{ borderColor: `${col}33`, background: `${col}0d` }}>
                  <p className="text-2xl font-black tabular-nums" style={{ color: col }}>{n}</p>
                  <p className="text-[11px] font-black text-slate-600">Class {c}</p>
                  <p className="text-[10px] text-slate-400">{d}</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={pareto.results.slice(0, 20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false}
                  tickLine={false} interval={0} angle={-35} textAnchor="end" height={70} />
                <YAxis yAxisId="l" tickFormatter={shortInr} tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false} width={58} />
                <YAxis yAxisId="r" orientation="right" domain={[0, 100]} unit="%"
                  tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={42} />
                <Tooltip content={<ChartTip />} />
                <Bar yAxisId="l" dataKey="revenue" name="Revenue" radius={[5, 5, 0, 0]} animationDuration={900}>
                  {pareto.results.slice(0, 20).map((r: any, i: number) => (
                    <Cell key={i} fill={r.class === 'A' ? '#10b981' : r.class === 'B' ? '#f59e0b' : '#cbd5e1'} />
                  ))}
                </Bar>
                <Line yAxisId="r" type="monotone" dataKey="cumulative_pct" name="Cumulative %"
                  stroke="#6366f1" strokeWidth={2.5} dot={false} animationDuration={1200} />
                <ReferenceLine yAxisId="r" y={80} stroke="#ef4444" strokeDasharray="4 4" />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        ) : <Empty msg="No data for concentration analysis" />}
      </Panel>

      {/* heatmap + seasonality */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title={`Heatmap — ${dim} by month`} icon={Grid3x3} delay={300}
          subtitle="Spot who carried or dragged a given month">
          <HeatGrid data={heatmap} />
        </Panel>

        <Panel title="Seasonality profile" icon={CalendarRange} delay={340}
          subtitle={seasonality?.reliable
            ? `Averaged across ${seasonality.years} years — 100 = an average month`
            : `Only ${seasonality?.years || 0} year of data — indicative only`}>
          {seasonality?.results?.some((r: any) => r.samples) ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={seasonality.results}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={38} />
                  <Tooltip content={<ChartTip money={false} />} />
                  <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Bar dataKey="index" name="Index" radius={[5, 5, 0, 0]} animationDuration={900}>
                    {seasonality.results.map((r: any, i: number) => (
                      <Cell key={i} fill={!r.samples ? '#f1f5f9'
                        : r.index >= 115 ? '#10b981' : r.index <= 85 ? '#ef4444' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {seasonality.peak && seasonality.low && (
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Strongest month is <b className="text-emerald-600">{seasonality.peak.label}</b>
                  {' '}({seasonality.peak.index}) and weakest is{' '}
                  <b className="text-rose-600">{seasonality.low.label}</b> ({seasonality.low.index}).
                  {!seasonality.reliable && ' With under 2 years this is a single observation, not a pattern.'}
                </p>
              )}
            </>
          ) : <Empty msg="Not enough history for a seasonal profile" />}
        </Panel>
      </div>

      {/* price vs volume */}
      <Panel title="Price vs volume" icon={Activity} delay={380}
        subtitle="Is growth coming from selling more, or charging more?">
        {price?.results?.length ? (
          <>
            {price.verdict && (
              <div className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3 mb-4">
                <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-slate-700 leading-relaxed">
                  <b>{price.verdict}</b>
                  {price.price_change_pct !== null && price.price_change_pct !== undefined && (
                    <> Realised price {price.price_change_pct > 0 ? 'up' : 'down'}{' '}
                      {Math.abs(price.price_change_pct)}%, volume{' '}
                      {(price.volume_change_pct ?? 0) > 0 ? 'up' : 'down'}{' '}
                      {Math.abs(price.volume_change_pct ?? 0)}% comparing the second half of the
                      period with the first.</>
                  )}
                </p>
              </div>
            )}
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={price.results}>
                <defs>
                  <linearGradient id="gQty" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="l" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<ChartTip money={false} />} />
                <Area yAxisId="l" type="monotone" dataKey="quantity" name="Quantity"
                  stroke="#06b6d4" strokeWidth={2} fill="url(#gQty)" animationDuration={1000} />
                <Line yAxisId="r" type="monotone" dataKey="avg_price" name="Avg price"
                  stroke="#f59e0b" strokeWidth={2.5} dot={false} animationDuration={1200} />
                <Line yAxisId="r" type="monotone" dataKey="discount_pct" name="Discount %"
                  stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={false} animationDuration={1400} />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        ) : <Empty msg="Add Quantity and Gross Amount columns to analyse price vs volume" />}
      </Panel>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export function CustomersPanel({ data }: { data: any }) {
  const { rfm, cohorts, newRepeat, paretoCustomer } = data;
  const segs = rfm?.segments || [];
  const totalRev = segs.reduce((a: number, s: any) => a + s.revenue, 0) || 1;

  return (
    <div className="space-y-5">
      {/* segment summary */}
      {segs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {segs.map((s: any, i: number) => (
            <Reveal key={s.label} delay={i * 60}>
              <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200
                              p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg group">
                <div className="absolute inset-x-0 top-0 h-1"
                  style={{ background: SEG_COLOUR[s.label] || '#94a3b8' }} />
                <p className="text-[11px] font-black" style={{ color: SEG_COLOUR[s.label] || '#64748b' }}>
                  {s.label}
                </p>
                <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">
                  <Counter value={s.count} format={inr} />
                </p>
                <p className="text-[10px] text-slate-400">customers</p>
                <p className="text-[11px] font-bold text-slate-600 mt-1.5">₹{shortInr(s.revenue)}</p>
                <div className="h-1 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                  <div className="siq-grow h-full rounded-full"
                    style={{ width: `${s.revenue / totalRev * 100}%`,
                             background: SEG_COLOUR[s.label] || '#94a3b8' }} />
                </div>
                <p className="absolute inset-x-4 bottom-1 text-[9px] text-slate-400 opacity-0
                              group-hover:opacity-100 transition-opacity truncate">
                  {s.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Panel title="Revenue by segment" icon={Users} delay={200}>
          {segs.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={segs} dataKey="revenue" nameKey="label" innerRadius={58}
                  outerRadius={100} paddingAngle={3} animationDuration={1000}>
                  {segs.map((s: any, i: number) => (
                    <Cell key={i} fill={SEG_COLOUR[s.label] || PALETTE[i % PALETTE.length]}
                      stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty msg={rfm?.note || 'No customer column in your upload'} />}
        </Panel>

        <Panel title="New vs repeat revenue" icon={Repeat} delay={240} className="xl:col-span-2"
          subtitle="Acquisition versus the existing base">
          {newRepeat?.results?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={newRepeat.results}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={shortInr} tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false} width={58} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="repeat" name="Repeat" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} animationDuration={900} />
                <Bar dataKey="new" name="New" stackId="a" fill="#10b981" radius={[5, 5, 0, 0]} animationDuration={900} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <Empty msg={newRepeat?.note || 'No customer column in your upload'} />}
        </Panel>
      </div>

      <Panel title="Cohort retention" icon={Grid3x3} delay={280}
        subtitle="Do the customers you win keep buying?">
        <CohortGrid data={cohorts} />
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title="Customer concentration" icon={Crown} delay={320}
          subtitle="How dependent are you on a few accounts?">
          {paretoCustomer?.pareto_point ? (
            <>
              <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50
                              border border-amber-200 p-4 mb-4">
                <p className="text-[13px] text-slate-700 leading-relaxed">
                  <b className="text-amber-700">{paretoCustomer.pareto_point.count} customers</b>
                  {' '}({paretoCustomer.pareto_point.pct_of_groups}%) bring in{' '}
                  <b className="text-amber-700">{paretoCustomer.pareto_point.pct_of_revenue}%</b> of revenue.
                </p>
              </div>
              <Leaderboard rows={paretoCustomer.results.slice(0, 10)} />
            </>
          ) : <Empty msg="No customer column in your upload" />}
        </Panel>

        <Panel title="At-risk accounts" icon={AlertTriangle} delay={360}
          subtitle="High value, long since they last ordered">
          {rfm?.results?.length ? (() => {
            const risky = rfm.results
              .filter((r: any) => r.segment === 'At Risk' || (r.r <= 2 && r.m >= 3))
              .sort((a: any, b: any) => b.monetary - a.monetary).slice(0, 10);
            return risky.length ? (
              <div className="space-y-2">
                {risky.map((r: any, i: number) => (
                  <div key={r.customer} className="siq-reveal flex items-center gap-3 rounded-xl
                                                   bg-orange-50/60 border border-orange-100 p-2.5"
                    style={{ animationDelay: `${i * 55}ms` }}>
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center
                                    justify-center flex-shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-800 truncate">{r.customer}</p>
                      <p className="text-[10px] text-slate-500">
                        Last ordered {r.recency_days} days ago · {r.frequency} orders
                      </p>
                    </div>
                    <p className="text-[12px] font-black text-slate-800 tabular-nums flex-shrink-0">
                      ₹{shortInr(r.monetary)}
                    </p>
                  </div>
                ))}
                <p className="text-[11px] text-slate-400 pt-1">
                  These accounts spent well but have gone quiet — the highest-return win-back calls.
                </p>
              </div>
            ) : <Empty msg="No at-risk accounts — everyone valuable is still active" />;
          })() : <Empty msg={rfm?.note || 'No customer column in your upload'} />}
        </Panel>
      </div>

      {rfm?.results?.length > 0 && (
        <Panel title="RFM scores" icon={Layers} delay={400}
          subtitle={`Recency / Frequency / Monetary, scored 1-5 within this dataset (as of ${rfm.as_of})`}>
          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-sm">
              <thead className="text-slate-400 sticky top-0 bg-white">
                <tr>{['Customer', 'Segment', 'R', 'F', 'M', 'Last order', 'Orders', 'Revenue'].map(h => (
                  <th key={h} className="text-left text-[10px] font-black uppercase tracking-widest px-3 py-2">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rfm.results.slice(0, 60).map((r: any, i: number) => (
                  <tr key={r.customer} className="siq-reveal hover:bg-slate-50"
                    style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}>
                    <td className="px-3 py-2 font-bold text-slate-700 max-w-[180px] truncate">{r.customer}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black"
                        style={{ background: `${SEG_COLOUR[r.segment] || '#94a3b8'}1a`,
                                 color: SEG_COLOUR[r.segment] || '#64748b' }}>
                        {r.segment}
                      </span>
                    </td>
                    {[r.r, r.f, r.m].map((s: number, j: number) => (
                      <td key={j} className="px-3 py-2">
                        <span className="inline-flex w-5 h-5 rounded items-center justify-center
                                         text-[10px] font-black"
                          style={{ background: `rgba(99,102,241,${0.1 + s * 0.16})`,
                                   color: s >= 4 ? '#3730a3' : '#64748b' }}>{s}</span>
                      </td>
                    ))}
                    <td className="px-3 py-2 text-[11px] text-slate-500">{r.recency_days}d ago</td>
                    <td className="px-3 py-2 text-[11px] text-slate-500 tabular-nums">{r.frequency}</td>
                    <td className="px-3 py-2 font-black text-slate-800 tabular-nums">₹{shortInr(r.monetary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

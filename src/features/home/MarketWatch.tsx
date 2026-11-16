/* Market Watch - honey prices, APIS against its competitors, and the day's
 * market news. Read-only, on the home page above "Did You Know".
 *
 * Everything shown comes from /api/marketwatch/dashboard/, which reads live
 * Flipkart listings and Google News (see marketwatch/sources.py on the
 * backend). Nothing here invents a figure: a brand that is not listed says
 * so, and the trend only has the days that were actually fetched.
 *
 * Laid out top to bottom in the order a reader asks: where does APIS stand
 * (spotlight + four headline tiles), how does each pack size compare (the
 * size x brand table), what exactly is on sale (every listing, sorted), how
 * is it moving (ranked bars today, lines once there is history), and what is
 * the market saying (news, by topic). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, ArrowDown, ArrowUp, ArrowUpRight, CalendarDays, Download, FileSpreadsheet, FileText, Megaphone, Newspaper, Package,
  RefreshCw, Scale, ShieldCheck, TrendingUp, Trophy, Users, X,
} from 'lucide-react';
import { apiBase } from '../../apiBase';
import { apiFetch } from '../portal/session';

interface Listing {
  brand: string; missing?: boolean; reason?: 'size' | 'unlisted'; source?: string; title?: string; pack_label?: string; pack_grams?: number;
  mrp?: number; price?: number; discount_pct?: number | null; per_100g?: number; url?: string; image?: string;
  in_stock?: boolean; diff_vs_apis?: number; diff_vs_apis_pct?: number; exact?: boolean; product_id?: string;
}
interface Gap { brand: string; per_100g: number; pct: number }
interface Insight { kind: string; title: string; value: string; detail: string }
interface NewsItem { topic: string; title: string; publisher: string; url: string; published: string }
interface Dashboard {
  product: string; product_label: string; product_noun: string;
  products: { key: string; label: string }[];
  days_by_product?: Record<string, string[]>;
  day: string; is_live: boolean; fetched_at: string; note: string; size: number; sizes: number[]; days: string[];
  comparison: Listing[]; insights: Insight[];
  matrix: { grams: number; label: string; cheapest: string | null; cells: Record<string, Listing> }[];
  all_listings: Record<string, Listing[]>;
  spotlight: { product: Listing; beats: Gap[]; behind: Gap[]; rank: number; of: number } | null;
  history: { days: string[]; series: { brand: string; points: { day: string; per_100g: number }[] }[] };
  news: NewsItem[]; news_errors: string[];
  sources: { prices: string; news: string; status: { brand: string; ok: boolean; count: number; error?: string; via?: string }[];
    unavailable: { store: string; reason: string }[]; stores?: { store: string; live: boolean; reason: string }[] };
}

const API = `${apiBase()}/api/marketwatch/dashboard/`;
const REPORT_API = `${apiBase()}/api/marketwatch/report/`;
const PANEL_W = 360;    // the download list's width, px
const HOME = 'APIS';
/* The products Market Watch compares - the same list as the server's
   sources.PRODUCTS. Used before the first answer arrives; the server's own
   list (data.products) is shown once it has. */
const PRODUCTS = [
  { key: 'honey', label: 'Honey', noun: 'honey', icon: '🍯' },
  { key: 'dates', label: 'Dates', noun: 'dates', icon: '🌴' },
];
const productInfo = (key: string) => PRODUCTS.find(x => x.key === key) ?? PRODUCTS[0];

/* One colour per brand, fixed - a filter never repaints a brand. Checked for
   colour-blind separation; every mark also carries the brand's name. */
const BRAND_COLOUR: Record<string, string> = {
  APIS: '#2a78d6', Dabur: '#eb6834', Patanjali: '#1baf7a', Saffola: '#e87ba4', Zandu: '#8b5cf6',
  Aladdin: '#0d9488', Nutraj: '#dc2626',
};
/* The four headline numbers, in this order; the rest are footnotes. */
const TILES: { kind: string; icon: typeof Trophy }[] = [
  { kind: 'cheapest', icon: Trophy }, { kind: 'average', icon: Scale },
  { kind: 'apis', icon: ShieldCheck }, { kind: 'discount', icon: TrendingUp },
];

/* apiFetch, tried once more after a short pause if the request never reached
   the server (it throws rather than answering) - a server restarting or a
   dropped connection is usually back within a couple of seconds. An answer,
   even an error one, is returned as it is. */
const NO_SERVER = 'Could not reach the server. Check your connection, then press Refresh.';
async function fetchRetry(url: string) {
  try {
    return await apiFetch(url);
  } catch {
    await new Promise(res => setTimeout(res, 2000));
    try {
      return await apiFetch(url);
    } catch {
      throw new Error(NO_SERVER);
    }
  }
}

const rupees = (n?: number, dp = 0) => (n == null ? '—' : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`);
const sizeLabel = (g: number) => (g >= 1000 ? `${g / 1000} kg` : `${g} g`);
const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const clock = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function MarketWatch() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [product, setProduct] = useState('honey');
  const [size, setSize] = useState(500);
  const [day, setDay] = useState('');
  const [rival, setRival] = useState('all');

  /* Callers say it is loading first (see busy below); the fetch itself only
     settles state once the answer is in. */
  const load = useCallback(async (refresh = false) => {
    try {
      const qs = new URLSearchParams({ product, size: String(size) });
      if (day) qs.set('day', day);
      if (refresh) qs.set('refresh', '1');
      const r = await fetchRetry(`${API}?${qs}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Market Watch could not load (${r.status}).`);
      setData(d); setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Market Watch could not load.');
    } finally {
      setLoading(false);
    }
  }, [product, size, day]);

  // Started from a callback, not the effect body: load() settles state.
  useEffect(() => {
    const t = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(t);
  }, [load]);
  const busy = (f: () => void) => { setLoading(true); f(); };
  /* A new product starts from its own today and 500 g: the days saved and
     the brands differ from one product to the next. */
  const pickProduct = (v: string) => busy(() => { setProduct(v); setDay(''); setSize(500); setRival('all'); });
  const info = productInfo(data?.product ?? product);
  const today = new Date().toLocaleDateString('en-CA');   // YYYY-MM-DD, local

  /* Columns: every listed brand from cheapest to dearest per 100 g at the
     chosen size - APIS included, in whatever place its real price puts it. */
  const cols = useMemo(() => (data?.comparison ?? [])
    .filter(r => !r.missing && (rival === 'all' || r.brand === HOME || r.brand === rival))
    .sort((x, y) => (x.per_100g ?? Infinity) - (y.per_100g ?? Infinity))
    .map(r => r.brand), [data, rival]);
  const missingBrands = (data?.comparison ?? []).filter(r => r.missing && r.reason !== 'size').map(r => r.brand);

  return (
    <section className="ih-reveal rounded-2xl bg-white border border-amber-100 shadow-sm overflow-hidden">
      {/* ── Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-100 via-amber-50 to-orange-50 px-6 py-5">
        <div className="absolute -right-6 -top-10 w-56 h-56 rounded-full bg-amber-300/25 blur-2xl pointer-events-none" />
        <div className="absolute right-8 top-3 hidden md:block rotate-[-8deg] select-none pointer-events-none
                        text-[44px] font-black tracking-tight text-amber-900/10 leading-none">BREAKING<br />NEWS</div>
        <div className="relative flex items-center gap-4">
          <span className="w-12 h-12 rounded-2xl bg-white shadow-md shadow-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-6 h-6 text-amber-600" />
          </span>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1
                             text-[14px] font-black text-white shadow-sm">
              <Newspaper className="w-4 h-4" />Market Watch
            </span>
            <p className="mt-1.5 text-[13.5px] text-amber-950/80 font-medium">
              Today’s {info.noun} prices — APIS against its competitors.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2.5 px-6 py-3 border-b border-amber-100 bg-white">
        <label className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-3 py-1.5 shadow-sm">
          <span className="text-[15px] leading-none" aria-hidden>{productInfo(product).icon}</span>
          <span className="text-[11.5px] font-bold text-amber-800">Product</span>
          <select value={product} onChange={e => pickProduct(e.target.value)} className="mw-select" aria-label="Product">
            {(data?.products ?? PRODUCTS).map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
        </label>
        <Filter icon={CalendarDays} label="Date">
          <select value={day} onChange={e => { const v = e.target.value; busy(() => setDay(v)); }} className="mw-select">
            <option value="">Today (live)</option>
            {(data?.days ?? []).filter(d => d !== today).map(d => <option key={d} value={d}>{dayLabel(d)}</option>)}
          </select>
        </Filter>
        <Filter icon={Package} label="Compare at">
          <select value={size} onChange={e => { const v = Number(e.target.value); busy(() => setSize(v)); }} className="mw-select">
            {(data?.sizes ?? [250, 500, 1000]).map(s => <option key={s} value={s}>{sizeLabel(s)}</option>)}
          </select>
        </Filter>
        <Filter icon={Users} label="Competitor">
          <select value={rival} onChange={e => setRival(e.target.value)} className="mw-select">
            <option value="all">All competitors</option>
            {(data?.comparison ?? []).filter(r => r.brand !== HOME && !r.missing).map(r => (
              <option key={r.brand} value={r.brand}>{r.brand}</option>
            ))}
          </select>
        </Filter>
        <div className="flex-1" />
        {data && (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500">
            {data.is_live && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
            {data.is_live ? 'Live' : 'From history'} · {clock(data.fetched_at)}
          </span>
        )}
        <DownloadReport key={product} savedBy={data?.days_by_product ?? { [product]: data?.days ?? [] }}
          today={today} current={product} />
        <button type="button" onClick={() => busy(() => void load(true))} disabled={loading || !!day}
          title={day ? 'Refresh shows today — clear the date first' : 'Fetch prices now'}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2
                     text-[12.5px] font-black text-white shadow-sm hover:shadow-md disabled:opacity-50 transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>
      <style>{`.mw-select{background:transparent;font-size:12.5px;font-weight:800;color:#1e293b;outline:none;cursor:pointer;max-width:9.5rem}`}</style>

      {error && (
        <p className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[12.5px] font-semibold text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}{error === NO_SERVER && data ? ' The prices below are the last ones loaded.' : ''}
        </p>
      )}
      {data?.note && (
        <p className="mx-6 mt-4 rounded-xl bg-sky-50 border border-sky-100 px-3 py-2 text-[12px] font-semibold text-sky-800">{data.note}</p>
      )}

      {!data && loading ? (
        <div className="px-6 py-14 text-center">
          <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mx-auto" />
          <p className="mt-3 text-[13px] font-bold text-slate-700">Fetching live {productInfo(product).noun} prices…</p>
          <p className="text-[11.5px] text-slate-400">The first fetch of the half-hour takes about half a minute.</p>
        </div>
      ) : data && (
        <div className={`p-6 space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <StoreStrip data={data} />
          <CheapestRanking data={data} cols={cols} />

          {/* ── Four headline numbers ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {TILES.map(({ kind, icon: Icon }) => {
              const i = data.insights.find(x => x.kind === kind);
              return i && (
                <div key={kind} className={`rounded-xl px-3 py-2 ring-1 ${kind === 'apis' ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-slate-200'}`}>
                  <p className="flex items-center gap-1 text-[10.5px] font-bold text-slate-500">
                    <Icon className="w-3.5 h-3.5 text-amber-500" />{i.title}
                  </p>
                  <p className="mt-0.5 text-[15px] font-black text-slate-900 leading-tight">{i.value}</p>
                  <p className="mt-0.5 text-[10.5px] text-slate-500 leading-snug line-clamp-2" title={i.detail}>{i.detail}</p>
                </div>
              );
            })}
          </div>

          {/* The detailed tables sit behind buttons, not on the home page itself. */}
          <div className="grid md:grid-cols-2 gap-2.5">
            <PopupButton icon={Scale} title={`${info.label} prices by pack size`}
              hint="250 g, 500 g and 1 kg — every brand side by side, per 100 g">
              <SizeTable data={data} cols={cols} missing={missingBrands} />
            </PopupButton>
            <PopupButton icon={Package} title={`All ${info.noun} prices on Flipkart`}
              hint={`Every listing read ${data.is_live ? 'today' : `on ${dayLabel(data.day)}`} — sortable by price, pack and ₹ / 100 g`}>
              <AllPrices data={data} cols={cols} />
            </PopupButton>
          </div>

          {/* ── Where it comes from ── */}
          <details className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-[12px] text-slate-600">
            <summary className="cursor-pointer font-bold text-slate-700">Where these numbers come from</summary>
            <p className="mt-2">Prices are read live from {data.sources.prices} listings (MRP and selling price as shown to shoppers) and saved each time they are fetched, so any earlier day's report can still be downloaded.</p>
            <ul className="mt-1.5 list-disc pl-5 space-y-0.5">
              {data.sources.status.map(s => (
                <li key={s.brand}>{s.brand}: {s.ok ? `${s.count} ${info.noun} listing${s.count === 1 ? '' : 's'} found${s.via === 'product pages' ? ' — read from their own Flipkart product pages, as they were not in today’s Flipkart search' : ''}` : `could not be fetched (${s.error})`}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}

/* The day's comparison as an Excel file - today's, or any earlier day whose
   prices were saved. The last week is listed day by day, so "5 days ago" is
   one click; a day nothing was fetched says so instead of offering a file. */
/* Every product's report is offered here, whichever one is on screen: a
   Honey | Dates switch at the top, opening on the one being viewed. */
function DownloadReport({ savedBy, today, current }: {
  savedBy: Record<string, string[]>; today: string; current: string;
}) {
  const [product, setProduct] = useState(current);
  const label = productInfo(product).label;
  const saved = savedBy[product] ?? [];
  const [pos, setPos] = useState<{ top: number; left: number; maxH: number } | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  /* The list is drawn on <body>, placed under the button and kept inside the
     window - inside the panel it was cut off by the panel's own edges. */
  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(PANEL_W, window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    const top = r.bottom + 8;
    setPos({ top, left, maxH: Math.max(260, window.innerHeight - top - 16) });
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !panel.current?.contains(t)) setPos(null);
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T00:00:00`);
    d.setDate(d.getDate() - i);
    return d.toLocaleDateString('en-CA');
  });
  const older = saved.filter(d => !week.includes(d)).sort().reverse();
  const ago = (i: number) => (i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${i} days ago`);
  const weekday = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const download = async (d: string, kind: 'pdf' | 'xlsx') => {
    setBusy(`${d}:${kind}`); setErr('');
    try {
      const r = await fetchRetry(`${REPORT_API}?day=${d}&product=${product}${kind === 'pdf' ? '&type=pdf' : ''}`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `The report could not be made (${r.status}).`);
      }
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = url; a.download = `APIS-Market-Watch-${label.replace(/ /g, '-')}-${d}.${kind}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'The report could not be downloaded.');
    } finally {
      setBusy('');
    }
  };

  const row = (d: string, label: string, has: boolean) => (
    <li key={d} className="flex items-center gap-3 px-4 py-2 hover:bg-amber-50/60">
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-black text-slate-800">{label}</span>
        <span className="block text-[11px] font-semibold text-slate-500">{weekday(d)}</span>
      </span>
      {has ? (
        <span className="flex items-center gap-1.5">
          <button type="button" onClick={() => void download(d, 'pdf')} disabled={!!busy} title="Easy-to-read daily report"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5
                       text-[11.5px] font-black text-white shadow-sm hover:shadow-md disabled:opacity-50">
            {busy === `${d}:pdf` ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}PDF
          </button>
          <button type="button" onClick={() => void download(d, 'xlsx')} disabled={!!busy} title="Full data, for working with the numbers"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5
                       text-[11.5px] font-black text-amber-700 hover:bg-amber-50 disabled:opacity-50">
            {busy === `${d}:xlsx` ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}Excel
          </button>
        </span>
      ) : (
        <span className="text-[11px] font-semibold text-slate-400">No prices saved</span>
      )}
    </li>
  );

  return (
    <>
      <button ref={btn} type="button" onClick={() => (open ? setPos(null) : place())} aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-4 py-2
                   text-[12.5px] font-black text-amber-700 shadow-sm hover:bg-amber-50 transition-all">
        <Download className="w-3.5 h-3.5" />Download report
      </button>
      {pos && createPortal(
        <div ref={panel} style={{ top: pos.top, left: pos.left, width: Math.min(PANEL_W, window.innerWidth - 16), maxHeight: pos.maxH }}
          className="fixed z-[60] flex flex-col rounded-2xl border border-amber-200 bg-white shadow-2xl shadow-amber-900/15 overflow-hidden">
          <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-amber-100 via-amber-50 to-orange-50 border-b border-amber-100">
            <p className="inline-flex items-center gap-1.5 text-[13px] font-black text-slate-800">
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />Daily {label.toLowerCase()} price comparison
            </p>
            <p className="text-[11px] font-medium text-amber-950/70">One report per day — that day’s prices only. PDF to read, Excel for the full data.</p>
            <div className="mt-2.5 inline-flex rounded-xl bg-white p-1 ring-1 ring-amber-200" role="tablist" aria-label="Report for">
              {PRODUCTS.map(x => (
                <button key={x.key} type="button" role="tab" aria-selected={product === x.key}
                  onClick={() => { setProduct(x.key); setErr(''); }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-black transition-colors ${
                    product === x.key ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm'
                                      : 'text-amber-800 hover:bg-amber-50'}`}>
                  <span aria-hidden>{x.icon}</span>{x.label}
                </button>
              ))}
            </div>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-slate-100">
            {week.map((d, i) => row(d, ago(i), i === 0 || saved.includes(d)))}
            {older.length > 0 && (
              <li className="px-4 pt-2.5 pb-1 text-[10.5px] font-black uppercase tracking-wide text-slate-400">Earlier saved days</li>
            )}
            {older.map(d => row(d, dayLabel(d), true))}
          </ul>
          {err && <p className="flex-shrink-0 px-4 py-2 border-t border-rose-100 bg-rose-50 text-[11.5px] font-semibold text-rose-700">{err}</p>}
        </div>,
        document.body,
      )}
    </>
  );
}

/* A button on the panel that opens its table in a pop-up over the page. */
function PopupButton({ icon: Icon, title, hint, children }: {
  icon: typeof Scale; title: string; hint: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="group w-full flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3
                   text-left hover:bg-amber-50 hover:shadow-sm transition-all">
        <span className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-amber-600" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-black text-slate-800">{title}</span>
          <span className="block text-[11.5px] font-semibold text-slate-500">{hint}</span>
        </span>
        <ArrowUpRight className="w-5 h-5 text-amber-500 group-hover:text-amber-700 flex-shrink-0" />
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-label={title}
            className="relative w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            <button type="button" onClick={() => setOpen(false)} title="Close"
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
            {children}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function Filter({ icon: Icon, label, children }: { icon: typeof CalendarDays; label: string; children: React.ReactNode }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <Icon className="w-4 h-4 text-amber-600" />
      <span className="text-[11.5px] font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function BrandDot({ brand }: { brand: string }) {
  return <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: BRAND_COLOUR[brand] ?? '#94a3b8' }} />;
}

function Card({ icon: Icon, title, aside, children }: {
  icon: typeof Scale; title: string; aside?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-amber-50/50">
        <Icon className="w-[18px] h-[18px] text-amber-600" />
        <p className="text-[14.5px] font-black text-slate-800">{title}</p>
        <div className="ml-auto">{aside}</div>
      </div>
      {children}
    </div>
  );
}

/* Which shops the prices come from. Only a shop that is really read is
   shown as live; the others say plainly that they are not connected, so
   nobody mistakes a blank for "no stock" or a missing price for a cheap one. */
function StoreStrip({ data }: { data: Dashboard }) {
  // Only connected shops are shown; one appears here once it is connected.
  const stores = (data.sources.stores ?? [{ store: data.sources.prices, live: true, reason: 'Live' }]).filter(s => s.live);
  const count = data.sources.status.reduce((n, s) => n + s.count, 0);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="text-[12px] font-black text-slate-700">Where these prices come from</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {stores.map(s => (
          <span key={s.store} title={s.reason}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-black ring-1 ${s.live
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-white text-slate-400 ring-slate-200'}`}>
            <span className={`w-2 h-2 rounded-full ${s.live ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            {s.store}
            <span className="font-semibold">{s.live ? `· live, ${count} products` : '· not connected'}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const MEDAL = ['bg-amber-400 text-white', 'bg-slate-300 text-slate-800', 'bg-orange-300 text-orange-900'];

/* The one question most people ask - "which brand is cheapest?" - answered
   for the chosen pack size, cheapest first, whoever that is. Packs differ in
   size, so the order is by what 100 g costs after the store's discount; the
   pack price, MRP and saving are shown beside it in plain words. */
function CheapestRanking({ data, cols }: { data: Dashboard; cols: string[] }) {
  const rows = cols.map(b => data.comparison.find(r => r.brand === b)).filter((r): r is Listing => !!r && !r.missing);
  if (!rows.length) return null;
  const best = rows[0];
  const max = Math.max(...rows.map(r => r.per_100g ?? 0), 1);
  const apis = rows.findIndex(r => r.brand === HOME);
  const noSize = data.comparison.filter(r => r.missing && r.reason === 'size').map(r => r.brand);
  return (
    <Card icon={Trophy} title={`Which ${data.product_noun ?? 'honey'} offers the best price? · around ${sizeLabel(data.size)}`}
      aside={<span className="text-[11.5px] font-semibold text-slate-500">best price first · price after discount</span>}>
      <div className="px-5 pt-4">
        <p className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 text-[14px] font-bold text-emerald-900 leading-snug">
          <Trophy className="inline w-4 h-4 mr-1.5 -mt-0.5 text-emerald-600" />
          {rows.length === 1 ? <>Only <b>{best.brand}</b> sells a pack near {sizeLabel(data.size)}</> : <>Best price today: <b>{best.brand}</b></>} — {best.pack_label} for <b>{rupees(best.price)}</b>, that is <b>{rupees(best.per_100g, 2)} for every 100 g</b>.
          {apis === 0 && ' That is APIS.'}
          {apis < 0 && noSize.includes(HOME) && <> APIS has no pack near {sizeLabel(data.size)} on Flipkart.</>}
          {apis > 0 && <> APIS comes <b>{ORDINAL[apis]} of {rows.length}</b>, costing {rupees((rows[apis].per_100g ?? 0) - (best.per_100g ?? 0), 2)} more per 100 g than {best.brand}.</>}
        </p>
      </div>
      <ol className="p-5 space-y-2.5">
        {rows.map((r, i) => {
          const more = (r.per_100g ?? 0) - (best.per_100g ?? 0);
          const save = r.mrp && r.price != null && r.mrp > r.price ? r.mrp - r.price : 0;
          return (
            <li key={r.brand} className={`rounded-2xl ring-1 p-3.5 ${r.brand === HOME ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-slate-200'}`}>
              <div className="flex flex-wrap items-center gap-4">
                <span className={`w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-black flex-shrink-0 ${MEDAL[i] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ORDINAL[i]}
                </span>
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  className="w-14 h-14 rounded-xl bg-white ring-1 ring-slate-100 flex items-center justify-center flex-shrink-0">
                  {r.image ? <img src={r.image} alt={r.title} loading="lazy" className="w-12 h-12 object-contain" /> : <Package className="w-6 h-6 text-amber-500" />}
                </a>
                <div className="min-w-[12rem] flex-1">
                  <p className="flex items-center gap-2 text-[16px] font-black text-slate-900">
                    <BrandDot brand={r.brand} />{r.brand}
                    {r.brand === HOME && <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide text-amber-800">Ours</span>}
                    {!r.in_stock && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-600">Out of stock</span>}
                  </p>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" title={r.title}
                    className="block truncate max-w-[26rem] text-[11.5px] text-slate-500 hover:text-amber-700">{r.title}</a>
                  <p className="mt-0.5 text-[11.5px] font-bold text-slate-600">Pack: {r.pack_label} · on {r.source}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">You pay</p>
                  <p className="text-[20px] font-black text-slate-900 leading-none">{rupees(r.price)}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {save > 0
                      ? <>MRP <s>{rupees(r.mrp)}</s> · <b className="text-emerald-700">save {rupees(save)} ({Math.round(r.discount_pct ?? 0)}% off)</b></>
                      : 'No discount'}
                  </p>
                </div>
                <div className="w-44 text-right">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Cost of 100 g</p>
                  <p className={`text-[20px] font-black leading-none ${i === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>{rupees(r.per_100g, 2)}</p>
                  <p className={`mt-1 text-[11px] font-bold ${i === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {i === 0 ? 'Best price' : `${rupees(more, 2)} more than ${best.brand}`}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 h-2 rounded-full bg-slate-100 overflow-hidden" title={`${r.brand}: ${rupees(r.per_100g, 2)} per 100 g`}>
                <div className="h-full rounded-full" style={{ width: `${((r.per_100g ?? 0) / max) * 100}%`, background: BRAND_COLOUR[r.brand] ?? '#94a3b8' }} />
              </div>
            </li>
          );
        })}
      </ol>
      <p className="px-5 pb-4 text-[11px] text-slate-500">
        How to read this: packs come in different sizes, so we work out what <b>100 g</b> costs after the store’s discount — lower means better value for the buyer.
        Each brand’s pack nearest {sizeLabel(data.size)} is used; change “Compare at” to see 250 g or 1 kg. Click a product to open the real listing.
        {noSize.length > 0 && <> Not in this comparison — no pack near {sizeLabel(data.size)}: {noSize.join(', ')}.</>}
      </p>
    </Card>
  );
}

/* Standard sizes down the side, brands across, a real price in every cell. */
function SizeTable({ data, cols, missing }: { data: Dashboard; cols: string[]; missing: string[] }) {
  return (
    <Card icon={Scale} title={`${data.product_label ?? 'Honey'} prices by pack size`}
      aside={<span className="mr-9 text-[11.5px] font-semibold text-slate-500">Brands sorted by best price · per 100 g</span>}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="sticky left-0 z-10 bg-white text-left px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-400 w-24">Size</th>
              {cols.map(b => (
                <th key={b} className={`px-4 py-3 text-left min-w-[10rem] ${b === HOME ? 'bg-amber-50' : ''}`}>
                  <span className="inline-flex items-center gap-2 text-[13.5px] font-black text-slate-800"><BrandDot brand={b} />{b}</span>
                  {b === HOME && <span className="ml-2 rounded-full bg-amber-200/70 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide text-amber-800">Ours</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map(r => {
              const shown = cols.filter(b => r.cells[b]);
              const low = Math.min(...shown.map(b => r.cells[b].per_100g ?? Infinity));
              return (
                <tr key={r.grams} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="sticky left-0 z-10 bg-white text-left px-5 py-4 text-[15px] font-black text-slate-900">{r.label}</th>
                  {cols.map(b => {
                    const c = r.cells[b];
                    if (!c) return <td key={b} className={`px-4 py-4 text-[12px] text-slate-400 ${b === HOME ? 'bg-amber-50' : ''}`}>No pack near this size</td>;
                    const best = shown.length > 1 && c.per_100g === low;
                    return (
                      <td key={b} className={`px-4 py-3 ${best ? 'bg-emerald-50' : b === HOME ? 'bg-amber-50' : ''}`}>
                        <a href={c.url} target="_blank" rel="noopener noreferrer" title={c.title} className="group flex items-center gap-3">
                          {c.image && <img src={c.image} alt="" loading="lazy" className="w-11 h-11 object-contain rounded-lg bg-white ring-1 ring-slate-100 flex-shrink-0" />}
                          <span className="min-w-0">
                            <span className="flex items-baseline gap-1.5">
                              <span className="text-[17px] font-black text-slate-900 group-hover:text-amber-700">{rupees(c.price)}</span>
                              {c.mrp && c.mrp > (c.price ?? 0) && <s className="text-[11px] text-slate-400">{rupees(c.mrp)}</s>}
                            </span>
                            <span className="block text-[12px] font-bold text-slate-600">{rupees(c.per_100g, 2)} / 100 g</span>
                            <span className="mt-0.5 inline-flex items-center gap-1">
                              <span className={`rounded-md px-1.5 py-px text-[10.5px] font-bold ${c.exact ? 'bg-slate-100 text-slate-600' : 'bg-white ring-1 ring-slate-200 text-slate-500'}`}
                                title={c.exact ? undefined : `${b} doesn't sell ${r.label} on Flipkart — its nearest pack`}>
                                {c.exact ? c.pack_label : `≈ ${c.pack_label}`}
                              </span>
                              {best && <span className="inline-flex items-center gap-0.5 text-[10.5px] font-black text-emerald-700"><Trophy className="w-3 h-3" />Lowest</span>}
                            </span>
                          </span>
                        </a>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-2.5 text-[11px] text-slate-400 border-t border-slate-100">
        Every cell is a real Flipkart price. “≈” means the brand doesn’t sell that exact size, so its nearest pack is shown — compare those by ₹ / 100 g.
        Green marks the lowest price per 100 g in each row.{missing.length > 0 && ` Not on Flipkart today: ${missing.join(', ')}.`}
      </p>
    </Card>
  );
}

/* Every listing found, in one sortable table. */
type SortKey = 'per_100g' | 'price' | 'pack_grams' | 'brand';
function AllPrices({ data, cols }: { data: Dashboard; cols: string[] }) {
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'per_100g', asc: true });
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(() => {
    const all = cols.flatMap(b => data.all_listings[b] ?? []);
    const v = (l: Listing) => (sort.key === 'brand' ? l.brand : (l[sort.key] ?? 0));
    return all.sort((a, b) => {
      const x = v(a), y = v(b);
      const c = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number);
      return (sort.asc ? c : -c) || (a.per_100g ?? 0) - (b.per_100g ?? 0);
    });
  }, [data, cols, sort]);
  const visible = showAll ? rows : rows.slice(0, 10);
  const head = (key: SortKey, label: string, right = false) => (
    <th className={`px-4 py-2.5 whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
      <button type="button" onClick={() => setSort(s => ({ key, asc: s.key === key ? !s.asc : true }))}
        className={`inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide ${sort.key === key ? 'text-amber-700' : 'text-slate-400 hover:text-slate-600'}`}>
        {label}{sort.key === key && (sort.asc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    </th>
  );
  return (
    <Card icon={Package} title={`All ${data.product_noun ?? 'honey'} prices on Flipkart ${data.is_live ? 'today' : `· ${dayLabel(data.day)}`}`}
      aside={<span className="mr-9 text-[11.5px] font-semibold text-slate-500">{rows.length} listings · click a heading to sort</span>}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-2.5 w-10 text-left text-[11px] font-black text-slate-400">#</th>
              {head('brand', 'Brand')}
              <th className="px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-wide text-slate-400">Product</th>
              {head('pack_grams', 'Pack', true)}
              {head('price', 'Price', true)}
              <th className="px-4 py-2.5 text-right text-[11px] font-black uppercase tracking-wide text-slate-400 whitespace-nowrap">MRP</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-black uppercase tracking-wide text-slate-400 whitespace-nowrap">Off</th>
              {head('per_100g', '₹/100g', true)}
            </tr>
          </thead>
          <tbody>
            {visible.map((l, i) => (
              <tr key={l.product_id} className={`border-b border-slate-50 last:border-0 ${l.brand === HOME ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                <td className="px-4 py-2.5 text-[11.5px] font-bold text-slate-400">{i + 1}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-2 font-black text-slate-800"><BrandDot brand={l.brand} />{l.brand}</span>
                </td>
                {/* w-full + max-w-0: the column takes whatever width is left and the
                    name is cut off with "…" inside it, instead of running under Pack. */}
                <td className="px-4 py-2.5 w-full max-w-0">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" title={l.title}
                    className="group flex items-center gap-1 min-w-0 text-slate-600 hover:text-amber-700">
                    <span className="truncate">{l.title}</span><ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                  </a>
                </td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-700 whitespace-nowrap">{l.pack_label}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap font-black text-slate-900">{rupees(l.price)}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap text-slate-400">{l.mrp && l.mrp > (l.price ?? 0) ? <s>{rupees(l.mrp)}</s> : rupees(l.mrp)}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap text-emerald-700 font-bold">{l.discount_pct ? `${Math.round(l.discount_pct)}%` : '—'}</td>
                <td className="px-4 py-2.5 text-right font-black text-slate-900 whitespace-nowrap">{rupees(l.per_100g, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 10 && (
        <button type="button" onClick={() => setShowAll(v => !v)}
          className="w-full py-2.5 text-[12.5px] font-black text-amber-700 hover:bg-amber-50 border-t border-slate-100">
          {showAll ? 'Show fewer' : `Show all ${rows.length} listings`}
        </button>
      )}
    </Card>
  );
}

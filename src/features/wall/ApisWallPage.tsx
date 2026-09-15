/* APIS Wall — a photo wall of real team moments, events and celebrations.

   The 8 seed photos ship with the build in public/Apis_wall/ and are not user
   content: nobody uploaded them, so there is nothing to attribute or approve
   and they always show.

   Everything else comes from the `wall` Django app. An upload is stored on the
   server, attributed to whoever is signed in, and held back until a superadmin
   approves it — a photograph is opaque in a way a form field is not, so
   somebody has to actually look at it before it goes on the company's wall.
   Until then the uploader sees their own photo marked "Awaiting approval" and
   nobody else sees it at all.

   Seed-photo captions/categories are hand-written to match each photo's actual
   content; dates are intentionally omitted rather than guessed, since none of
   the source files carry capture-date metadata. */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronRight, X, Sparkles, Image as ImageIcon, PartyPopper, Users, HeartHandshake, Plus, UploadCloud } from 'lucide-react';
import { onTilt3dMove, onTilt3dLeave } from '../../ui';
import { apiFetch } from '../portal/session';

interface WallPhoto {
  src: string; title: string; category: string;
  /* Absent on the seed photos, which are part of the build rather than
     anything a person uploaded. */
  id?: number;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  submittedBy?: string;
  reviewNote?: string;
  isMine?: boolean;
}

const WALL_API = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/wall`;
const UPLOAD_CATEGORIES = ['Celebrations', 'Team Moments', 'CSR', 'Events', 'Other'];

const SEED_PHOTOS: WallPhoto[] = [
  { src: '/Apis_wall/Apiswall01.jpeg', title: 'Happy Independence Day', category: 'Celebrations' },
  { src: '/Apis_wall/Apiswall02.jpeg', title: 'Community Outreach Drive', category: 'CSR' },
  { src: '/Apis_wall/Apiswall03.jpeg', title: 'Office Birthday Celebration', category: 'Celebrations' },
  { src: '/Apis_wall/Apiswall04.jpeg', title: 'Birthday Surprise', category: 'Celebrations' },
  { src: '/Apis_wall/Apiswall05.jpeg', title: 'Team Lunch Together', category: 'Team Moments' },
  { src: '/Apis_wall/Apiswall06.jpeg', title: 'Birthday Wishes', category: 'Celebrations' },
  { src: '/Apis_wall/Apiswall07.jpeg', title: 'Lunch Break Bonding', category: 'Team Moments' },
  { src: '/Apis_wall/Apiswall08.jpeg', title: 'Cutting the Cake', category: 'Celebrations' },
];

/* One accent per category — drives the filter pill, the chip on each tile,
   and the lightbox footer, so the same category always reads the same
   colour everywhere on the page. */
const CATEGORY_STYLE: Record<string, { icon: typeof PartyPopper; chip: string; dot: string; pillActive: string }> = {
  'Celebrations':  { icon: PartyPopper,   chip: 'bg-amber-500/90 text-white',  dot: 'bg-amber-400',  pillActive: 'bg-amber-500 shadow-amber-500/30' },
  'Team Moments':  { icon: Users,         chip: 'bg-sky-500/90 text-white',    dot: 'bg-sky-400',    pillActive: 'bg-sky-500 shadow-sky-500/30' },
  'CSR':           { icon: HeartHandshake, chip: 'bg-emerald-500/90 text-white', dot: 'bg-emerald-400', pillActive: 'bg-emerald-500 shadow-emerald-500/30' },
};
const styleFor = (cat: string) => CATEGORY_STYLE[cat] ?? { icon: ImageIcon, chip: 'bg-slate-500/90 text-white', dot: 'bg-slate-400', pillActive: 'bg-slate-600 shadow-slate-500/30' };

const uploadFieldCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all';
const uploadLabelCls = 'block text-[11.5px] font-bold text-slate-600 mb-1.5';

export function ApisWallPage({ isSuperadmin = false }: { isSuperadmin?: boolean } = {}) {
  /* Uploaded photos are kept apart from the seed ones rather than merged into
     a single state: the seeds are build assets with no id and no approval
     state, and mixing them would mean every render having to work out which
     kind each photo is. */
  const [uploaded, setUploaded] = useState<WallPhoto[]>([]);
  const [filter, setFilter] = useState('All');
  const [lightbox, setLightbox] = useState<WallPhoto | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await apiFetch(`${WALL_API}/photos/`);
        if (alive && r.ok) setUploaded((await r.json()) as WallPhoto[]);
      } catch {
        /* The wall still works from its seed photos if the server is down. */
      }
    })();
    return () => { alive = false; };
  }, []);

  const photos = [...uploaded, ...SEED_PHOTOS];
  const categoryList = Array.from(new Set(photos.map(p => p.category)));
  const categories = ['All', ...categoryList];
  const filtered = filter === 'All' ? photos : photos.filter(p => p.category === filter);
  const countFor = (c: string) => c === 'All' ? photos.length : photos.filter(p => p.category === c).length;
  const awaiting = uploaded.filter(p => p.moderationStatus === 'pending');

  function resetUploadForm() {
    // Same reason as the file picker below: dropping the reference without
    // revoking it leaves the blob held for the life of the page.
    setPreviewSrc(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get('title') ?? '').trim();
    const file = fileInputRef.current?.files?.[0];
    if (!title || !file) {
      setError('Add a title and choose a photo.');
      return;
    }

    // Rebuilt rather than posting the form's own FormData: the field names
    // the API expects are not all the names on the form, and the file input
    // is read through its ref.
    const body = new FormData();
    body.append('title', title);
    body.append('category', String(fd.get('category') ?? '').trim() || 'Other');
    body.append('caption', String(fd.get('caption') ?? '').trim());
    body.append('image', file);

    setBusy(true);
    setError('');
    try {
      const res = await apiFetch(`${WALL_API}/photos/`, { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not upload that photo. Please try again.');
        return;
      }
      setUploaded(prev => [data as WallPhoto, ...prev]);
      setNotice(data.message || '');
      setUploadOpen(false);
      resetUploadForm();
      form.reset();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(photo: WallPhoto) {
    if (!photo.id) return;
    try {
      const res = await apiFetch(`${WALL_API}/photos/${photo.id}/`, { method: 'DELETE' });
      if (res.ok) {
        setUploaded(prev => prev.filter(p => p.id !== photo.id));
        setLightbox(null);
      }
    } catch {
      setError('Could not remove that photo.');
    }
  }

  return (
    <div className="min-h-full bg-[#fdfbf6] relative">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ih-drift absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-amber-300/20 blur-[130px]" />
        <div className="ih-aurora absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-orange-300/15 blur-[130px]" />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-6 py-5 space-y-6">
        {/* breadcrumb */}
        <div className="ih-fade flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
          <span>Apps</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-amber-600">APIS Wall</span>
        </div>

        {/* hero header */}
        <div className="ih-reveal ih-sweep relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-amber-50/60
                        border border-amber-100 shadow-sm p-6 md:p-8">
          <div className="ih-drift pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-300/25 blur-[100px]" />
          <div className="ih-aurora pointer-events-none absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-orange-200/25 blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(rgba(180,83,9,.7) 1px,transparent 1px),linear-gradient(90deg,rgba(180,83,9,.7) 1px,transparent 1px)',
                     backgroundSize: '40px 40px' }} />
          {/* little bee, floating in the corner — a small realism touch
              matching the reference mockup's mascot, not just a stock icon */}
          <span aria-hidden className="ih-float absolute top-6 right-8 text-4xl select-none drop-shadow-sm" style={{ animationDelay: '400ms' }}>🐝</span>

          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="ih-border-flow ih-float relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">APIS Wall</h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white ring-1 ring-amber-200 text-[10px] font-black text-amber-600">
                    <ImageIcon className="w-3 h-3" />{photos.length} memories
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">Moments, events and memories — all in one place.</p>
                <p className="text-[11px] text-amber-600/70 font-semibold mt-1">
                  Explore the journey of APIS through events, celebrations, team activities and more.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* category filter pills, each carrying its own live count */}
              <div className="flex items-center gap-2 flex-wrap">
                {categories.map(c => {
                  const active = filter === c;
                  const s = c === 'All' ? null : styleFor(c);
                  return (
                    <button key={c} onClick={() => setFilter(c)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-black transition-all ${
                        active
                          ? `text-white shadow-md ${s?.pillActive ?? 'bg-amber-500 shadow-amber-500/30'}`
                          : 'bg-white text-slate-500 border border-slate-200 hover:border-amber-300 hover:text-amber-600'}`}>
                      {s && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : s.dot}`} />}
                      {c}
                      <span className={`text-[10px] font-bold ${active ? 'text-white/80' : 'text-slate-400'}`}>{countFor(c)}</span>
                    </button>
                  );
                })}
              </div>

              <button onClick={() => setUploadOpen(true)}
                className="ih-sheen flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600
                           hover:from-amber-600 hover:to-orange-700 text-white text-[12px] font-black shadow-md shadow-amber-500/30 transition-all">
                <Plus className="w-3.5 h-3.5" />Upload Image
              </button>
            </div>
          </div>
        </div>

        {notice && (
          <div className="ih-fade flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-[12.5px] font-bold text-amber-800">
            <UploadCloud className="w-4 h-4 shrink-0 mt-px" />
            <span className="flex-1">{notice}</span>
            <button type="button" onClick={() => setNotice('')} title="Dismiss"
              className="shrink-0 text-amber-500 hover:text-amber-700"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {isSuperadmin && awaiting.length > 0 && (
          <div className="ih-fade flex items-center gap-2 rounded-2xl bg-sky-50 border border-sky-200 px-4 py-3 text-[12.5px] font-bold text-sky-800">
            <ImageIcon className="w-4 h-4 shrink-0" />
            {awaiting.length} photo{awaiting.length === 1 ? '' : 's'} waiting for your approval — review {awaiting.length === 1 ? 'it' : 'them'} in Admin Console › Dashboard Content.
          </div>
        )}

        {/* masonry photo wall — CSS columns, not a fixed-row grid, so every
            photo keeps its own real size/aspect ratio instead of being
            cropped to a uniform tile. */}
        <div className="[column-count:1] sm:[column-count:2] lg:[column-count:3] xl:[column-count:4] [column-gap:1rem]">
          {filtered.map((p, i) => {
            const s = styleFor(p.category);
            const CatIcon = s.icon;
            const pending = p.moderationStatus === 'pending';
            const rejected = p.moderationStatus === 'rejected';
            return (
              <button key={p.id ? `u${p.id}` : p.src} onClick={() => setLightbox(p)}
                onMouseMove={onTilt3dMove} onMouseLeave={onTilt3dLeave}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`ih-pop-in ih-tilt3d group relative block w-full mb-4 break-inside-avoid rounded-2xl overflow-hidden
                           bg-white shadow-sm hover:shadow-2xl transition-all text-left ${
                  pending ? 'border-2 border-dashed border-amber-300'
                    : rejected ? 'border-2 border-rose-200' : 'border border-slate-200'}`}>
                <img src={p.src} alt={p.title} loading="lazy"
                  className={`w-full h-auto block transition-transform duration-500 group-hover:scale-105 ${
                    pending ? 'opacity-60' : ''}`} />
                {(pending || rejected) && (
                  <span className={`absolute top-10 left-2.5 z-10 px-2 py-1 rounded-lg text-[9.5px] font-black uppercase
                                    tracking-wide shadow-sm ${pending ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {pending ? 'Awaiting approval' : 'Not approved'}
                  </span>
                )}
                {/* permanent scrim so captions stay legible on bright photos,
                    strengthening further on hover rather than appearing from nothing */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent
                                opacity-90 group-hover:opacity-100 transition-opacity" />
                <span className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9.5px] font-black
                                  uppercase tracking-wide shadow-sm backdrop-blur-sm ${s.chip}`}>
                  <CatIcon className="w-2.5 h-2.5" />{p.category}
                </span>
                <div className="absolute bottom-2.5 left-2.5 right-2.5 transition-transform duration-300 group-hover:-translate-y-0.5">
                  <p className="text-[12.5px] font-black text-white leading-snug drop-shadow">{p.title}</p>
                  {p.submittedBy && (
                    <p className="text-[10px] font-bold text-white/70 drop-shadow mt-0.5">
                      {pending && p.isMine ? 'Your upload — visible only to you until approved'
                        : `Uploaded by ${p.submittedBy}`}
                    </p>
                  )}
                </div>
                {isSuperadmin && p.id && (
                  <span role="button" tabIndex={0}
                    onClick={ev => { ev.stopPropagation(); void removePhoto(p); }}
                    onKeyDown={ev => { if (ev.key === 'Enter') { ev.stopPropagation(); void removePhoto(p); } }}
                    title="Remove this photo from the wall"
                    className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg bg-white/90 text-rose-500 opacity-0
                               group-hover:opacity-100 hover:bg-white hover:text-rose-600 transition-all shadow-sm cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-16">No photos in this category yet.</p>
        )}

        <div className="h-2" />
      </div>

      {/* lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} title="Close"
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
            <X className="w-5 h-5" />
          </button>
          <div onClick={e => e.stopPropagation()} className="ih-pop-in max-w-4xl max-h-[85vh] flex flex-col items-center">
            <img src={lightbox.src} alt={lightbox.title} className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl object-contain" />
            <div className="mt-4 flex items-center gap-2 text-white">
              <span className={`w-2 h-2 rounded-full ${styleFor(lightbox.category).dot}`} />
              <p className="font-black text-sm">{lightbox.title}</p>
              <span className="text-white/50 text-[11px] font-bold">· {lightbox.category}</span>
            </div>
          </div>
        </div>
      )}

      {/* upload image */}
      {uploadOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => { setUploadOpen(false); resetUploadForm(); }}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleUpload}
            className="ih-pop-in relative w-full max-w-md max-h-[85vh] overflow-y-auto ih-scroll-clean flex flex-col
                       rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
              <p className="text-[14px] font-black text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-500" />Upload Image
              </p>
              <button type="button" onClick={() => { setUploadOpen(false); resetUploadForm(); }} title="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className={uploadLabelCls}>Caption / Title <span className="text-rose-500">*</span></label>
                <input name="title" required placeholder="e.g. Diwali Celebration 2026" className={uploadFieldCls} />
              </div>
              <div>
                <label className={uploadLabelCls}>Category</label>
                <select name="category" defaultValue="Celebrations" className={uploadFieldCls}>
                  {UPLOAD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={uploadLabelCls}>Description <span className="text-slate-400 font-semibold">(optional)</span></label>
                <input name="caption" placeholder="A line about this moment" className={uploadFieldCls} />
              </div>
              <div>
                <label className={uploadLabelCls}>Photo <span className="text-rose-500">*</span></label>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed transition-all text-left
                             ${previewSrc ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'}`}>
                  {previewSrc ? (
                    <img src={previewSrc} alt="Preview" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <UploadCloud className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                  <span className={`text-sm font-bold truncate ${previewSrc ? 'text-amber-700' : 'text-slate-400'}`}>
                    {previewSrc ? 'Photo selected — click to change' : 'Click to choose a photo…'}
                  </span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                  required className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    // Release the previous preview before replacing it.
                    // Picking a different file repeatedly otherwise leaks a
                    // blob of the full image each time, and these are photos.
                    setPreviewSrc(prev => {
                      if (prev) URL.revokeObjectURL(prev);
                      return f ? URL.createObjectURL(f) : '';
                    });
                  }} />
                <p className="text-[10.5px] text-slate-400 font-semibold mt-1.5">JPG, PNG, WebP or GIF · up to 8 MB</p>
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-[12px] font-bold text-rose-700">{error}</p>
              )}
              {/* Said before they upload rather than after, so the wait is
                  expected rather than looking like the upload failed. */}
              {!isSuperadmin && (
                <p className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-[11.5px] font-semibold text-slate-500">
                  Your photo goes to the administrator for approval before it appears on the wall.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-slate-100 bg-slate-50">
              <button type="button" disabled={busy}
                onClick={() => { setUploadOpen(false); resetUploadForm(); }}
                className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 text-[13px] font-bold transition-all disabled:opacity-60">
                Cancel
              </button>
              <button type="submit" disabled={busy}
                className="ih-sheen inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600
                           hover:from-amber-600 hover:to-orange-700 text-white text-[13px] font-black shadow-md shadow-amber-200
                           transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" />{busy ? 'Uploading…' : isSuperadmin ? 'Add to Wall' : 'Send for Approval'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ApisWallPage;

/* Showing what was attached to a message.
 *
 * Every file here is fetched with the session token and handed to the
 * browser as a blob, because the token lives in an Authorization header
 * and an <img src> cannot carry one. The alternative -- a URL that works
 * without it -- is a link anybody could forward out of the conversation.
 */
import { useEffect, useRef, useState } from 'react';
import { Download, FileText, ImageOff, Loader, X } from 'lucide-react';
import { attachmentBlob, downloadAttachment, readableSize, type Attachment } from './api';

/* An <img> for a file only this conversation may read. The object URL is
   released when the message scrolls out of the tree, so a long thread full
   of photos does not hold every one of them in memory for the session. */
function AuthImage({ id, alt, className, onClick }: {
  id: number; alt: string; className?: string; onClick?: () => void;
}) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const made = useRef('');

  useEffect(() => {
    let alive = true;
    attachmentBlob(id)
      .then(u => {
        if (!alive) { URL.revokeObjectURL(u); return; }
        made.current = u;
        setUrl(u);
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => {
      alive = false;
      if (made.current) URL.revokeObjectURL(made.current);
    };
  }, [id]);

  if (failed) {
    return (
      <div className={`flex items-center gap-2 text-[11.5px] text-slate-400 px-3 py-6 ${className ?? ''}`}>
        <ImageOff className="w-4 h-4" />This photo could not be loaded.
      </div>
    );
  }
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 ${className ?? ''}`} style={{ minHeight: 120 }}>
        <Loader className="w-4 h-4 text-slate-400 animate-spin" />
      </div>
    );
  }
  return <img src={url} alt={alt} onClick={onClick} className={className} loading="lazy" />;
}

export function AttachmentList({ items, mine }: { items: Attachment[]; mine: boolean }) {
  const [full, setFull] = useState<Attachment | null>(null);
  if (!items.length) return null;
  const photos = items.filter(a => a.kind === 'image');
  const files = items.filter(a => a.kind !== 'image');

  return (
    <>
      {photos.length > 0 && (
        <div className={`grid gap-1.5 mb-1 ${photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {photos.map(a => (
            <button key={a.id} type="button" onClick={() => setFull(a)}
              title={`${a.name} · ${readableSize(a.size)}`}
              className="block overflow-hidden rounded-xl bg-slate-100">
              <AuthImage id={a.id} alt={a.name}
                className="w-full max-h-64 object-cover cursor-zoom-in hover:opacity-95 transition-opacity" />
            </button>
          ))}
        </div>
      )}

      {files.map(a => (
        <button key={a.id} type="button" onClick={() => void downloadAttachment(a)}
          title={`Download ${a.name}`}
          className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 mb-1 text-left transition-colors
            ${mine ? 'bg-white/15 hover:bg-white/25' : 'bg-slate-50 hover:bg-slate-100 ring-1 ring-slate-200'}`}>
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
            ${mine ? 'bg-white/20' : 'bg-white ring-1 ring-slate-200'}`}>
            <FileText className={`w-4 h-4 ${mine ? 'text-white' : 'text-slate-500'}`} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-[12.5px] font-bold ${mine ? 'text-white' : 'text-slate-800'}`}>
              {a.name}</span>
            <span className={`block text-[10.5px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>
              {readableSize(a.size)}</span>
          </span>
          <Download className={`w-3.5 h-3.5 flex-shrink-0 ${mine ? 'text-white/80' : 'text-slate-400'}`} />
        </button>
      ))}

      {full && <Lightbox attachment={full} onClose={() => setFull(null)} />}
    </>
  );
}

function Lightbox({ attachment, onClose }: { attachment: Attachment; onClose: () => void }) {
  /* Escape closes it. A full-screen overlay with no keyboard way out is
     the kind of thing people reload the page to escape. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-sm flex flex-col" onClick={onClose}>
      <div className="flex items-center gap-3 p-3 text-white/90" onClick={e => e.stopPropagation()}>
        <p className="truncate text-[13px] font-bold">{attachment.name}</p>
        <span className="text-[11.5px] text-white/60">{readableSize(attachment.size)}</span>
        <button type="button" onClick={() => void downloadAttachment(attachment)}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10
                     hover:bg-white/20 text-[12px] font-black">
          <Download className="w-3.5 h-3.5" />Download
        </button>
        <button type="button" onClick={onClose} title="Close"
          className="p-1.5 rounded-lg hover:bg-white/15"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-4" onClick={onClose}>
        <AuthImage id={attachment.id} alt={attachment.name}
          className="max-w-full max-h-full object-contain rounded-xl" />
      </div>
    </div>
  );
}

/* What is about to be sent, before it is sent. */
export function Pending({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  if (!files.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-3 pt-3">
      {files.map((f, i) => (
        <span key={`${f.name}-${i}`}
          className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-xl bg-amber-50
                     ring-1 ring-amber-200 text-[11.5px] font-bold text-amber-800 max-w-[14rem]">
          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{f.name}</span>
          <span className="text-amber-500 flex-shrink-0">{readableSize(f.size)}</span>
          <button type="button" onClick={() => onRemove(i)} title="Remove"
            className="p-0.5 rounded hover:bg-amber-200/60 flex-shrink-0"><X className="w-3 h-3" /></button>
        </span>
      ))}
    </div>
  );
}

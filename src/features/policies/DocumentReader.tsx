/* The read-only document reader: a policy shown in place, with no Download,
 * Print or Save button. Used by Policies & Guidelines and by the home
 * page's Announcements, so a document opens the same way from either.
 *
 * The server sends the PDF marked `inline` (see the policies views module)
 * and the frame asks the browser's PDF viewer for #toolbar=0, which is
 * where its Download, Print and Save buttons are.
 *
 * The bytes are fetched rather than handed to the frame as a URL, for two
 * reasons. The reader endpoint checks who is asking, and the portal's
 * session lives in an Authorization header, which a frame's own request
 * would not carry — so an upload still awaiting approval would not open for
 * the person who uploaded it. And a blob URL belongs to this tab alone:
 * there is no address in the frame worth copying or passing on.
 *
 * It is a closed door, not a locked one — the file has to reach the browser
 * to be read at all, so anyone determined can still get at it. What this
 * stops is the copy taken in passing, which is the one that goes stale in
 * somebody's Downloads folder and gets forwarded a year later.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Loader2, X } from 'lucide-react';
import { apiFetch } from '../portal/session';
import { policyHref, type ReaderDoc } from './policyHref';

/* Switches off the browser PDF viewer's own toolbar — the strip carrying
   Download, Print and Save — and opens the page fitted to the frame's width.
   Honoured by Chrome, Edge and Firefox; Safari ignores it and shows its own
   controls, so this is one layer of the "read it here" behaviour, not the
   whole of it. */
const READER_VIEW = '#toolbar=0&navpanes=0&statusbar=0&view=FitH';


/* Mount with the document to show; unmount (or call onClose) to close it.
   The frame carries no controls of its own, so the way out is the Back
   button, Escape, or a click on the backdrop. */
export function DocumentReader({ doc, onClose }: { doc: ReaderDoc; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let blobUrl = '';
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch(policyHref(doc.file));
        if (!r.ok) throw new Error(String(r.status));
        const blob = await r.blob();
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);
        setUrl(blobUrl);
      } catch {
        if (!cancelled) setError("That document couldn't be opened. Please try again, or ask P & C.");
      }
    })();
    return () => { cancelled = true; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [doc.file]);

  /* Escape closes the reader, since the frame swallows most clicks. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
      <div onClick={e => e.stopPropagation()} onContextMenu={e => e.preventDefault()}
        className="ih-pop-in relative w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl bg-white
                   shadow-[0_60px_120px_-30px_rgba(0,0,0,.5)] ring-1 ring-black/5 overflow-hidden">
        <div className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50">
          <button type="button" onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white text-slate-700 ring-1 ring-slate-200
                       hover:bg-slate-100 text-[12px] font-black transition-all flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />Back
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black text-slate-900 truncate">{doc.title}</p>
            <p className="text-[11px] font-bold text-slate-400">Read-only · please don't save or circulate copies</p>
          </div>
          <button type="button" onClick={onClose} title="Close"
            className="w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-600
                       flex items-center justify-center transition-all flex-shrink-0">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-slate-50 px-6 text-center">
            <FileText className="w-8 h-8 text-slate-300" />
            <p className="text-[13px] font-bold text-slate-500">{error}</p>
          </div>
        ) : url ? (
          <iframe src={`${url}${READER_VIEW}`} title={doc.title}
            className="flex-1 w-full border-0 bg-slate-100" />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-slate-50">
            <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
            <p className="text-[12px] font-bold text-slate-400">Opening…</p>
          </div>
        )}
      </div>
    </div>
  );
}

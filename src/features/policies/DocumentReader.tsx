/* The read-only document reader: a policy shown in place, with no Download,
 * Print or Save button. Used by Policies & Guidelines and by the home
 * page's Announcements, so a document opens the same way from either.
 * Every document is a PDF by the time it gets here — uploads in other
 * formats are converted on the server (see the policies views module).
 *
 * The pages are drawn by PDF.js onto canvases in this page, not handed to
 * the browser's own PDF viewer in a frame. That viewer has a right-click
 * menu of its own, with "Save as…" and "Print…" on it, and nothing a page
 * does can switch that menu off — #toolbar=0 only ever hid its toolbar.
 * Drawn here, there is no PDF on the page to save: the right-click menu is
 * ours to suppress, and Ctrl+S / Ctrl+P and printing are caught below.
 *
 * The bytes are fetched rather than loaded from a URL, because the reader
 * endpoint checks who is asking and the portal's session lives in an
 * Authorization header — so an upload still awaiting approval opens for
 * the person who uploaded it.
 *
 * It is a closed door, not a locked one — the file has to reach the browser
 * to be read at all, so anyone determined can still get at it (a screenshot
 * always works). What this stops is the copy taken in passing, which is the
 * one that goes stale in somebody's Downloads folder and gets forwarded a
 * year later.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, FileText, Loader2, X } from 'lucide-react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { apiFetch } from '../portal/session';
import { policyHref, type ReaderDoc } from './policyHref';

/* PDF.js is loaded the first time a document is opened, not with the page:
   the home page carries this reader too, and most visits open nothing. */
async function loadPdfJs() {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

/* Gap around and between pages, in CSS pixels. */
const PAGE_GAP = 16;

/* Mount with the document to show; unmount (or call onClose) to close it.
   The way out is the Back button, Escape, or a click on the backdrop. */
export function DocumentReader({ doc, onClose }: { doc: ReaderDoc; onClose: () => void }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState('');
  const onRenderError = useCallback(
    () => setError("That document couldn't be shown. Please try again, or ask P & C."), []);

  useEffect(() => {
    let cancelled = false;
    // Destroying the loading task frees the parsed document and its worker.
    let loading: PDFDocumentLoadingTask | null = null;
    (async () => {
      try {
        const r = await apiFetch(policyHref(doc.file));
        if (!r.ok) throw new Error(String(r.status));
        const [data, pdfjs] = await Promise.all([r.arrayBuffer().then(b => new Uint8Array(b)), loadPdfJs()]);
        if (cancelled) return;
        loading = pdfjs.getDocument({ data });
        const loaded = await loading.promise;
        if (!cancelled) setPdf(loaded);
      } catch {
        if (!cancelled) setError("That document couldn't be opened. Please try again, or ask P & C.");
      }
    })();
    return () => { cancelled = true; if (loading) void loading.destroy(); };
  }, [doc.file]);

  /* Escape closes the reader. Ctrl/Cmd+S and Ctrl/Cmd+P would save or print
     this page — with the document drawn on it — so they do nothing while
     the reader is open. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'p')) e.preventDefault();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      {/* Printing from the browser's menu prints a blank page, not the document. */}
      <style>{'@media print { body { display: none !important; } }'}</style>
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
      <div onClick={e => e.stopPropagation()} onContextMenu={e => e.preventDefault()}
        onDragStart={e => e.preventDefault()}
        className="ih-pop-in relative w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl bg-white
                   shadow-[0_60px_120px_-30px_rgba(0,0,0,.5)] ring-1 ring-black/5 overflow-hidden select-none">
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
        ) : pdf ? (
          <PdfPages pdf={pdf} onError={onRenderError} />
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

/* Every page, top to bottom, fitted to the reader's width and redrawn
   sharp when that width changes. */
function PdfPages({ pdf, onError }: { pdf: PDFDocumentProxy; onError: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const host = pagesRef.current;
    if (!host || width <= 0) return;
    let cancelled = false;
    const tasks: { cancel: () => void }[] = [];
    (async () => {
      try {
        const dpr = window.devicePixelRatio || 1;
        const pageWidth = Math.min(width - PAGE_GAP * 2, 1000);
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          if (cancelled) return;
          const scale = pageWidth / page.getViewport({ scale: 1 }).width;
          const viewport = page.getViewport({ scale: scale * dpr });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
          canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
          canvas.className = 'block mx-auto bg-white shadow-md ring-1 ring-black/5';
          // Show the first page as soon as it's drawn, the rest as they come.
          if (n === 1) host.replaceChildren(canvas); else host.appendChild(canvas);
          const task = page.render({ canvas, viewport });
          tasks.push(task);
          await task.promise;
          if (cancelled) return;
        }
      } catch (e) {
        if (!cancelled && (e as { name?: string })?.name !== 'RenderingCancelledException') onError();
      }
    })();
    return () => { cancelled = true; tasks.forEach(t => t.cancel()); };
  }, [pdf, width, onError]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-100">
      <div ref={pagesRef} className="flex flex-col" style={{ gap: PAGE_GAP, padding: PAGE_GAP }} />
    </div>
  );
}

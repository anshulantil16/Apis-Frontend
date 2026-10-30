/* Text out of an uploaded JD or resume, read entirely in the browser -
 * resumes are personal data, and nothing here sends them anywhere.
 *
 * PDF: PDF.js, page by page, rebuilding lines from where the text sits.
 * DOCX: a .docx is a zip; its body is word/document.xml. The browser's own
 * DecompressionStream inflates it, so no zip library is needed.
 * TXT: as is (handy for trying the tool out). */

export class ReadError extends Error {}

/* Loaded the first time a PDF is read, not with the page - same as the
   policy reader. */
async function loadPdfJs() {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

async function readPdf(file: File, onProgress: (p: number) => void): Promise<string> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const pdf = await task.promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const content = await (await pdf.getPage(i)).getTextContent();
      let line = '';
      const lines: string[] = [];
      let lastY: number | null = null;
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = item.transform[5];
        /* A new line when the text moves down, or PDF.js says the line ended. */
        if (lastY !== null && Math.abs(y - lastY) > 2 && line.trim()) { lines.push(line); line = ''; }
        line += (line && !line.endsWith(' ') && item.str && !item.str.startsWith(' ') ? ' ' : '') + item.str;
        if (item.hasEOL) { lines.push(line); line = ''; }
        lastY = y;
      }
      if (line.trim()) lines.push(line);
      pages.push(lines.join('\n'));
      onProgress(i / pdf.numPages);
    }
    return pages.join('\n');
  } finally {
    void task.destroy();
  }
}

/* One file out of a zip, by name - enough of the zip format for a .docx. */
async function unzipEntry(buf: ArrayBuffer, name: string): Promise<string | null> {
  const v = new DataView(buf);
  /* The end-of-central-directory record is in the last 64 KB. */
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) return null;
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const entry = dec.decode(new Uint8Array(buf, p + 46, nameLen));
    if (entry === name) {
      const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
      const data = new Uint8Array(buf, start, size);
      if (method === 0) return dec.decode(data);
      if (method !== 8) return null;
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return await new Response(stream).text();
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

async function readDocx(file: File): Promise<string> {
  const xml = await unzipEntry(await file.arrayBuffer(), 'word/document.xml');
  if (xml === null) throw new ReadError('This Word file couldn’t be opened. Try saving it again as .docx or PDF.');
  return xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => ENTITIES[e])
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));
}

export const ACCEPT = '.pdf,.docx,.txt';

export async function readFileText(file: File, onProgress: (p: number) => void = () => {}): Promise<string> {
  const name = file.name.toLowerCase();
  let text: string;
  if (name.endsWith('.pdf')) text = await readPdf(file, onProgress);
  else if (name.endsWith('.docx')) { text = await readDocx(file); onProgress(1); }
  else if (name.endsWith('.txt')) { text = await file.text(); onProgress(1); }
  else if (name.endsWith('.doc')) throw new ReadError('Old .doc files can’t be read — save it as .docx or PDF.');
  else throw new ReadError('Only PDF and DOCX files are supported.');
  text = text.split(String.fromCharCode(160)).join(' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text.replace(/\s/g, '').length < 40)
    throw new ReadError('No readable text found — it may be a scanned image. Try a text PDF or DOCX.');
  return text;
}

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

/* A piece of text PDF.js found, reduced to what matters for laying it out
   again: where it sits and how wide it is. */
export interface TextBit { str: string; x: number; y: number; width: number }

/* Resumes are very often two columns -- contact details and skills down one
   side, the work history down the other. Read in the order PDF.js hands
   them over, the two sides interleave: "Rahul Verma Skills 9876543210
   Excel" and nothing downstream can make sense of it.

   So: look for a vertical gutter no text crosses, with real content on both
   sides of it, and if there is one, read the left column in full and then
   the right. A single-column page has no such gutter and falls through
   unchanged. */
function gutterAt(bits: TextBit[], pageWidth: number): number | null {
  /* Enough text on the page to be sure the gap is a layout and not just a
     sparse page with two words on it. */
  if (bits.length < 12 || pageWidth <= 0) return null;
  const MIN_GAP = pageWidth * 0.04;
  /* Only the middle of the page: the margins are empty on every page and
     are not what anybody means by a column break. */
  for (let cut = pageWidth * 0.3; cut <= pageWidth * 0.7; cut += pageWidth * 0.02) {
    if (bits.some(b => b.x < cut && b.x + b.width > cut)) continue;
    const left = bits.filter(b => b.x + b.width <= cut);
    const right = bits.filter(b => b.x >= cut);
    if (left.length < bits.length * 0.15 || right.length < bits.length * 0.15) continue;
    const gap = Math.min(...right.map(b => b.x)) - Math.max(...left.map(b => b.x + b.width));
    if (gap >= MIN_GAP) return cut;
  }
  return null;
}

/* One column's bits, top to bottom and left to right within a line. Lines
   are broken on a real drop in y, not on PDF.js's own item boundaries,
   which split mid-sentence whenever the font changes. */
function columnLines(bits: TextBit[]): string[] {
  const rows = [...bits].sort((a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x));
  const out: string[] = [];
  let line = '', lastY: number | null = null;
  for (const b of rows) {
    if (lastY !== null && Math.abs(b.y - lastY) > 2) {
      if (line.trim()) out.push(line.trim());
      line = '';
    }
    /* Two pieces with no space of their own get one, so "Python" and
       "Advanced" sitting in two table columns do not become "PythonAdvanced". */
    const needsSpace = !!line && !line.endsWith(' ') && !!b.str && !b.str.startsWith(' ');
    line += (needsSpace ? ' ' : '') + b.str;
    lastY = b.y;
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

export function layoutText(bits: TextBit[], pageWidth: number): string {
  const real = bits.filter(b => b.str.trim());
  if (!real.length) return '';
  const cut = gutterAt(real, pageWidth);
  if (cut === null) return columnLines(real).join('\n');
  return [
    ...columnLines(real.filter(b => b.x + b.width <= cut)),
    ...columnLines(real.filter(b => b.x > cut)),
  ].join('\n');
}

async function readPdf(file: File, onProgress: (p: number) => void): Promise<string> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const pdf = await task.promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const bits: TextBit[] = [];
      for (const item of content.items) {
        if (!('str' in item)) continue;
        bits.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width ?? 0,
        });
      }
      pages.push(layoutText(bits, page.getViewport({ scale: 1 }).width));
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

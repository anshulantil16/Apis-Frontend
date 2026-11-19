/* A defaulter list as a picture, for sending to the person who can act on it.

   An HOD does not open the intranet, filter a report and read a table. They
   get a message. So the exceptions this tool finds have to leave it as
   something that can be forwarded, and that means an image.

   **Drawn, not screenshotted.** The obvious route is html2canvas over the
   cards already on screen, and it does not work here for two reasons. The
   employee photos come from BIZOM's host with no CORS header, so drawing
   one onto a canvas taints it and `toBlob` then refuses outright -- a
   screenshot tool returns nothing at all, not a sheet with grey squares.
   And a screenshot carries the app's furniture, the filter chips and the
   hover states, none of which mean anything to the person receiving it.
   Drawing it gives a sheet built for its reader: who, which day, what is
   wrong, and nothing else.

   The photos arrive as data URIs from our own backend
   (`/api/user_management/photo-thumbs/`), which has no origin and so keeps
   the canvas clean. A face that could not be fetched is a grey square with
   initials, never a failed download.
*/

export interface ShareRow {
  /** A data: URI. A plain URL would taint the canvas -- see above. */
  photo?: string;
  name: string;
  /** Employee code, beat, department -- whatever identifies them. */
  sub?: string;
  /** PRESENT / LATE / LEAVE. */
  status?: string;
  /** Times, hours, distance: short, already formatted. */
  facts: string[];
  /** What is wrong with the row. These are the point of the sheet. */
  flags: string[];
}

export interface ShareSheet {
  /** The group: "GTR05", "Sales — Delhi HO". */
  title: string;
  /** What this list is: "Auto EOD — 10 people". */
  subtitle: string;
  /** The day the attendance is FOR, not today. */
  dateLabel: string;
  /** Where the figures came from. */
  source: string;
  rows: ShareRow[];
}

/* Laid out in CSS pixels and drawn at 2x, so it stays sharp when somebody
   pinches into it on a phone -- which is where it will be read. */
const SCALE = 2;
const W = 940;
const PAD = 28;
const HEAD_H = 104;
const ROW_H = 92;
const FOOT_H = 46;
const PHOTO = 60;

const INK = '#0f172a';
const MUTED = '#64748b';
const FAINT = '#94a3b8';
const LINE = '#e2e8f0';
const ACCENT = '#f59e0b';
const WARN_BG = '#fef3c7';
const WARN_INK = '#92400e';
const WARN_EDGE = '#fcd34d';

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const font = (weight: number, size: number) => `${weight} ${size}px ${FONT}`;

function roundRect(c: CanvasRenderingContext2D, x: number, y: number,
                   w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

/** Cut to fit, with an ellipsis. A name running under the next column is
    worse than a name politely trimmed. */
function clip(c: CanvasRenderingContext2D, text: string, max: number): string {
  if (c.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && c.measureText(s + '…').width > max) s = s.slice(0, -1);
  return s + '…';
}

function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);   // a gap, not a failure
    img.src = src;
  });
}

/** A pill: rounded box, border, text. Returns the width it used. */
function pill(c: CanvasRenderingContext2D, text: string, x: number, y: number,
              bg: string, ink: string, edge: string, size = 12): number {
  c.font = font(700, size);
  const w = c.measureText(text).width + 18;
  const h = size + 12;
  c.fillStyle = bg;
  roundRect(c, x, y, w, h, 6);
  c.fill();
  c.strokeStyle = edge;
  c.lineWidth = 1;
  roundRect(c, x + 0.5, y + 0.5, w - 1, h - 1, 6);
  c.stroke();
  c.fillStyle = ink;
  c.textBaseline = 'middle';
  c.fillText(text, x + 9, y + h / 2 + 0.5);
  return w;
}

/* A sheet is something somebody scrolls on a phone. Past this it is a wall
   of names nobody reads, and the canvas itself gets close to the height
   limit browsers will encode -- at which point toBlob returns null and the
   download silently does not happen. Capped here rather than in each
   caller, so it cannot be forgotten in one of them. */
export const MAX_ROWS = 60;

export async function renderSheet(sheet: ShareSheet): Promise<Blob> {
  const rows = sheet.rows.slice(0, MAX_ROWS);
  const dropped = sheet.rows.length - rows.length;
  const H = HEAD_H + rows.length * ROW_H + FOOT_H;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('canvas unavailable');
  c.scale(SCALE, SCALE);

  // Fonts first, or the first draw uses a fallback face and the measuring
  // above is done against the wrong metrics.
  try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* older browser */ }

  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, W, H);

  // ── header ──
  c.fillStyle = ACCENT;
  c.fillRect(0, 0, W, 5);

  c.textBaseline = 'alphabetic';
  c.fillStyle = INK;
  c.font = font(800, 26);
  c.fillText(clip(c, sheet.title, W - PAD * 2 - 280), PAD, 50);

  c.fillStyle = MUTED;
  c.font = font(600, 15);
  c.fillText(clip(c, sheet.subtitle, W - PAD * 2 - 280), PAD, 74);

  // The date, large and on the right. This sheet gets forwarded and then
  // looked at again a week later; a list of names with no day on it is an
  // argument waiting to happen.
  c.textAlign = 'right';
  c.fillStyle = INK;
  c.font = font(800, 20);
  c.fillText(sheet.dateLabel, W - PAD, 48);
  c.fillStyle = FAINT;
  c.font = font(600, 12);
  c.fillText(sheet.source, W - PAD, 70);
  c.textAlign = 'left';

  c.strokeStyle = LINE;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, HEAD_H - 0.5);
  c.lineTo(W, HEAD_H - 0.5);
  c.stroke();

  // ── rows ──
  const images = await Promise.all(rows.map(r => r.photo ? loadImage(r.photo) : Promise.resolve(null)));

  rows.forEach((r, i) => {
    const top = HEAD_H + i * ROW_H;
    if (i % 2 === 1) {
      c.fillStyle = '#f8fafc';
      c.fillRect(0, top, W, ROW_H);
    }

    const cy = top + ROW_H / 2;
    const px = PAD, py = cy - PHOTO / 2;

    // photo, or initials where there is none
    const img = images[i];
    c.save();
    roundRect(c, px, py, PHOTO, PHOTO, 10);
    c.clip();
    if (img) {
      // cover: fill the square without squashing the face
      const s = Math.max(PHOTO / img.naturalWidth, PHOTO / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      c.drawImage(img, px + (PHOTO - dw) / 2, py + (PHOTO - dh) / 2, dw, dh);
    } else {
      c.fillStyle = '#e2e8f0';
      c.fillRect(px, py, PHOTO, PHOTO);
      c.fillStyle = '#64748b';
      c.font = font(700, 22);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(initials(r.name), px + PHOTO / 2, py + PHOTO / 2 + 1);
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
    }
    c.restore();
    c.strokeStyle = LINE;
    roundRect(c, px + 0.5, py + 0.5, PHOTO - 1, PHOTO - 1, 10);
    c.stroke();

    const tx = px + PHOTO + 16;
    const statusW = r.status ? 110 : 0;
    const textMax = W - tx - PAD - statusW;

    c.fillStyle = INK;
    c.font = font(700, 17);
    c.fillText(clip(c, r.name, textMax), tx, top + 30);

    let line2 = top + 51;
    if (r.sub) {
      c.fillStyle = FAINT;
      c.font = font(500, 12);
      c.fillText(clip(c, r.sub, textMax), tx, line2 - 3);
      line2 += 14;
    }

    if (r.facts.length) {
      c.fillStyle = MUTED;
      c.font = font(600, 13);
      c.fillText(clip(c, r.facts.join('   ·   '), textMax), tx, line2);
    }

    // The flags last and in amber, because they are the reason the sheet
    // exists -- everything above them is only there to say who.
    if (r.flags.length) {
      let fx = tx;
      const fy = top + ROW_H - 30;
      // Measured with the pill's own font, not whatever the line above
      // left set: a 13px measurement against a 12px pill is close enough
      // to pass the fit check and still run off the right edge.
      c.font = font(700, 12);
      for (const raw of r.flags) {
        // Clipped: a Delhi row's flag can be a free-text HR remark, and an
        // uncut one draws a pill the width of the sheet and off the end.
        const f = clip(c, raw, 260);
        const w = c.measureText(f).width + 18;
        if (fx + w > W - PAD) break;
        fx += pill(c, f, fx, fy, WARN_BG, WARN_INK, WARN_EDGE) + 6;
      }
      c.textBaseline = 'alphabetic';
    }

    if (r.status) {
      c.textAlign = 'right';
      c.fillStyle = MUTED;
      c.font = font(800, 12);
      c.fillText(r.status.toUpperCase(), W - PAD, top + 30);
      c.textAlign = 'left';
    }

    c.strokeStyle = LINE;
    c.beginPath();
    c.moveTo(PAD, top + ROW_H - 0.5);
    c.lineTo(W - PAD, top + ROW_H - 0.5);
    c.stroke();
  });

  // ── footer ──
  const fy = H - FOOT_H;
  c.fillStyle = '#f8fafc';
  c.fillRect(0, fy, W, FOOT_H);
  c.fillStyle = FAINT;
  c.font = font(600, 12);
  c.textBaseline = 'middle';
  c.fillStyle = dropped ? WARN_INK : FAINT;
  c.fillText(
    dropped
      ? `${rows.length} of ${sheet.rows.length} shown — the full list is in the CSV`
      : `${rows.length} ${rows.length === 1 ? 'person' : 'people'}`,
    PAD, fy + FOOT_H / 2);
  c.fillStyle = FAINT;
  c.textAlign = 'right';
  c.fillText(`APIS India intranet · generated ${new Date().toLocaleDateString('en-GB',
    { day: '2-digit', month: 'short', year: 'numeric' })}`, W - PAD, fy + FOOT_H / 2);
  c.textAlign = 'left';

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('could not make the image')),
                  'image/jpeg', 0.92);
  });
}

/** Safe for Windows, macOS and every chat app in between. */
export function safeFileName(...parts: string[]): string {
  return parts.filter(Boolean).join(' - ')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) + '.jpg';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoked on the next tick: Safari has not finished with the URL when
  // click() returns and cancels the download if it goes immediately.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

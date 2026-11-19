/* A defaulter list as a picture, for sending to the person who can act on it.

   An HOD does not open the intranet, filter a report and read a table. They
   get a message. So the exceptions these tools find have to leave as
   something that can be forwarded, and that means an image.

   **Drawn, not screenshotted.** The obvious route is html2canvas over the
   cards already on screen, and it does not work here. The employee photos
   come from BIZOM's host with no CORS header, so drawing one onto a canvas
   taints it and `toBlob` then refuses outright -- a screenshot tool returns
   nothing at all, not a sheet with grey squares. And a screenshot carries
   the app's furniture, the filter chips and the hover states, none of which
   mean anything to the person receiving it.

   The photos arrive as data URIs from our own backend
   (`/api/user_management/photo-thumbs/`), which have no origin and so keep
   the canvas clean. A face that could not be fetched is a grey square with
   initials, never a failed download.

   **Every row is measured before anything is drawn.** The first version of
   this laid rows out at a fixed height and wrote the times, the beat and
   the flag pills on top of each other the moment a row had all three. A
   canvas will happily draw text over text and tell you nothing, so the
   height has to come from the content rather than the content being
   trusted to fit a height.
*/

export interface ShareRow {
  /** A data: URI. A plain URL would taint the canvas -- see above. */
  photo?: string;
  name: string;
  /** Identity lines: employee code, designation, beat, department. */
  subs: string[];
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
const W = 1000;
const PAD = 28;
const FOOT_H = 48;
const PHOTO = 64;

const ROW_PAD = 15;        // above the name and below the last pill
const NAME_H = 24;
const SUB_H = 17;
const FACT_H = 21;
const PILL_H = 24;
const PILL_GAP = 6;
const STATUS_W = 112;      // kept clear on the right of every row

const INK = '#0f172a';
const MUTED = '#475569';
const FAINT = '#94a3b8';
const LINE = '#e2e8f0';
const ACCENT = '#f59e0b';
const WARN_BG = '#fef3c7';
const WARN_INK = '#92400e';
const WARN_EDGE = '#fcd34d';

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const font = (weight: number, size: number) => `${weight} ${size}px ${FONT}`;

const F_NAME = font(700, 17);
const F_SUB = font(500, 12.5);
const F_FACT = font(600, 13.5);
const F_PILL = font(700, 12);

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

/** Cut to fit, with an ellipsis. Measured in whatever font is set, so the
    caller sets the font first. */
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

const pillWidth = (c: CanvasRenderingContext2D, text: string) =>
  c.measureText(text).width + 18;

/** A sheet is scrolled on a phone. Past this it is a wall of names nobody
    reads, and the canvas approaches the height at which browsers quietly
    refuse to encode it and `toBlob` hands back null. */
export const MAX_ROWS = 60;

interface RowPlan {
  row: ShareRow;
  subs: string[];           // already clipped
  facts: string;            // already clipped, joined
  pillRows: string[][];     // wrapped, already clipped
  height: number;
}

/** Work out what each row needs before a single pixel is drawn. */
function plan(meas: CanvasRenderingContext2D, rows: ShareRow[]): RowPlan[] {
  const tx = PAD + PHOTO + 16;
  const textMax = W - tx - PAD - STATUS_W;
  const pillMax = W - tx - PAD;

  return rows.map(row => {
    meas.font = F_SUB;
    const subs = row.subs.filter(Boolean).map(t => clip(meas, t, textMax));

    meas.font = F_FACT;
    const factText = row.facts.filter(Boolean).join('   ·   ');
    const facts = factText ? clip(meas, factText, textMax) : '';

    // Pills wrap onto as many lines as they need. Truncating them at the
    // right edge was hiding the one thing the sheet exists to show.
    meas.font = F_PILL;
    const pillRows: string[][] = [];
    let line: string[] = [];
    let used = 0;
    for (const raw of row.flags.filter(Boolean)) {
      const text = clip(meas, raw, 300);
      const w = pillWidth(meas, text);
      if (line.length && used + w > pillMax) {
        pillRows.push(line);
        line = [];
        used = 0;
      }
      line.push(text);
      used += w + PILL_GAP;
    }
    if (line.length) pillRows.push(line);

    const content = NAME_H
      + subs.length * SUB_H
      + (facts ? FACT_H : 0)
      + (pillRows.length ? pillRows.length * (PILL_H + PILL_GAP) : 0);

    // Never shorter than the photograph beside it.
    const height = Math.max(content + ROW_PAD * 2, PHOTO + ROW_PAD * 2);
    return { row, subs, facts, pillRows, height };
  });
}

export async function renderSheet(sheet: ShareSheet): Promise<Blob> {
  const rows = sheet.rows.slice(0, MAX_ROWS);
  const dropped = sheet.rows.length - rows.length;

  // Fonts first, or everything below is measured against a fallback face
  // and then drawn in the real one.
  try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* older browser */ }

  const measCanvas = document.createElement('canvas');
  const meas = measCanvas.getContext('2d');
  if (!meas) throw new Error('canvas unavailable');

  // The header grows if the title or the date needs a second line's worth
  // of room; both are drawn on one line, so this only has to clear them.
  const headH = 110;
  const plans = plan(meas, rows);
  const bodyH = plans.reduce((n, p) => n + p.height, 0);
  const H = headH + bodyH + FOOT_H;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('canvas unavailable');
  c.scale(SCALE, SCALE);

  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, W, H);

  // ── header ──
  c.fillStyle = ACCENT;
  c.fillRect(0, 0, W, 5);

  c.textBaseline = 'alphabetic';

  // The date first, so the title knows how much room is left and clips to
  // it rather than running underneath.
  c.textAlign = 'right';
  c.fillStyle = INK;
  c.font = font(800, 21);
  const dateW = c.measureText(sheet.dateLabel).width;
  c.fillText(sheet.dateLabel, W - PAD, 50);
  c.fillStyle = FAINT;
  c.font = font(600, 12);
  const srcW = c.measureText(sheet.source).width;
  c.fillText(sheet.source, W - PAD, 74);
  c.textAlign = 'left';

  const headMax = W - PAD * 2 - Math.max(dateW, srcW) - 24;
  c.fillStyle = INK;
  c.font = font(800, 27);
  c.fillText(clip(c, sheet.title, headMax), PAD, 52);

  c.fillStyle = MUTED;
  c.font = font(600, 15);
  c.fillText(clip(c, sheet.subtitle, headMax), PAD, 78);

  c.strokeStyle = LINE;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, headH - 0.5);
  c.lineTo(W, headH - 0.5);
  c.stroke();

  // ── rows ──
  const images = await Promise.all(
    rows.map(r => r.photo ? loadImage(r.photo) : Promise.resolve(null)));

  const tx = PAD + PHOTO + 16;
  let y = headH;

  plans.forEach((p, i) => {
    const { row, subs, facts, pillRows, height } = p;
    const top = y;

    if (i % 2 === 1) {
      c.fillStyle = '#f8fafc';
      c.fillRect(0, top, W, height);
    }

    // photo, or initials where there is none
    const px = PAD, py = top + ROW_PAD;
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
      c.font = font(700, 23);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(initials(row.name), px + PHOTO / 2, py + PHOTO / 2 + 1);
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
    }
    c.restore();
    c.strokeStyle = LINE;
    c.lineWidth = 1;
    roundRect(c, px + 0.5, py + 0.5, PHOTO - 1, PHOTO - 1, 10);
    c.stroke();

    // One cursor down the row. Every block advances it, so nothing can be
    // drawn where something else already is.
    let cursor = top + ROW_PAD;

    cursor += NAME_H;
    c.fillStyle = INK;
    c.font = F_NAME;
    c.fillText(clip(c, row.name, W - tx - PAD - STATUS_W), tx, cursor - 6);

    if (row.status) {
      c.textAlign = 'right';
      c.fillStyle = MUTED;
      c.font = font(800, 12);
      c.fillText(row.status.toUpperCase(), W - PAD, top + ROW_PAD + NAME_H - 7);
      c.textAlign = 'left';
    }

    c.fillStyle = FAINT;
    c.font = F_SUB;
    for (const line of subs) {
      cursor += SUB_H;
      c.fillText(line, tx, cursor - 5);
    }

    if (facts) {
      cursor += FACT_H;
      c.fillStyle = MUTED;
      c.font = F_FACT;
      c.fillText(facts, tx, cursor - 6);
    }

    // The flags last and in amber, because they are the reason the sheet
    // exists -- everything above them is only there to say who.
    if (pillRows.length) {
      c.font = F_PILL;
      for (const line of pillRows) {
        let fx = tx;
        for (const text of line) {
          fx += drawPill(c, text, fx, cursor + 2) + PILL_GAP;
        }
        cursor += PILL_H + PILL_GAP;
      }
      c.textBaseline = 'alphabetic';
    }

    c.strokeStyle = LINE;
    c.beginPath();
    c.moveTo(PAD, top + height - 0.5);
    c.lineTo(W - PAD, top + height - 0.5);
    c.stroke();

    y += height;
  });

  // ── footer ──
  const fy = H - FOOT_H;
  c.fillStyle = '#f8fafc';
  c.fillRect(0, fy, W, FOOT_H);
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

/** Rounded box, border, text. Returns the width it used. The font must
    already be F_PILL -- the same one `plan` measured with. */
function drawPill(c: CanvasRenderingContext2D, text: string, x: number, y: number): number {
  const w = pillWidth(c, text);
  c.fillStyle = WARN_BG;
  roundRect(c, x, y, w, PILL_H, 6);
  c.fill();
  c.strokeStyle = WARN_EDGE;
  c.lineWidth = 1;
  roundRect(c, x + 0.5, y + 0.5, w - 1, PILL_H - 1, 6);
  c.stroke();
  c.fillStyle = WARN_INK;
  c.textBaseline = 'middle';
  c.fillText(text, x + 9, y + PILL_H / 2 + 0.5);
  c.textBaseline = 'alphabetic';
  return w;
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

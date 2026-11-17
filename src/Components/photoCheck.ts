/* Is the attendance photo actually a photo of something?

   People punch in with the lens covered, with the phone face-down, or with
   the flash blowing out a wall, and the row still reads Present with a neat
   timestamp beside it. Those are the ones worth asking about.

   **This is a brightness-and-detail check, not face recognition.** It can
   say "that frame is black" or "that frame is flat"; it cannot say "that is
   not Lakshya". Real face detection needs a model in the megabytes, and a
   tool that claims to check faces and does not is worse than one that says
   plainly what it measures -- somebody would act on it.

   So three verdicts and no more:

     blank       nearly black, nearly white, or featureless
     ok          there is detail in the frame; nothing is claimed about what
     unreadable  the image could not be fetched or inspected

   `unreadable` matters. The images are served from BIZOM's host, and
   reading pixels back out of a canvas needs that host to allow it
   (`Access-Control-Allow-Origin`). Where it does not, the browser refuses,
   and the honest answer is "could not check" -- never "blank", which would
   put every field employee on an exceptions list because of a server
   header none of them has heard of.
*/

export type PhotoVerdict = 'ok' | 'blank' | 'unreadable';

export interface PhotoStat {
  verdict: PhotoVerdict;
  /** Mean luminance, 0 (black) to 255 (white). */
  mean: number;
  /** Spread of luminance. A real scene has detail; a covered lens does not. */
  sd: number;
  reason: string;
}

/* Thresholds, from looking at the real thing. The black square in the live
   file reads mean ~2, sd ~0; an ordinary selfie sits around mean 90-160 with
   sd well over 40. The gaps either side are wide on purpose: a dim photo of
   a real person must not be called blank. */
const DARK = 18;      // below this the frame is black
const BRIGHT = 242;   // above this it is washed out
const FLAT = 12;      // below this there is no detail at all

/* 48x48 is enough to answer both questions and keeps a 600-row day to a few
   hundred KB of canvas work rather than a few hundred MB. */
const SIZE = 48;
const LOAD_TIMEOUT_MS = 15000;

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Without this the canvas is tainted and getImageData throws; with it a
    // host that sends no CORS header fails the load instead. Either way the
    // answer is "unreadable", and the <img> on the card is a separate
    // element that still displays normally.
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    const timer = window.setTimeout(() => { img.src = ''; reject(new Error('timeout')); },
                                    LOAD_TIMEOUT_MS);
    img.onload = () => { window.clearTimeout(timer); resolve(img); };
    img.onerror = () => { window.clearTimeout(timer); reject(new Error('load failed')); };
    img.src = url;
  });
}

export async function checkPhoto(url: string): Promise<PhotoStat> {
  const miss = (reason: string): PhotoStat =>
    ({ verdict: 'unreadable', mean: -1, sd: -1, reason });
  if (!url) return miss('no photo');

  let img: HTMLImageElement;
  try {
    img = await load(url);
  } catch {
    return miss('could not load the image');
  }
  if (!img.naturalWidth || !img.naturalHeight) return miss('empty image');

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return miss('canvas unavailable');

  let data: Uint8ClampedArray;
  try {
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  } catch {
    // The classic tainted-canvas SecurityError.
    return miss('the image host does not allow inspection');
  }

  let sum = 0, sumSq = 0;
  const n = SIZE * SIZE;
  for (let i = 0; i < data.length; i += 4) {
    // Rec. 709 luma: green carries most of what the eye reads as brightness.
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    sum += l; sumSq += l * l;
  }
  const mean = sum / n;
  const sd = Math.sqrt(Math.max(0, sumSq / n - mean * mean));

  if (mean < DARK)   return { verdict: 'blank', mean, sd, reason: 'almost completely black' };
  if (mean > BRIGHT) return { verdict: 'blank', mean, sd, reason: 'almost completely white' };
  if (sd < FLAT)     return { verdict: 'blank', mean, sd, reason: 'no detail in the frame' };
  return { verdict: 'ok', mean, sd, reason: 'there is detail in the frame' };
}

/* Runs the check over a list, a few at a time.

   All at once would open six hundred connections and the browser would
   queue most of them anyway; one at a time takes minutes. `onResult` fires
   per image so the screen fills in as it goes rather than sitting still and
   then jumping. */
export async function checkMany(
  urls: string[],
  onResult: (url: string, stat: PhotoStat) => void,
  opts: { concurrency?: number; stopped?: () => boolean } = {},
): Promise<void> {
  const { concurrency = 6, stopped } = opts;
  const queue = [...new Set(urls.filter(Boolean))];
  let next = 0;

  const worker = async () => {
    for (;;) {
      if (stopped?.()) return;
      const i = next++;
      if (i >= queue.length) return;
      const url = queue[i];
      const stat = await checkPhoto(url).catch(() =>
        ({ verdict: 'unreadable', mean: -1, sd: -1, reason: 'check failed' }) as PhotoStat);
      if (stopped?.()) return;
      onResult(url, stat);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
}

/* Download a file from an endpoint that needs the portal session.
 *
 * A plain <a href> or window.open is a browser navigation, and a navigation
 * carries no Authorization header -- the portal's session token lives in one.
 * While those endpoints answered anybody the link worked; the moment they
 * started requiring a session it would have become a 401 page where a
 * spreadsheet used to be.
 *
 * So the file is fetched with the session attached and handed to the browser
 * as a blob instead. The filename comes from Content-Disposition when the
 * server sends one, because that is where the server says what the file is
 * called.
 */
import { apiFetch } from '../features/portal/session';

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export async function downloadFile(url: string, fallbackName = 'download',
                                   fetcher: Fetcher = apiFetch): Promise<string> {
  // `fetcher` is how the caller says WHICH session to send. The portal's own
  // is the default; Appraisal and EOM pass their own, because somebody who
  // signed in at those tools' OTP login has no portal token at all.
  const r = await fetcher(url);
  if (!r.ok) {
    if (r.status === 401) return 'Your session has ended. Please sign in again.';
    // A refusal with a reason ({"error": "..."}) says why; show that.
    const reason = await r.json().then((d: { error?: unknown }) => d?.error, () => null);
    return typeof reason === 'string' && reason ? reason : 'That file could not be downloaded. Please try again.';
  }

  const disposition = r.headers.get('Content-Disposition') || '';
  // filename="x.xlsx", or RFC 5987's filename*=UTF-8''x.xlsx
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const name = match ? decodeURIComponent(match[1]) : fallbackName;

  const blob = await r.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoked on the next tick: Firefox cancels an in-flight download if the
  // object URL goes away in the same one.
  setTimeout(() => URL.revokeObjectURL(href), 0);
  return '';
}


/* Open a file in a new tab, from an endpoint that needs the session.
 *
 * Same problem as downloadFile and one extra: the tab has to be opened in
 * the click itself. Open it after awaiting the fetch and the browser treats
 * it as an unprompted popup and blocks it, so the tab is opened empty first
 * and pointed at the blob once it arrives. If it was blocked anyway, the
 * file is saved instead of silently doing nothing.
 */
export async function openFile(url: string, fallbackName = 'document.pdf',
                               fetcher: Fetcher = apiFetch): Promise<string> {
  const tab = window.open('', '_blank');
  const r = await fetcher(url);
  if (!r.ok) {
    tab?.close();
    if (r.status === 401) return 'Your session has ended. Please sign in again.';
    return 'That file could not be opened. Please try again.';
  }
  const href = URL.createObjectURL(await r.blob());
  if (tab) {
    tab.location.href = href;
  } else {
    const a = document.createElement('a');
    a.href = href;
    a.download = fallbackName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  // Long enough for the new tab to have loaded it; revoking at once leaves
  // that tab showing nothing.
  setTimeout(() => URL.revokeObjectURL(href), 60000);
  return '';
}

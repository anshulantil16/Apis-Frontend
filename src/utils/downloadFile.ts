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

export async function downloadFile(url: string, fallbackName = 'download'): Promise<string> {
  const r = await apiFetch(url);
  if (!r.ok) {
    if (r.status === 401) return 'Your session has ended. Please sign in again.';
    return 'That file could not be downloaded. Please try again.';
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

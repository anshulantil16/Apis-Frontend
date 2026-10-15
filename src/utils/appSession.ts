/* Sending the Appraisal / EOM session with every request.
 *
 * Both tools kept the OTP login they had before the portal. It proved who
 * you were once, at the door, and handed back a profile and nothing else --
 * so every request afterwards named an employee id in the URL and the server
 * believed it. A sweep on 14-10-2026 pulled the whole employee list of both,
 * with emails and phone numbers, carrying no credential at all.
 *
 * The login now also hands back a session token. Both pages already keep the
 * signed-in profile in localStorage, so it is stored with it and dropped on
 * sign-out without either page having to do anything new.
 *
 * Two credentials are possible and either is accepted. Inside the intranet
 * these tools are opened by somebody already signed in to the portal, whose
 * token is the one worth sending; opened on their own, from the OTP login,
 * the tool's own session is all there is.
 */
import { getToken } from '../features/portal/session';

type App = 'appraisal' | 'eom';

const PROFILE_KEY: Record<App, string> = {
  appraisal: 'appraisal_employee',
  eom: 'eom_user',
};

/** The tool's own session token, or '' if nobody is signed in to it. */
export function appToken(app: App): string {
  try {
    const raw = localStorage.getItem(PROFILE_KEY[app]);
    if (!raw) return '';
    return (JSON.parse(raw) || {}).session_token || '';
  } catch {
    // Private window, blocked storage, or a profile saved before tokens
    // existed. Not being able to read one is not an error; it just means
    // there is nothing to send.
    return '';
  }
}

function withSession(app: App, init: RequestInit = {}): RequestInit {
  const token = appToken(app) || getToken();
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  return {
    ...init,
    headers: {
      // Not set for FormData: the browser has to write its own
      // multipart boundary into Content-Type.
      ...(isForm || !init.body ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  };
}

export const appraisalFetch = (url: string, init: RequestInit = {}) =>
  fetch(url, withSession('appraisal', init));

export const eomFetch = (url: string, init: RequestInit = {}) =>
  fetch(url, withSession('eom', init));

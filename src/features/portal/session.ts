/* The one place that knows whether anyone is signed in.
 *
 * Every tool on this server used to be reachable by anyone who knew its URL.
 * The portal puts a single door in front of all of them, and this module is
 * what the door latches onto: the token, who it belongs to, and which tools
 * that person may open.
 */

export const PORTAL_API =
  `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/accounts/portal`;

/* localStorage rather than a cookie: the API is on a different origin in
   development, and a Bearer header works identically in both. The token is
   opaque and server-revocable, so a stale copy in a closed tab is dead the
   moment an administrator ends the session. */
const TOKEN_KEY = 'apis_portal_token';

export type PortalUser = {
  id: number;
  employee_code: string;
  email: string;
  name: string;
  designation: string;
  department: string;
  location: string;
  reporting_manager_code: string;
  is_active: boolean;
  is_superadmin: boolean;
  is_bootstrap: boolean;
  allowed_apps: string[];
  from_hrms: boolean;
  last_login_at: string | null;
  last_synced_at: string | null;
};

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
};
export const setToken = (t: string) => {
  try { localStorage.setItem(TOKEN_KEY, t); } catch { /* private window — session lives in memory only */ }
};
export const clearToken = () => {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* nothing to clear */ }
};

/** fetch with the session token attached. */
export async function portalFetch(path: string, init: RequestInit = {}) {
  const token = getToken();
  return fetch(`${PORTAL_API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
}

/** Whoever the stored token belongs to, or null if it is missing or dead. */
export async function fetchMe(): Promise<PortalUser | null> {
  if (!getToken()) return null;
  try {
    const r = await portalFetch('/me/');
    if (!r.ok) {
      // 401 means the token is spent, revoked or expired — drop it rather
      // than leaving a dead token to fail every subsequent call.
      if (r.status === 401) clearToken();
      return null;
    }
    const d = await r.json();
    return d.user as PortalUser;
  } catch {
    // A network failure is not proof the session is invalid, so the token
    // stays — the user is shown the sign-in screen and can retry.
    return null;
  }
}

export async function signOut() {
  try { await portalFetch('/logout/', { method: 'POST', body: '{}' }); } catch { /* leaving anyway */ }
  clearToken();
}

/** Greeting that matches the actual time of day, not the server's. */
export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "Anshul Antil" -> "Anshul". The greeting wants a name, not a record. */
export const firstName = (full: string) => (full || '').trim().split(/\s+/)[0] || '';

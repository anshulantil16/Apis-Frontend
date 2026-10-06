/* Where the API lives, decided once.
 *
 * Twenty-four files used to carry their own copy of
 *
 *     import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
 *
 * which bakes an absolute hostname into the bundle at build time. That is
 * how a QA build made with `npm run build` silently talked to production,
 * and it is why one server reachable at two addresses -- a domain and the
 * bare IP it resolves to -- needed two different builds.
 *
 * The frontend is served by the same Apache virtual host that proxies /api/
 * to gunicorn, so the API is ALWAYS same-origin in a deployed build. An
 * empty VITE_API_BASE_URL means exactly that: use whatever host the page was
 * loaded from. The same file then works on the domain, on the IP, and on any
 * address added later, with no rebuild.
 *
 * Undefined -- no .env at all -- still means local development, where Vite
 * serves the page on :5173 and Django answers on :8000, so they genuinely
 * are different origins.
 */
const raw = import.meta.env.VITE_API_BASE_URL;

export const API_BASE: string = raw === undefined ? 'http://localhost:8000' : raw;

/** The same value, as a function, for the modules that call it inline. */
export const apiBase = (): string => API_BASE;

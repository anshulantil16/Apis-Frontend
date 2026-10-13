import { apiBase } from '../../apiBase';

/* Where to fetch a document from.
   - `/api/...` is an uploaded document's reader URL. The server sends it
     root-relative, which is right on Live (same origin) but wrong on QA,
     where the API answers on its own port — so the API base goes in front.
   - anything else absolute (a full URL, a blob) passes straight through.
   - a bare filename is one of the built-in PDFs in public/Policies/. */
export function policyHref(file: string) {
  if (file.startsWith('/api/')) return `${apiBase()}${file}`;
  return /^(blob:|https?:|\/)/.test(file) ? file : encodeURI(`/Policies/${file}`);
}

export interface ReaderDoc { title: string; file: string }

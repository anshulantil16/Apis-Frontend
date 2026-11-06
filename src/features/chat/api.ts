/* Talking to /api/chat.
 *
 * There is no websocket. Gunicorn here is synchronous WSGI behind Apache,
 * and the one time this project added a broker-backed stack (Celery, for
 * offer letters) it was taken out again after repeated outages. Polling a
 * small endpoint on an intranet of a few hundred people costs less than a
 * second service to keep alive, and it degrades into "a bit slow" rather
 * than "nothing arrives" when something breaks.
 */
import { apiFetch } from '../portal/session';
import { apiBase } from '../../apiBase';

const API = `${apiBase()}/api/chat`;

export interface Person {
  id: number; name: string; employee_code: string;
  email: string; designation: string; department: string;
}

export interface Attachment {
  id: number; name: string; size: number;
  kind: 'image' | 'file'; content_type: string;
}

export interface QuotedMessage { id: number; sender_name: string; body: string }

export interface ChatMessage {
  id: number; body: string; kind: 'text' | 'system';
  deleted: boolean; edited: boolean; seen: boolean;
  sent_at: string; sender_id: number | null; mine: boolean; sender_name: string;
  attachments: Attachment[];
  reply_to: QuotedMessage | null;
}

export interface ConversationRow {
  id: number; is_group: boolean; title: string;
  person: Person | null; members: Person[];
  last_message: ChatMessage | null;
  unread: number; last_message_at: string;
}

export interface ThreadPage {
  conversation_id: number; is_group: boolean; title: string;
  person: Person | null; members: Person[];
  messages: ChatMessage[]; has_more: boolean;
}

async function json(path: string, init?: RequestInit) {
  const r = await apiFetch(`${API}${path}`, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || 'Messages is not reachable right now.');
  return body;
}

const post = (path: string, data?: unknown) => json(path, {
  method: 'POST',
  ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
});

export const listConversations = (): Promise<{ conversations: ConversationRow[]; total_unread: number }> =>
  json('/conversations/');

export const openWith = (employee_code: string): Promise<{ id: number; person: Person }> =>
  post('/conversations/', { employee_code });

export const createGroup = (title: string, employee_codes: string[]): Promise<{ id: number }> =>
  post('/conversations/', { title, employee_codes });

export function loadMessages(
  id: number, opts: { after?: number; before?: number; q?: string } = {},
): Promise<ThreadPage> {
  const p = new URLSearchParams();
  if (opts.after) p.set('after', String(opts.after));
  if (opts.before) p.set('before', String(opts.before));
  if (opts.q) p.set('q', opts.q);
  const qs = p.toString();
  return json(`/conversations/${id}/messages/${qs ? `?${qs}` : ''}`);
}

/* Sent as multipart whenever there are files, so one request carries the
   text and its attachments and a message is never half-sent. */
export async function sendMessage(
  id: number, body: string, attachments: File[] = [], replyTo?: number,
): Promise<{ message: ChatMessage }> {
  if (!attachments.length) {
    return post(`/conversations/${id}/messages/`,
      { body, ...(replyTo ? { reply_to: replyTo } : {}) });
  }
  const form = new FormData();
  form.append('body', body);
  if (replyTo) form.append('reply_to', String(replyTo));
  for (const f of attachments) form.append('files', f);
  return json(`/conversations/${id}/messages/`, { method: 'POST', body: form });
}

export const editMessage = (id: number, messageId: number, body: string): Promise<{ message: ChatMessage }> =>
  json(`/conversations/${id}/messages/${messageId}/`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }),
  });

export const deleteMessage = (id: number, messageId: number): Promise<{ message: ChatMessage }> =>
  json(`/conversations/${id}/messages/${messageId}/`, { method: 'DELETE' });

export const markRead = (id: number) => post(`/conversations/${id}/read/`);
export const clearThread = (id: number) => post(`/conversations/${id}/clear/`);
export const addMember = (id: number, employee_code: string) =>
  post(`/conversations/${id}/members/`, { employee_code });
export const leaveGroup = (id: number) => json(`/conversations/${id}/members/`, { method: 'DELETE' });

export const findPeople = (q: string): Promise<{ people: Person[]; total: number }> =>
  json(`/people/${q ? `?q=${encodeURIComponent(q)}` : ''}`);

export const unreadCount = (): Promise<{ unread: number; latest: string | null }> => json('/unread/');

/* Attachments are fetched rather than linked.
 *
 * The session token travels in an Authorization header, which an <img src>
 * or a plain download link cannot carry -- so the file comes back as a
 * blob and is handed to the browser from memory. The alternative, a URL
 * that works without the header, is a link anybody could forward. */
export async function attachmentBlob(attachmentId: number): Promise<string> {
  const r = await apiFetch(`${API}/attachments/${attachmentId}/`);
  if (!r.ok) throw new Error('That file could not be opened.');
  return URL.createObjectURL(await r.blob());
}

export async function downloadAttachment(a: Attachment) {
  const url = await attachmentBlob(a.id);
  const el = Object.assign(document.createElement('a'), { href: url, download: a.name });
  el.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* Kept in step with chat/files.py. The server decides; this only stops a
   pointless round trip and gives the file picker something to filter on. */
export const ACCEPT = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.csv', '.txt', '.zip', '.rar', '.7z', '.mp3', '.m4a', '.mp4',
].join(',');
export const MAX_BYTES = 15 * 1024 * 1024;
export const MAX_FILES = 5;

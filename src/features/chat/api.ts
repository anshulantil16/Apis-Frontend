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

export interface ChatMessage {
  id: number; body: string; deleted: boolean; edited: boolean;
  sent_at: string; sender_id: number | null; mine: boolean; sender_name: string;
}

export interface ConversationRow {
  id: number; person: Person | null; last_message: ChatMessage | null;
  unread: number; last_message_at: string;
}

async function json(path: string, init?: RequestInit) {
  const r = await apiFetch(`${API}${path}`, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || 'Messages is not reachable right now.');
  return body;
}

const send = (path: string, data?: unknown) => json(path, {
  method: 'POST',
  ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
});

export const listConversations = (): Promise<{ conversations: ConversationRow[]; total_unread: number }> =>
  json('/conversations/');

export const openWith = (employee_code: string): Promise<{ id: number; person: Person }> =>
  send('/conversations/', { employee_code });

export const loadMessages = (id: number, after?: number): Promise<{
  conversation_id: number; person: Person | null; messages: ChatMessage[]; has_more: boolean;
}> => json(`/conversations/${id}/messages/${after ? `?after=${after}` : ''}`);

export const sendMessage = (id: number, body: string): Promise<{ message: ChatMessage }> =>
  send(`/conversations/${id}/messages/`, { body });

export const editMessage = (id: number, messageId: number, body: string): Promise<{ message: ChatMessage }> =>
  json(`/conversations/${id}/messages/${messageId}/`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }),
  });

export const deleteMessage = (id: number, messageId: number): Promise<{ message: ChatMessage }> =>
  json(`/conversations/${id}/messages/${messageId}/`, { method: 'DELETE' });

export const markRead = (id: number) => send(`/conversations/${id}/read/`);
export const clearThread = (id: number) => send(`/conversations/${id}/clear/`);

export const findPeople = (q: string): Promise<{ people: Person[]; total: number }> =>
  json(`/people/${q ? `?q=${encodeURIComponent(q)}` : ''}`);

export const unreadCount = (): Promise<{ unread: number; latest: string | null }> => json('/unread/');

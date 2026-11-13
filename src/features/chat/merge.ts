/* Folding a poll's answer into what is already on screen.
 *
 * The poll used to ask for messages `after` the highest id it held, which
 * cannot answer "what changed": a delete and an edit both rewrite a row
 * that is already on the reader's screen without raising that id. So a
 * message somebody deleted went on looking perfectly normal to the other
 * person until they happened to reload -- at the one moment where a delete
 * needs to be quick.
 *
 * Asking by time instead means an answer can contain a message already
 * held, so folding it in is a replace-or-append rather than an append.
 */
import type { ChatMessage } from './api';

export function merge(prev: ChatMessage[], changed: ChatMessage[]): ChatMessage[] {
  if (!changed.length) return prev;
  const by = new Map(prev.map(m => [m.id, m]));
  for (const m of changed) by.set(m.id, m);
  // Sorted by id rather than by arrival: ids are the server's order, and a
  // message edited an hour later must not jump to the bottom of the thread.
  return [...by.values()].sort((a, b) => a.id - b.id);
}

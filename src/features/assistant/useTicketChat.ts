/* Raising an IT ticket or an Admin request in Ask APIS: sign in to the Help
 * Desk with the emailed
 * code, answer the form's questions, check the summary, submit.
 *
 * Kept private to the person in front of the screen, as the TA/DA flow is:
 *  - the session token lives in a ref, in memory only - not in storage, and
 *    not the Help Desk page's saved sign-in, so neither can reach the other;
 *  - the server raises the ticket as the person the token was issued to, and
 *    looks up their name itself (roompulse/assistant.py);
 *  - the session is 30 minutes, and reset() - Leave, New chat, the cross, or
 *    a different intranet user - ends it on the server as well as wiping the
 *    answers and messages here;
 *  - the code is never shown back in the chat. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiBase } from '../../apiBase';
import { loadSession } from '../helpdesk/HelpDeskShared';
import type { ChatMsg } from './SecureChatView';
import { answer, nextField, summary, SKIP, type Answers, type Field } from './tadaChat';
import { adminFields, ticketFields, type Desk, type Staff } from './ticketChat';

type Stage = 'email' | 'otp' | 'desk' | 'form' | 'review' | 'sending' | 'done';

const API = `${apiBase()}/api/roompulse`;
const DONE = ['Raise another', 'Back to Ask APIS'];
const DESKS = { it: 'IT ticket — laptop, VPN, email, printer…', admin: 'Admin request — items, repairs, housekeeping…' };
const NOUN = { it: 'ticket', admin: 'request' } as const;

/* Never throws: a network failure comes back as a failed answer like any other. */
async function post(path: string, body: object): Promise<{ ok: boolean; status: number; d: Record<string, unknown> }> {
  let r: Response;
  try {
    r = await fetch(`${API}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, d: { error: 'I couldn’t reach the Help Desk. Check your connection and try again.' } };
  }
  let d: Record<string, unknown>;
  try { d = await r.json(); } catch {
    d = { error: `The Help Desk had a problem (${r.status}). Please try again in a moment.` };
  }
  return { ok: r.ok, status: r.status, d };
}

const errorOf = (d: Record<string, unknown>, fallback: string) =>
  (typeof d.error === 'string' && d.error) || fallback;

export function useTicketChat(userEmail?: string) {
  const [active, setActive] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [stage, setStage] = useState<Stage>('email');
  const [busy, setBusy] = useState(false);
  const [who, setWho] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  /* Which desk: IT tickets or Admin requests. null until known. */
  const [desk, setDesk] = useState<Desk | null>(null);
  const rosters = useRef<Record<Desk, Staff[]>>({ it: [], admin: [] });
  const token = useRef<string | null>(null);
  const email = useRef('');
  const nextId = useRef(1);

  const say = useCallback((m: Omit<ChatMsg, 'id'>) =>
    setMsgs(ms => [...ms, { ...m, id: nextId.current++ }]), []);

  const reset = useCallback(() => {
    // End the session on the server too, so a token left in memory anywhere
    // is worth nothing. Fire and forget: leaving must not wait on the network.
    if (token.current) void post('assistant/logout/', { token: token.current });
    token.current = null; email.current = '';
    setActive(false); setMsgs([]); setStage('email'); setBusy(false); setWho(null);
    setFields([]); setAnswers({}); setDesk(null); rosters.current = { it: [], admin: [] };
  }, []);

  /* Someone else signed in to the intranet: nothing of the last person's stays. */
  useEffect(() => reset, [userEmail, reset]);

  const ask = (f: Field, a: Answers) =>
    say({ from: 'bot', text: f.ask(a, {}), chips: [...(f.chips?.(a, {}, {}) ?? []), ...(f.optional ? [SKIP] : [])] });

  const advance = (fs: Field[], a: Answers) => {
    const f = nextField(fs, a, {});
    if (f) { setStage('form'); ask(f, a); return; }
    setStage('review');
    say({ from: 'bot', text: 'Here’s everything. Check it over, change anything that’s off, then submit.', review: true });
  };

  const askDesk = () => {
    setStage('desk');
    say({ from: 'bot', text: 'Is this for IT, or for Admin?', chips: [DESKS.it, DESKS.admin] });
  };

  /* The desk known and the person signed in: its form, its roster. */
  const beginDesk = (d: Desk, keep: Answers = {}) => {
    const staff = rosters.current[d];
    if (!staff.length) {
      setStage('desk');
      say({ from: 'bot', tone: 'error',
        text: `Nobody is on the ${d === 'it' ? 'IT Support' : 'Admin'} roster yet, so there’s no one to send it to. Please tell the Help Desk admin.`,
        chips: [d === 'it' ? DESKS.admin : DESKS.it] });
      return;
    }
    setDesk(d);
    const fs = d === 'admin' ? adminFields(staff) : ticketFields(staff);
    setFields(fs);
    say({ from: 'bot', tone: 'note', text: d === 'admin'
      ? 'An Admin request — the same questions as the Help Desk’s “Request an item” form.'
      : 'An IT ticket — the same questions as the Help Desk’s “Raise IT Ticket” form.' });
    advance(fs, keep);
  };

  /* The emails worth offering: the account the Help Desk in this browser is
     signed in to first - so the ticket lands in the My Requests they will
     look at - then the intranet's. Only the address is read, never the Help
     Desk's token: the chat still proves it with its own code. */
  const suggested = () => {
    const desk = loadSession()?.email;
    return [...new Set([desk, userEmail].filter((e): e is string => !!e).map(e => e.toLowerCase()))];
  };

  const askEmail = () => {
    setStage('email');
    const emails = suggested();
    const desk = loadSession()?.email;
    say({ from: 'bot', chips: emails,
      text: 'To keep your ticket private, please sign in to the Help Desk first. What’s your work email?'
        + (desk ? ` (Your Help Desk here is signed in as ${desk.toLowerCase()} — use that one to see the ticket in its My Requests.)` : '') });
  };

  /* `which`: the desk the question named, or 'ask' to find out after sign-in. */
  const start = (said?: string, which: Desk | 'ask' = 'ask') => {
    reset();
    setActive(true);
    if (which !== 'ask') setDesk(which);
    if (said) say({ from: 'user', text: said });
    say({ from: 'bot', tone: 'note', text: which === 'admin'
      ? 'I can raise an Admin request with you right here — the same questions as the Help Desk form — and send it to Admin.'
      : which === 'it'
        ? 'I can raise an IT ticket with you right here — the same questions as the Help Desk form — and send it to IT Support.'
        : 'I can raise a Help Desk request with you right here — an IT ticket or an Admin request — with the same questions as the Help Desk forms.' });
    askEmail();
  };

  const sendCode = async (addr: string) => {
    setBusy(true);
    const { ok, d } = await post('login/', { action: 'send_otp', email: addr });
    setBusy(false);
    if (!ok) { say({ from: 'bot', tone: 'error', text: errorOf(d, 'I couldn’t send a code. Please try again.'), chips: suggested() }); return; }
    email.current = addr;
    setStage('otp');
    say({ from: 'bot', text: `I’ve emailed a 6-digit code to ${d.masked_email}. Type it here — it’s valid for 5 minutes.`,
      chips: ['Send a new code', 'Use a different email'] });
    if (typeof d.dev_otp === 'string') {
      say({ from: 'bot', tone: 'note', text: `Local testing: email isn’t set up on this machine, so your code is ${d.dev_otp}.`, chips: [d.dev_otp] });
    }
  };

  const verify = async (code: string) => {
    setBusy(true);
    const { ok, d } = await post('assistant/verify/', { email: email.current, otp: code });
    setBusy(false);
    if (!ok) { say({ from: 'bot', tone: 'error', text: errorOf(d, 'That didn’t work. Please try again.'), chips: ['Send a new code'] }); return; }
    rosters.current = { it: (d.staff ?? []) as Staff[], admin: (d.admin_staff ?? []) as Staff[] };
    token.current = d.token as string;
    setWho(d.name as string);
    say({ from: 'bot', tone: 'ok', text: `Signed in as ${d.name} (${email.current}). Only you can see this conversation.` });
    // Signed in again after the session ran out: carry on where they were.
    if (desk && fields.length) { advance(fields, answers); return; }
    if (desk) { beginDesk(desk); return; }
    askDesk();
  };

  const submit = async () => {
    if (!token.current || !desk) { askEmail(); return; }
    setStage('sending'); setBusy(true);
    const { ok, status, d } = await post(desk === 'admin' ? 'assistant/request/' : 'assistant/ticket/',
      { ...answers, token: token.current });
    setBusy(false);
    if (status === 401) {
      token.current = null; setWho(null);
      say({ from: 'bot', tone: 'error', text: `${errorOf(d, 'Your sign-in has expired.')} Your answers are kept.` });
      askEmail();
      return;
    }
    if (!ok) {
      setStage('review');
      say({ from: 'bot', tone: 'error', text: `${errorOf(d, `The ${NOUN[desk]} couldn’t be raised.`)} Change it on the summary above and submit again.` });
      return;
    }
    const t = (d.ticket ?? d.request ?? {}) as { id?: number; assigned_to_name?: string };
    setStage('done');
    // Raised: the answers are not needed any more, so they are not kept.
    setAnswers({});
    say({ from: 'bot', tone: 'ok',
      text: `${desk === 'admin' ? 'Admin request' : 'IT ticket'} #${t.id ?? d.id} raised${t.assigned_to_name ? ` and sent to ${t.assigned_to_name}` : ''}. ${d.message ?? ''} You can follow it in the Help Desk under My Requests, signed in as ${email.current}.`,
      chips: DONE, portal: true });
  };

  /* Everything typed or tapped in the flow comes through here. */
  const reply = (raw: string) => {
    const input = raw.trim();
    if (!input || busy) return;
    const masked = stage === 'otp' && /^\d{4,8}$/.test(input);
    say({ from: 'user', text: masked ? '••••••' : input });

    switch (stage) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) { say({ from: 'bot', tone: 'error', text: 'That doesn’t look like an email address.' }); return; }
        void sendCode(input.toLowerCase());
        return;
      case 'otp':
        if (/new code/i.test(input)) { void sendCode(email.current); return; }
        if (/different email/i.test(input)) { askEmail(); return; }
        if (!/^\d{6}$/.test(input)) { say({ from: 'bot', tone: 'error', text: 'The code is 6 digits — please type just those.' }); return; }
        void verify(input);
        return;
      case 'desk': {
        const d: Desk | null = /admin|item|repair|housekeeping/i.test(input) ? 'admin'
          : /^it\b|it ticket|laptop|vpn|email|printer/i.test(input) ? 'it' : null;
        if (!d) { say({ from: 'bot', tone: 'error', text: 'Please pick IT or Admin.', chips: [DESKS.it, DESKS.admin] }); return; }
        setAnswers({});
        beginDesk(d);
        return;
      }
      case 'form': {
        const f = nextField(fields, answers, {});
        if (!f) return;
        const r = answer(f, input, answers, {});
        if ('error' in r) { say({ from: 'bot', tone: 'error', text: r.error, chips: f.chips?.(answers, {}, {}) }); return; }
        const a = { ...answers, [f.key]: r.value };
        setAnswers(a);
        advance(fields, a);
        return;
      }
      case 'review':
        if (/^(submit|yes|send|ok|confirm|raise)/i.test(input)) { void submit(); return; }
        say({ from: 'bot', text: `Use the summary to change anything, or tap ${desk === 'admin' ? 'Send request' : 'Raise ticket'}.` });
        return;
      case 'done':
        if (/another|raise|new/i.test(input)) { setAnswers({}); setFields([]); setDesk(null); askDesk(); return; }
        reset();
        return;
      default:
    }
  };

  /* From the summary: ask one answer again. */
  const edit = (key: string) => {
    if (busy) return;
    const a = { ...answers };
    delete a[key];
    setAnswers(a);
    advance(fields, a);
  };

  const rows = summary(fields, answers, {});

  return { active, msgs, stage, busy, who, desk, rows, start, reset, reply, edit, submit };
}

export type TicketChat = ReturnType<typeof useTicketChat>;

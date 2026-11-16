/* The TA/DA conversation in Ask APIS: sign in with the TA/DA OTP, answer the
 * form's questions, check the summary, submit.
 *
 * Kept private to the person in front of the screen:
 *  - the sign-in token lives in a ref, in memory only - never in storage, so
 *    it is gone with the tab, and the next person at this desk has nothing;
 *  - the token is what the server files the request under (tada/assistant.py),
 *    so typing someone else's details cannot file as them;
 *  - reset() - Leave, New chat, the cross, or a different intranet user -
 *    wipes the token, every answer and every message;
 *  - the code itself is never shown back in the chat. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { API } from '../tada/shared';
import type { ChatMsg } from './SecureChatView';
import {
  LOCAL, LOCAL_ITEM, SKIP, TOUR, answer, localPayload, nextField, summary, tourPayload,
  type Answers, type Caps, type Field, type Kind,
} from './tadaChat';

export type TadaMsg = ChatMsg;

type Stage = 'id' | 'otp' | 'kind' | 'form' | 'item' | 'more' | 'review' | 'sending' | 'done';

const KINDS = { tour: 'Tour Programme', local: 'Local Travel', expense: 'Travelling Expenses' };
const MORE = ['Add another trip', 'That’s all'];
const DONE = ['Raise another request', 'Back to Ask APIS'];

/* Never throws: a network failure comes back as a failed answer like any other. */
async function post(path: string, body: object, token?: string): Promise<{ ok: boolean; status: number; d: Record<string, unknown> }> {
  let r: Response;
  try {
    r = await fetch(`${API}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The token goes in the body: a custom header would be refused by the
      // browser's cross-origin check.
      body: JSON.stringify(token ? { ...body, token } : body),
    });
  } catch {
    return { ok: false, status: 0, d: { error: 'I couldn’t reach the TA/DA server. Check your connection and try again.' } };
  }
  let d: Record<string, unknown>;
  try { d = await r.json(); } catch {
    d = { error: `The TA/DA server had a problem (${r.status}). Please try again in a moment.` };
  }
  return { ok: r.ok, status: r.status, d };
}

const errorOf = (d: Record<string, unknown>, fallback: string) =>
  (typeof d.error === 'string' && d.error) || fallback;

export function useTadaChat(employeeCode?: string) {
  const [active, setActive] = useState(false);
  const [msgs, setMsgs] = useState<TadaMsg[]>([]);
  const [stage, setStage] = useState<Stage>('id');
  const [busy, setBusy] = useState(false);
  const [who, setWho] = useState<{ name: string; employee_id: string; hq_city?: string } | null>(null);
  const [caps, setCaps] = useState<Caps>({});
  const [kind, setKind] = useState<Kind | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [items, setItems] = useState<Answers[]>([]);
  const [cur, setCur] = useState<Answers>({});
  const token = useRef<string | null>(null);
  const eid = useRef('');
  const nextId = useRef(1);

  const say = useCallback((m: Omit<TadaMsg, 'id'>) =>
    setMsgs(ms => [...ms, { ...m, id: nextId.current++ }]), []);

  const reset = useCallback(() => {
    token.current = null; eid.current = '';
    setActive(false); setMsgs([]); setStage('id'); setBusy(false); setWho(null); setCaps({});
    setKind(null); setAnswers({}); setItems([]); setCur({});
  }, []);

  /* Someone else signed in to the intranet: nothing of the last person's stays. */
  useEffect(() => reset, [employeeCode, reset]);

  const fieldsFor = (k: Kind | null) => (k === 'local_travel' ? LOCAL : TOUR);
  const ctx = { hqCity: who?.hq_city || undefined };

  const ask = (f: Field, a: Answers, c: Caps) => {
    const chips = [...(f.chips?.(a, c, ctx) ?? []), ...(f.optional ? [SKIP] : [])];
    say({ from: 'bot', text: f.ask(a, c), chips });
  };

  /* Ask whatever is unanswered next, or show the summary. */
  const advance = (k: Kind, a: Answers, c: Caps, list: Answers[] = items) => {
    const f = nextField(fieldsFor(k), a, c);
    if (f) { setStage('form'); ask(f, a, c); return; }
    if (k === 'local_travel' && list.length === 0) {
      setStage('item'); setCur({});
      say({ from: 'bot', text: 'Now the trips themselves — one at a time.', tone: 'note' });
      ask(LOCAL_ITEM[0], a, c);
      return;
    }
    setStage('review');
    say({ from: 'bot', text: 'Here’s everything. Check it over, change anything that’s off, then submit.', review: true });
  };

  const askKind = () => {
    setStage('kind');
    say({ from: 'bot', text: 'What would you like to raise?', chips: [KINDS.tour, KINDS.local, KINDS.expense] });
  };

  const askId = () => {
    setStage('id');
    say({
      from: 'bot',
      text: 'To keep your travel details private, please sign in to the TA/DA Portal first. What’s your Employee ID?',
      chips: employeeCode ? [employeeCode] : [],
    });
  };

  const start = (said?: string) => {
    reset();
    setActive(true);
    if (said) say({ from: 'user', text: said });
    say({ from: 'bot', tone: 'note',
      text: 'I can fill in a TA/DA request with you right here and send it for approval — the same questions as the portal’s form.' });
    askId();
  };

  const sendCode = async (id: string) => {
    setBusy(true);
    const { ok, d } = await post('auth/send-otp/', { employee_id: id });
    setBusy(false);
    if (!ok) { say({ from: 'bot', tone: 'error', text: errorOf(d, 'I couldn’t reach the TA/DA Portal. Please try again.'), chips: employeeCode ? [employeeCode] : [] }); return; }
    eid.current = id;
    setStage('otp');
    say({ from: 'bot', text: `I’ve emailed a 6-digit code to ${d.masked_email}. Type it here — it’s valid for 5 minutes.`,
      chips: ['Send a new code', 'Use a different ID'] });
    if (typeof d.dev_otp === 'string') {
      say({ from: 'bot', tone: 'note', text: `Local testing: email isn’t set up on this machine, so your code is ${d.dev_otp}.`, chips: [d.dev_otp] });
    }
  };

  const verify = async (code: string) => {
    setBusy(true);
    const { ok, d } = await post('assistant/verify/', { employee_id: eid.current, otp: code })
  ;
    setBusy(false);
    if (!ok) { say({ from: 'bot', tone: 'error', text: errorOf(d, 'That didn’t work. Please try again.'), chips: ['Send a new code'] }); return; }
    token.current = d.token as string;
    const u = d.user as { name: string; employee_id: string; hq_city?: string };
    const c = (d.caps ?? {}) as Caps;
    setWho(u); setCaps(c);
    say({ from: 'bot', tone: 'ok', text: `Signed in as ${u.name} (${u.employee_id}). Only you can see this conversation.` });
    // Signed in again after the sign-in ran out: carry on where they were.
    if (kind && Object.keys(answers).length) { advance(kind, answers, c); return; }
    askKind();
  };

  const submit = async () => {
    if (!kind || !token.current) { askId(); return; }
    setStage('sending'); setBusy(true);
    const keys = new Set(summary(fieldsFor(kind), answers, caps).map(s => s.key));
    const a = Object.fromEntries(Object.entries(answers).filter(([k]) => keys.has(k)));
    const data = kind === 'tour_sanction' ? tourPayload(a) : localPayload(a, items);
    const { ok, status, d } = await post('assistant/submit/', { kind, data }, token.current)
  ;
    setBusy(false);
    if (status === 401) {
      token.current = null;
      say({ from: 'bot', tone: 'error', text: `${errorOf(d, 'Your sign-in has expired.')} Your answers are kept.` });
      askId();
      return;
    }
    if (!ok) {
      setStage('review');
      say({ from: 'bot', tone: 'error', text: `${errorOf(d, 'The request couldn’t be submitted.')} Change it on the summary above and submit again.` });
      return;
    }
    const req = (d.request ?? {}) as { id?: number; status_label?: string };
    setStage('done');
    // Submitted: the answers are not needed any more, so they are not kept.
    setAnswers({}); setItems([]); setCur({}); setKind(null);
    say({ from: 'bot', tone: 'ok',
      text: `${d.message ?? 'Submitted.'}${req.id ? ` Request #${req.id}` : ''}${req.status_label ? ` · ${req.status_label}` : ''}. You can follow it in the TA/DA Portal.`,
      chips: DONE, portal: true });
  };

  /* Everything typed or tapped in the flow comes through here. */
  const reply = (raw: string) => {
    const input = raw.trim();
    if (!input || busy) return;
    const masked = stage === 'otp' && /^\d{4,8}$/.test(input);
    say({ from: 'user', text: masked ? '••••••' : input });

    switch (stage) {
      case 'id':
        void sendCode(input);
        return;
      case 'otp':
        if (/new code/i.test(input)) { void sendCode(eid.current); return; }
        if (/different id/i.test(input)) { askId(); return; }
        if (!/^\d{6}$/.test(input)) { say({ from: 'bot', tone: 'error', text: 'The code is 6 digits — please type just those.' }); return; }
        void verify(input);
        return;
      case 'kind': {
        const q = input.toLowerCase();
        if (/expense|bill|after/.test(q)) {
          say({ from: 'bot', text: 'Travelling Expenses need your bills uploaded, so please file those in the TA/DA Portal. I can raise a Tour Programme or a Local Travel claim here.',
            chips: [KINDS.tour, KINDS.local], portal: true });
          return;
        }
        const k: Kind | null = /tour|programme|program|sanction|trip/.test(q) ? 'tour_sanction'
          : /local|conveyance|city|cab|auto/.test(q) ? 'local_travel' : null;
        if (!k) { say({ from: 'bot', tone: 'error', text: 'Please pick one of the options.', chips: [KINDS.tour, KINDS.local, KINDS.expense] }); return; }
        setKind(k); setAnswers({}); setItems([]);
        say({ from: 'bot', tone: 'note', text: k === 'tour_sanction'
          ? 'Tour Programme — approval before you travel, for one destination city. (Several cities? Use the portal’s itinerary.) Type “skip” for anything optional.'
          : 'Local Travel — conveyance within the city. Type “skip” for anything optional.' });
        advance(k, {}, caps, []);
        return;
      }
      case 'form': {
        if (!kind) return;
        const f = nextField(fieldsFor(kind), answers, caps);
        if (!f) return;
        const r = answer(f, input, answers, caps);
        if ('error' in r) { say({ from: 'bot', tone: 'error', text: r.error, chips: [...(f.chips?.(answers, caps, ctx) ?? []), ...(f.optional ? [SKIP] : [])] }); return; }
        const a = { ...answers, [f.key]: r.value };
        setAnswers(a);
        advance(kind, a, caps);
        return;
      }
      case 'item': {
        const both = { ...answers, ...cur };
        const f = nextField(LOCAL_ITEM, cur, caps);
        if (!f) return;
        const r = answer(f, input, both, caps);
        if ('error' in r) { say({ from: 'bot', tone: 'error', text: r.error, chips: f.chips?.(answers, caps, ctx) }); return; }
        const c = { ...cur, [f.key]: r.value };
        const nf = nextField(LOCAL_ITEM, c, caps);
        if (nf) { setCur(c); ask(nf, { ...answers, ...c }, caps); return; }
        const list = [...items, c];
        setItems(list); setCur({}); setStage('more');
        say({ from: 'bot', text: `Got it — ${list.length} trip${list.length === 1 ? '' : 's'} so far. Add another?`, chips: MORE });
        return;
      }
      case 'more':
        if (/another|add|yes/i.test(input)) { setStage('item'); setCur({}); ask(LOCAL_ITEM[0], answers, caps); return; }
        setStage('review');
        say({ from: 'bot', text: 'Here’s everything. Check it over, change anything that’s off, then submit.', review: true });
        return;
      case 'review':
        if (/^(submit|yes|send|ok|confirm)/i.test(input)) { void submit(); return; }
        say({ from: 'bot', text: 'Use the summary to change anything, or tap Submit for approval.' });
        return;
      case 'done':
        if (/another|raise|new/i.test(input)) { askKind(); return; }
        reset();
        return;
      default:
    }
  };

  /* From the summary: ask one answer again. */
  const edit = (key: string) => {
    if (!kind || busy) return;
    const a = { ...answers };
    delete a[key];
    setAnswers(a);
    advance(kind, a, caps);
  };
  const removeItem = (i: number) => setItems(list => list.filter((_, j) => j !== i));
  const addItem = () => { if (busy) return; setStage('item'); setCur({}); ask(LOCAL_ITEM[0], answers, caps); };

  const rows = kind ? summary(fieldsFor(kind), answers, caps) : [];
  const itemRows = items.map(it => summary(LOCAL_ITEM, it, caps));

  return {
    active, msgs, stage, busy, who, kind, rows, itemRows,
    start, reset, reply, edit, removeItem, addItem, submit,
  };
}

export type TadaChat = ReturnType<typeof useTadaChat>;

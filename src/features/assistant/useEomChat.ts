/* Your Employee of the Month nomination in Ask APIS: sign in to EOM with the
 * emailed code, answer the form's questions, check it, then submit it or keep
 * it as a draft.
 *
 * Kept private to the person in front of the screen, as the other chats are:
 *  - the session token lives in a ref, in memory only - not in storage, and
 *    not the EOM page's saved sign-in;
 *  - the server only ever saves or submits the signed-in person's OWN
 *    nomination; there is no employee id or nomination number in the request
 *    to change (eom/assistant.py);
 *  - the session is 30 minutes, and reset() - Leave, New chat, the cross, or
 *    a different intranet user - ends it on the server and wipes the answers
 *    and messages here;
 *  - the code is never shown back in the chat. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiBase } from '../../apiBase';
import type { ChatMsg } from './SecureChatView';
import { answer, nextField, summary, SKIP, type Answers, type Field } from './tadaChat';
import { eomFields, eomPayload, fromDraft, MIN_PART_A_WORDS, words } from './eomChat';

type Stage = 'id' | 'otp' | 'cycle' | 'form' | 'review' | 'sending' | 'done' | 'stop';

interface Cycle {
  cycle_id: number; name: string; month: string; year: number;
  status: string; status_label: string; editable: boolean;
  form: Record<string, string | boolean> | null;
}
export interface EomProfile { name: string; employee_id: string; designation: string; department: string; zone: string }

const API = `${apiBase()}/api/eom`;
const DONE = ['Back to Ask APIS'];
const RESTART_PART_A = 'Start Part A over';

/* Never throws: a network failure comes back as a failed answer like any other. */
async function post(path: string, body: object): Promise<{ ok: boolean; status: number; d: Record<string, unknown> }> {
  let r: Response;
  try {
    r = await fetch(`${API}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, d: { error: 'I couldn’t reach Employee of the Month. Check your connection and try again.' } };
  }
  let d: Record<string, unknown>;
  try { d = await r.json(); } catch {
    d = { error: `Employee of the Month had a problem (${r.status}). Please try again in a moment.` };
  }
  return { ok: r.ok, status: r.status, d };
}

/* The server's error, with its list of what to fix when it sends one. */
const errorOf = (d: Record<string, unknown>, fallback: string) => {
  const msg = (typeof d.error === 'string' && d.error) || fallback;
  const problems = Array.isArray(d.problems) ? (d.problems as string[]) : [];
  return problems.length ? `${msg}\n• ${problems.join('\n• ')}` : msg;
};

export function useEomChat(employeeCode?: string) {
  const [active, setActive] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [stage, setStage] = useState<Stage>('id');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<EomProfile | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const token = useRef<string | null>(null);
  const eid = useRef('');
  const nextId = useRef(1);

  const say = useCallback((m: Omit<ChatMsg, 'id'>) =>
    setMsgs(ms => [...ms, { ...m, id: nextId.current++ }]), []);

  const reset = useCallback(() => {
    // End the session on the server too. Fire and forget: leaving must not
    // wait on the network.
    if (token.current) void post('assistant/logout/', { token: token.current });
    token.current = null; eid.current = '';
    setActive(false); setMsgs([]); setStage('id'); setBusy(false); setProfile(null);
    setCycles([]); setCycle(null); setFields([]); setAnswers({});
  }, []);

  /* Someone else signed in to the intranet: nothing of the last person's stays. */
  useEffect(() => reset, [employeeCode, reset]);

  const ask = (f: Field, a: Answers) => {
    if (f.key === 'part_a_achievement' && a._part_a) {
      const n = words(a._part_a);
      say({ from: 'bot', chips: [RESTART_PART_A],
        text: `Part A so far: ${n} words — ${MIN_PART_A_WORDS - n} more to go. Send the rest and I’ll add it on.` });
      return;
    }
    say({ from: 'bot', text: f.ask(a, {}), chips: [...(f.chips?.(a, {}, {}) ?? []), ...(f.optional ? [SKIP] : [])] });
  };

  const advance = (fs: Field[], a: Answers) => {
    const f = nextField(fs, a, {});
    if (f) { setStage('form'); ask(f, a); return; }
    setStage('review');
    say({ from: 'bot', review: true,
      text: 'Here’s your nomination. Check it, change anything that’s off, then submit it for HOD review — or keep it as a draft.' });
  };

  const askId = () => {
    setStage('id');
    say({ from: 'bot', text: 'To keep your nomination private, please sign in to Employee of the Month first. What’s your Employee ID?',
      chips: employeeCode ? [employeeCode] : [] });
  };

  const start = (said?: string) => {
    reset();
    setActive(true);
    if (said) say({ from: 'user', text: said });
    say({ from: 'bot', tone: 'note',
      text: 'I can fill in your Employee of the Month nomination with you right here — the same questions as the EOM form — and submit it for review.' });
    askId();
  };

  const sendCode = async (id: string) => {
    setBusy(true);
    const { ok, d } = await post('auth/send-otp/', { employee_id: id });
    setBusy(false);
    if (!ok) { say({ from: 'bot', tone: 'error', text: errorOf(d, 'I couldn’t send a code. Please try again.'), chips: employeeCode ? [employeeCode] : [] }); return; }
    eid.current = id;
    setStage('otp');
    say({ from: 'bot', text: `I’ve emailed a 6-digit code to ${d.masked_email}. Type it here — it’s valid for 5 minutes.`,
      chips: ['Send a new code', 'Use a different ID'] });
    if (typeof d.dev_otp === 'string') {
      say({ from: 'bot', tone: 'note', text: `Local testing: email isn’t set up on this machine, so your code is ${d.dev_otp}.`, chips: [d.dev_otp] });
    }
  };

  /* A month chosen: say where it stands, and pick up any draft. */
  const openCycle = (c: Cycle, p: EomProfile) => {
    setCycle(c);
    if (!c.editable) {
      setStage('stop');
      say({ from: 'bot', text: `Your ${c.name} nomination is already “${c.status_label}”, so it can’t be changed here. You can follow it in Employee of the Month.`,
        chips: DONE, portal: true });
      return;
    }
    const fs = eomFields(`${c.month} ${c.year}`, p.name);
    setFields(fs);
    const a = fromDraft(c.form);
    setAnswers(a);
    say({ from: 'bot', tone: 'note',
      text: `${c.name}. Your details go on the form as they are in EOM: ${p.name} · ${p.employee_id}${p.designation ? ` · ${p.designation}` : ''}${p.department ? ` · ${p.department}` : ''}.`
        + (Object.keys(a).length ? ' You have a draft — I’ll carry on from where you left off.' : '') });
    advance(fs, a);
  };

  const verify = async (code: string) => {
    setBusy(true);
    const { ok, d } = await post('assistant/verify/', { employee_id: eid.current, otp: code });
    setBusy(false);
    if (!ok) { say({ from: 'bot', tone: 'error', text: errorOf(d, 'That didn’t work. Please try again.'), chips: ['Send a new code'] }); return; }
    token.current = d.token as string;
    const p = d.profile as EomProfile;
    setProfile(p);
    const list = (d.cycles ?? []) as Cycle[];
    setCycles(list);
    say({ from: 'bot', tone: 'ok', text: `Signed in as ${p.name} (${p.employee_id}). Only you can see this conversation.` });
    if (!d.can_nominate) {
      setStage('stop');
      say({ from: 'bot', text: 'Only employees nominate themselves — your EOM role is a reviewer’s. You can review nominations in Employee of the Month.', chips: DONE, portal: true });
      return;
    }
    if (!list.length) {
      setStage('stop');
      say({ from: 'bot', text: 'No nomination month is open right now, so there’s nothing to fill in. HR opens one each month.', chips: DONE, portal: true });
      return;
    }
    // Signed in again after the session ran out: back to the nomination as it was.
    if (cycle && fields.length) { advance(fields, answers); return; }
    if (list.length > 1) {
      setStage('cycle');
      say({ from: 'bot', text: 'Which month is this nomination for?', chips: list.map(c => c.name) });
      return;
    }
    openCycle(list[0], p);
  };

  const save = async (submit: boolean) => {
    if (!cycle || !token.current) { askId(); return; }
    setStage('sending'); setBusy(true);
    const { ok, status, d } = await post('assistant/save/',
      { token: token.current, cycle_id: cycle.cycle_id, submit, ...eomPayload(answers) });
    setBusy(false);
    if (status === 401) {
      token.current = null; setProfile(null);
      say({ from: 'bot', tone: 'error', text: `${errorOf(d, 'Your sign-in has expired.')} Your answers are kept here.` });
      askId();
      return;
    }
    if (!ok) {
      setStage('review');
      say({ from: 'bot', tone: 'error', text: `${errorOf(d, 'The nomination couldn’t be saved.')}\nChange it on the summary above and try again.` });
      return;
    }
    setStage('done');
    say({ from: 'bot', tone: 'ok', chips: DONE, portal: true,
      text: submit
        ? `Submitted! Your ${cycle.name} nomination is now “${d.status_label}” and goes to your HOD for review. Want to attach documents? Add them in Employee of the Month.`
        : 'Saved as a draft. Come back any time — here or in Employee of the Month — to finish and submit it.' });
    // Saved on the server: nothing of it needs to stay in this tab.
    setAnswers({});
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
      case 'cycle': {
        const c = cycles.find(x => x.name.toLowerCase() === input.toLowerCase())
          ?? cycles.find(x => x.name.toLowerCase().includes(input.toLowerCase()));
        if (!c || !profile) { say({ from: 'bot', tone: 'error', text: 'Please pick one of the months.', chips: cycles.map(x => x.name) }); return; }
        openCycle(c, profile);
        return;
      }
      case 'form': {
        const f = nextField(fields, answers, {});
        if (!f) return;
        // Part A: added up over as many messages as it takes.
        if (f.key === 'part_a_achievement') {
          if (input === RESTART_PART_A) {
            const a = { ...answers }; delete a._part_a;
            setAnswers(a); ask(f, a); return;
          }
          const draft = answers._part_a ? `${answers._part_a}\n\n${input}` : input;
          if (words(draft) < MIN_PART_A_WORDS) {
            const a = { ...answers, _part_a: draft };
            setAnswers(a); ask(f, a); return;
          }
          const a: Answers = { ...answers, part_a_achievement: draft };
          delete a._part_a;
          setAnswers(a);
          say({ from: 'bot', tone: 'note', text: `Part A done — ${words(draft)} words.` });
          advance(fields, a);
          return;
        }
        const r = answer(f, input, answers, {});
        if ('error' in r) { say({ from: 'bot', tone: 'error', text: r.error, chips: f.chips?.(answers, {}, {}) }); return; }
        const a = { ...answers, [f.key]: r.value };
        setAnswers(a);
        advance(fields, a);
        return;
      }
      case 'review':
        if (/^(submit|send)/i.test(input)) { void save(true); return; }
        if (/draft|save/i.test(input)) { void save(false); return; }
        say({ from: 'bot', text: 'Use the summary above to change anything, then Submit for review or Save as draft.' });
        return;
      case 'done':
      case 'stop':
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
    if (key === 'part_a_achievement') delete a._part_a;
    // Changing the first piece of evidence re-asks where it is from.
    if (key === 'evidence_1_description') delete a.evidence_1_source;
    if (key === 'evidence_2_description') delete a.evidence_2_source;
    setAnswers(a);
    advance(fields, a);
  };

  const rows = summary(fields, answers, {});

  return { active, msgs, stage, busy, profile, cycle, rows, start, reset, reply, edit, save };
}

export type EomChat = ReturnType<typeof useEomChat>;

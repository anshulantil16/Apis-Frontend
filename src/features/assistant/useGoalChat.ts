/* Filling your goal sheet in Ask APIS: sign in to Goal Setting with the
 * emailed code, add KRAs and their KPIs, check the sheet, then submit it to
 * your manager or keep it as a draft.
 *
 * Kept private to the person in front of the screen, as the other chats are:
 *  - the session token lives in a ref, in memory only - not in storage, and
 *    not the Goal Setting page's saved sign-in;
 *  - the server only ever opens, saves or submits the signed-in person's OWN
 *    sheet; there is no employee id in the request to change
 *    (goalsetting/assistant.py);
 *  - the session is 30 minutes, and reset() - Leave, New chat, the cross, or
 *    a different intranet user - ends it on the server and wipes the sheet,
 *    the answers and the messages here;
 *  - the code is never shown back in the chat. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiBase } from '../../apiBase';
import type { ChatMsg } from './SecureChatView';
import { answer, nextField, SKIP, type Answers, type Field } from './tadaChat';
import { kpiFields, kraFields, toKpi, totalOf, type Kra } from './goalChat';

type Stage = 'id' | 'otp' | 'cycle' | 'keep' | 'kra' | 'kpi' | 'next' | 'review' | 'sending' | 'done' | 'stop';

interface Sheet {
  cycle_id: number; cycle_name: string; fiscal_year: string; deadline: string | null;
  status: string; status_label: string; editable: boolean; kras: Kra[];
}

const API = `${apiBase()}/api/goalsetting`;
const NEXT = { kpi: 'Add another KPI to this KRA', kra: 'Add another KRA', done: 'That’s all — show my sheet' };
// The way into Goal Setting itself is the link under the message (portal: true).
const DONE = ['Back to Ask APIS'];

/* Never throws: a network failure comes back as a failed answer like any other. */
async function post(path: string, body: object): Promise<{ ok: boolean; status: number; d: Record<string, unknown> }> {
  let r: Response;
  try {
    r = await fetch(`${API}/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, d: { error: 'I couldn’t reach Goal Setting. Check your connection and try again.' } };
  }
  let d: Record<string, unknown>;
  try { d = await r.json(); } catch {
    d = { error: `Goal Setting had a problem (${r.status}). Please try again in a moment.` };
  }
  return { ok: r.ok, status: r.status, d };
}

/* The server's error, with its list of what to fix when it sends one. */
const errorOf = (d: Record<string, unknown>, fallback: string) => {
  const msg = (typeof d.error === 'string' && d.error) || fallback;
  const problems = Array.isArray(d.problems) ? (d.problems as string[]) : [];
  return problems.length ? `${msg}\n• ${problems.join('\n• ')}` : msg;
};

export function useGoalChat(employeeCode?: string) {
  const [active, setActive] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [stage, setStage] = useState<Stage>('id');
  const [busy, setBusy] = useState(false);
  const [who, setWho] = useState<string | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [vocab, setVocab] = useState<{ categories: string[]; frequencies: string[] }>({ categories: [], frequencies: [] });
  const [kras, setKras] = useState<Kra[]>([]);
  const [kra, setKra] = useState<Answers>({});      // the KRA being asked about
  const [kpi, setKpi] = useState<Answers>({});      // the KPI being asked about
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
    setActive(false); setMsgs([]); setStage('id'); setBusy(false); setWho(null);
    setSheets([]); setSheet(null); setVocab({ categories: [], frequencies: [] });
    setKras([]); setKra({}); setKpi({});
  }, []);

  /* Someone else signed in to the intranet: nothing of the last person's stays. */
  useEffect(() => reset, [employeeCode, reset]);

  const ask = (f: Field, a: Answers) =>
    say({ from: 'bot', text: f.ask(a, {}), chips: [...(f.chips?.(a, {}, {}) ?? []), ...(f.optional ? [SKIP] : [])] });

  /* Weightage still free, counting the KRA in progress. */
  const free = (list: Kra[], current: Kra | null) =>
    Math.max(0, Math.round((100 - totalOf(current ? [...list, current] : list)) * 100) / 100);
  const currentKra = (a: Answers, kpisSoFar: Kra['kpis']): Kra =>
    ({ category: a.category, title: a.title, description: a.description || '', kpis: kpisSoFar });
  const kpisOf = (a: Answers) => (a._kpis ? (JSON.parse(a._kpis) as Kra['kpis']) : []);

  const startKra = (list: Kra[]) => {
    setStage('kra'); setKra({}); setKpi({});
    say({ from: 'bot', tone: 'note', text: `KRA ${list.length + 1}${list.length ? '' : ' — your first Key Result Area'}.` });
    ask(kraFields(vocab.categories)[0], {});
  };
  const startKpi = (list: Kra[], a: Answers) => {
    setStage('kpi'); setKpi({});
    const f = kpiFields(vocab.frequencies, free(list, currentKra(a, kpisOf(a))))[0];
    ask(f, {});
  };

  const showReview = (list: Kra[]) => {
    setStage('review');
    const t = totalOf(list);
    say({ from: 'bot', review: true,
      text: t === 100 ? 'Here’s your goal sheet — weightage is at exactly 100%. Check it, then submit it to your manager or keep it as a draft.'
        : `Here’s your goal sheet. Weightage is at ${t}% — it has to be exactly 100% to submit. You can still save it as a draft.` });
  };

  const askId = () => {
    setStage('id');
    say({ from: 'bot', text: 'To keep your goals private, please sign in to Goal Setting first. What’s your Employee ID?',
      chips: employeeCode ? [employeeCode] : [] });
  };

  const start = (said?: string) => {
    reset();
    setActive(true);
    if (said) say({ from: 'user', text: said });
    say({ from: 'bot', tone: 'note',
      text: 'I can fill in your goal sheet with you right here — KRAs and their KPIs, the same columns as Goal Setting — and submit it to your manager.' });
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

  /* A sheet chosen: say where it stands, and what happens to goals already on it. */
  const openSheet = (s: Sheet) => {
    setSheet(s);
    if (!s.editable) {
      setStage('stop');
      say({ from: 'bot', text: `Your ${s.cycle_name} sheet is “${s.status_label}”, so it isn’t yours to edit right now. You can follow it in Goal Setting.`,
        chips: DONE, portal: true });
      return;
    }
    if (s.kras.length) {
      setStage('keep');
      say({ from: 'bot', chips: ['Add to my sheet', 'Start fresh'],
        text: `Your ${s.cycle_name} sheet already has ${s.kras.length} KRA${s.kras.length === 1 ? '' : 's'} (${totalOf(s.kras)}% weightage). Shall I add new ones to it, or start fresh? Start fresh replaces them when you save.` });
      return;
    }
    setKras([]);
    startKra([]);
  };

  const verify = async (code: string) => {
    setBusy(true);
    const { ok, d } = await post('assistant/verify/', { employee_id: eid.current, otp: code });
    setBusy(false);
    if (!ok) { say({ from: 'bot', tone: 'error', text: errorOf(d, 'That didn’t work. Please try again.'), chips: ['Send a new code'] }); return; }
    token.current = d.token as string;
    setWho(d.name as string);
    const v = { categories: d.categories as string[], frequencies: d.frequencies as string[] };
    setVocab(v);
    const list = (d.sheets ?? []) as Sheet[];
    setSheets(list);
    say({ from: 'bot', tone: 'ok', text: `Signed in as ${d.name} (${d.employee_id}). Only you can see this conversation.` });
    if (!list.length) {
      setStage('stop');
      say({ from: 'bot', text: 'No goal-setting cycle is open right now, so there’s no sheet to fill. Your admin opens one when it’s time.', chips: DONE, portal: true });
      return;
    }
    // Signed in again after the session ran out: back to the sheet as it was.
    if (sheet && kras.length) { showReview(kras); return; }
    if (list.length > 1) {
      setStage('cycle');
      say({ from: 'bot', text: 'Which goal-setting cycle is this for?', chips: list.map(s => s.cycle_name) });
      return;
    }
    // vocab is set above, but state lands on the next render - pass it on.
    openSheetWith(list[0], v);
  };
  /* openSheet, with the vocabulary just received rather than last render's. */
  const openSheetWith = (s: Sheet, v: { categories: string[]; frequencies: string[] }) => {
    if (s.editable && !s.kras.length) {
      setSheet(s); setKras([]); setStage('kra'); setKra({}); setKpi({});
      say({ from: 'bot', tone: 'note', text: 'KRA 1 — your first Key Result Area.' });
      ask(kraFields(v.categories)[0], {});
      return;
    }
    openSheet(s);
  };

  const save = async (submit: boolean) => {
    if (!sheet || !token.current) { askId(); return; }
    setStage('sending'); setBusy(true);
    const { ok, status, d } = await post('assistant/save/', { token: token.current, cycle_id: sheet.cycle_id, kras, submit });
    setBusy(false);
    if (status === 401) {
      token.current = null; setWho(null);
      say({ from: 'bot', tone: 'error', text: `${errorOf(d, 'Your sign-in has expired.')} Your sheet is kept here.` });
      askId();
      return;
    }
    if (!ok) {
      setStage('review');
      say({ from: 'bot', tone: 'error', text: `${errorOf(d, 'The sheet couldn’t be saved.')}\nChange it on the sheet above and try again.` });
      return;
    }
    setStage('done');
    say({ from: 'bot', tone: 'ok', chips: DONE, portal: true,
      text: submit
        ? `Submitted! Your ${sheet.cycle_name} goal sheet is now “${d.status_label}”. You’ll see your manager’s and HOD’s comments in Goal Setting.`
        : `Saved as a draft (${d.total_weightage}% weightage). Come back any time — here or in Goal Setting — to finish and submit it.` });
    // Saved on the server: nothing of it needs to stay in this tab.
    setKras([]); setKra({}); setKpi({});
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
        const s = sheets.find(x => x.cycle_name.toLowerCase() === input.toLowerCase())
          ?? sheets.find(x => x.cycle_name.toLowerCase().includes(input.toLowerCase()));
        if (!s) { say({ from: 'bot', tone: 'error', text: 'Please pick one of the cycles.', chips: sheets.map(x => x.cycle_name) }); return; }
        openSheet(s);
        return;
      }
      case 'keep': {
        if (!sheet) return;
        const fresh = /fresh|new|replace|clear/i.test(input);
        const list = fresh ? [] : sheet.kras;
        setKras(list);
        say({ from: 'bot', tone: 'note', text: fresh ? 'Starting fresh — the old KRAs are replaced when you save.' : `Adding to your sheet — ${totalOf(list)}% is already used.` });
        startKra(list);
        return;
      }
      case 'kra': {
        const fs = kraFields(vocab.categories);
        const f = nextField(fs, kra, {});
        if (!f) return;
        const r = answer(f, input, kra, {});
        if ('error' in r) { say({ from: 'bot', tone: 'error', text: r.error, chips: f.chips?.(kra, {}, {}) }); return; }
        const a = { ...kra, [f.key]: r.value };
        setKra(a);
        const nf = nextField(fs, a, {});
        if (nf) { ask(nf, a); return; }
        say({ from: 'bot', tone: 'note', text: `Now the KPIs for “${a.title}” — how it will be measured.` });
        startKpi(kras, a);
        return;
      }
      case 'kpi': {
        const fs = kpiFields(vocab.frequencies, free(kras, currentKra(kra, kpisOf(kra))));
        const f = nextField(fs, kpi, {});
        if (!f) return;
        const r = answer(f, input, kpi, {});
        if ('error' in r) { say({ from: 'bot', tone: 'error', text: r.error, chips: f.chips?.(kpi, {}, {}) }); return; }
        const a = { ...kpi, [f.key]: r.value };
        setKpi(a);
        const nf = nextField(fs, a, {});
        if (nf) { ask(nf, a); return; }
        // A KPI complete: it joins the KRA in progress.
        const kpis = [...kpisOf(kra), toKpi(a)];
        const k = { ...kra, _kpis: JSON.stringify(kpis) };
        setKra(k); setKpi({});
        const left = free(kras, currentKra(k, kpis));
        setStage('next');
        say({ from: 'bot', chips: [NEXT.kpi, NEXT.kra, NEXT.done],
          text: left > 0 ? `Added. ${left}% of the weightage is still free. What next?`
            : 'Added — that brings the sheet to 100%. What next?' });
        return;
      }
      case 'next': {
        const done = currentKra(kra, kpisOf(kra));
        if (/another kpi|kpi/i.test(input)) { startKpi(kras, kra); return; }
        const list = [...kras, done];
        setKras(list); setKra({});
        if (/another kra|kra/i.test(input)) { startKra(list); return; }
        showReview(list);
        return;
      }
      case 'review':
        if (/^(submit|send)/i.test(input)) { void save(true); return; }
        if (/draft|save/i.test(input)) { void save(false); return; }
        say({ from: 'bot', text: 'Use the sheet above to change anything, then Submit to manager or Save as draft.' });
        return;
      case 'done':
      case 'stop':
        reset();
        return;
      default:
    }
  };

  /* From the sheet card. */
  const removeKpi = (i: number, j: number) => setKras(list => list
    .map((k, x) => (x === i ? { ...k, kpis: k.kpis.filter((_, y) => y !== j) } : k))
    .filter(k => k.kpis.length > 0));
  const removeKra = (i: number) => setKras(list => list.filter((_, x) => x !== i));
  const addKra = () => { if (!busy) startKra(kras); };

  return {
    active, msgs, stage, busy, who, sheet, kras, total: totalOf(kras),
    start, reset, reply, removeKpi, removeKra, addKra, save,
  };
}

export type GoalChat = ReturnType<typeof useGoalChat>;

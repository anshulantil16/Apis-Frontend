/* Sending the morning mail.

   Two buttons and not one, deliberately. The first sends the whole run to a
   single address -- every message composed exactly as it will go out, same
   subject, same table cut to that reader, same attachments -- so what gets
   approved is the thing itself rather than a description of it. Only then is
   the second one worth pressing.

   There is no schedule behind this. A daily mail to the sales leadership that
   fires on its own the morning after a bad upload is a worse failure than one
   that did not go at all. */
import { useState, useEffect, useCallback } from 'react';
import { Send, Eye, AlertTriangle, MailCheck, Loader2 } from 'lucide-react';
import { Panel, sqFetch, readSession } from './SalesIQShared';

export function SendPanel({ mayEdit, recipients }:
  { mayEdit: boolean; recipients?: any }) {
  const [box, setBox] = useState<any>(null);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState<any>(null);
  // Seeded with whoever is signed in: typing your own address every morning
  // is the kind of friction that ends with somebody skipping the test.
  const [testTo, setTestTo] = useState(() => readSession()?.email || '');

  const load = useCallback(async () => {
    try {
      const r = await sqFetch('/mail/outbox/');
      setBox(r.ok ? await r.json() : null);
    } catch { setBox(null); }
  }, []);
  useEffect(() => { load(); }, [load, recipients]);

  const people: any[] = box?.recipients || [];
  const broken = people.filter(p => p.error);
  const ready = people.filter(p => !p.error);

  const fire = async (test: boolean) => {
    if (!test && !window.confirm(
      `Send today's report to ${ready.length} recipient`
      + `${ready.length === 1 ? '' : 's'}? This goes to their real inboxes.`)) {
      return;
    }
    setBusy(test ? 'test' : 'real');
    setResult(null);
    try {
      const r = await sqFetch('/mail/send/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test
          ? { test_to: testTo }
          : { skip_broken: broken.length > 0 }),
      });
      const j = await r.json();
      setResult(r.ok ? j : { error: j.error, results: j.failed || [] });
      if (r.ok && !test) load();
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : 'Could not send' });
    } finally { setBusy(''); }
  };

  if (!mayEdit) return null;

  const blocked = !!busy || !ready.length || !box?.configured;

  return (
    <Panel title="Send the morning mail" icon={Send}
      subtitle={box?.snapshot
        ? `${ready.length} ready · from ${box.from || 'no account set'}`
        : 'Upload the daily sheet first'}>

      {box && !box.configured && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50/70 border
                        border-rose-100 p-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11.5px] text-rose-900/80 leading-relaxed min-w-0">
            <b>No sending account is set up on this server.</b> Nothing can go
            out until <code>EMAIL_HOST_USER</code> and{' '}
            <code>EMAIL_HOST_PASSWORD</code> are in the .env.
          </p>
        </div>
      )}

      {box && box.attachment_format === 'html' && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50/70 border
                        border-amber-100 p-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11.5px] text-amber-900/80 leading-relaxed min-w-0">
            <b>Reports will be attached as .html, not PDF.</b> Gmail shows an
            .html attachment as its own source code, so readers have to
            download it before they see the report. Installing WeasyPrint on
            the server fixes it — the mail still sends either way.
          </p>
        </div>
      )}

      {broken.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50/70 border
                        border-amber-100 p-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-[11.5px] text-amber-900/80 leading-relaxed min-w-0">
            <b>{broken.length} cannot be built, so {broken.length === 1
              ? 'it will be' : 'they will be'} left out.</b>
            <ul className="mt-1 space-y-0.5">
              {broken.slice(0, 4).map(p => (
                <li key={p.id}>{p.email} — {p.error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
        <p className="text-[12px] text-slate-700 font-bold mb-1.5">
          1. Send the whole run to yourself first
        </p>
        <p className="text-[11.5px] text-slate-500 leading-relaxed mb-2.5">
          Every message exactly as it will go out — same subject, same table cut
          to each reader, same attachments — all delivered to one address.
          Nobody else is touched, and nothing is marked as sent.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <input id="salesiq-test-to" value={testTo}
            onChange={e => setTestTo(e.target.value)}
            placeholder="your@apisindia.com"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-200
                       text-[12px] focus:outline-none focus:border-indigo-400" />
          <button onClick={() => fire(true)} disabled={blocked || !testTo}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border
                       border-indigo-200 text-indigo-700 text-[12px] font-bold
                       hover:bg-indigo-50 disabled:opacity-40 transition-all">
            {busy === 'test'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Eye className="w-3.5 h-3.5" />}
            Send me the test run
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5">
        <p className="text-[12px] text-slate-700 font-bold mb-1.5">
          2. Send it to the list
        </p>
        <p className="text-[11.5px] text-slate-500 leading-relaxed mb-2.5">
          {ready.length} recipient{ready.length === 1 ? '' : 's'}, each getting
          their own territory and nobody else&#8217;s.
        </p>
        <button onClick={() => fire(false)} disabled={blocked}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600
                     text-white text-[12px] font-bold hover:bg-indigo-700
                     disabled:opacity-40 transition-all">
          {busy === 'real'
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Send className="w-3.5 h-3.5" />}
          Send to all {ready.length}
        </button>
      </div>

      {result && (
        <div className={`mt-3 rounded-xl border p-3.5 ${result.error
          ? 'bg-rose-50/70 border-rose-100'
          : 'bg-emerald-50/70 border-emerald-100'}`}>
          {result.error
            ? <p className="text-[12px] text-rose-900/80">{result.error}</p>
            : (
              <p className="text-[12px] font-bold text-emerald-800
                            flex items-center gap-1.5">
                <MailCheck className="w-4 h-4 flex-shrink-0" />
                {result.test
                  ? `${result.sent} message${result.sent === 1 ? '' : 's'} sent `
                    + `to ${result.to} — nothing went to anybody else.`
                  : `Sent to ${result.sent} recipient${result.sent === 1 ? '' : 's'}.`}
              </p>
            )}
          {(result.results || []).filter((x: any) => !x.ok).length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11.5px] text-rose-900/80">
              {result.results.filter((x: any) => !x.ok).map((x: any, i: number) => (
                <li key={i}>{x.email} — {x.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {people.length > 0 && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {people.map(p => {
            const n = (p.attachments || []).length;
            return (
              <div key={p.id}
                className={`rounded-lg border px-3 py-2 min-w-0 ${p.error
                  ? 'border-amber-200 bg-amber-50/40'
                  : 'border-slate-200 bg-white'}`}>
                <p className="text-[12px] font-bold text-slate-800 truncate">
                  {p.name || p.email}
                  {p.role === 'manager' && (
                    <span className="ml-1.5 text-[10px] font-bold text-indigo-600">
                      GROUP
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{p.email}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {p.error
                    ? p.error
                    : `${n} attachment${n === 1 ? '' : 's'}`
                      + (p.last_sent_at
                        ? ` · last sent ${new Date(p.last_sent_at).toLocaleString()}`
                        : ' · never sent')}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

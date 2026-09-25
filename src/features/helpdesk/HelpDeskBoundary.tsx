/* A render error must not leave a blank page.

   There is no error boundary anywhere in this app, so any exception thrown
   during render unmounts the whole tree and leaves white — no message, no
   console entry the person reporting it would think to look at, nothing to
   act on. That symptom has been reported twice on this screen, and once it
   was a Rules-of-Hooks violation on the login/logout transition (see the
   comment on `stats` in HelpDeskPage). Without a boundary, every future one
   looks identical and is diagnosed by guesswork.

   So: catch it, say so, offer the two things that actually help — reload,
   and sign out, because a session that has gone strange survives a reload
   and does not survive signing out. The error text is shown rather than
   hidden, since the person who sees it is the person who can tell us. */
import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, LogOut } from 'lucide-react';

import { clearSession } from './HelpDeskShared';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class HelpDeskBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Kept for the browser console, where it can be read out over a call.
    console.error('[Help Desk] render failed', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-900">This screen did not load</h2>
              <p className="text-[12.5px] text-slate-500 mt-1">
                Something went wrong while drawing the page. Nothing you did is lost —
                everything here is saved on the server.
              </p>
            </div>
          </div>

          <pre className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px]
                          text-slate-500 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
            {error.message || String(error)}
          </pre>

          <div className="flex items-center gap-2 mt-4">
            <button onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white
                         text-[12px] font-black hover:bg-slate-800 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Reload
            </button>
            <button onClick={() => { clearSession(); window.location.reload(); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200
                         text-slate-600 text-[12px] font-black hover:bg-slate-50 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Sign out and back in
            </button>
          </div>

          <p className="text-[11px] text-slate-400 mt-3">
            If it keeps happening, the line above is the useful part to pass on.
          </p>
        </div>
      </div>
    );
  }
}

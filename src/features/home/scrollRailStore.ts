/* Whether the content area's scrollbar should be hidden. A tool's sign-in
 * screen asks for that (useHideScrollRail, or <HideScrollRail /> in JSX) -
 * those screens are a single card with nothing to scroll to. A count rather
 * than a flag, so two screens mounting and unmounting out of order can't
 * leave it wrong. */
import { useEffect, useSyncExternalStore } from 'react';

let hiders = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useScrollRailHidden() {
  return useSyncExternalStore(subscribe, () => hiders > 0);
}

/* Hide the rail while the calling component is on screen. */
export function useHideScrollRail() {
  useEffect(() => {
    hiders++;
    emit();
    return () => { hiders--; emit(); };
  }, []);
}

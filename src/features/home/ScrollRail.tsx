/* The intranet's content area shows a plain scrollbar on every page, except
 * a tool's sign-in screen - a single card with nothing to scroll to. Those
 * screens render <HideScrollRail /> (or call useHideScrollRail) and the
 * shell hides the bar while they are up. */
import { useHideScrollRail } from './scrollRailStore';

/* For use inside a sign-in screen's JSX, where a hook can't go. */
export function HideScrollRail() {
  useHideScrollRail();
  return null;
}

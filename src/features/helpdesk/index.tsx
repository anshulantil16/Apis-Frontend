/* helpdesk — public entry point. Import from '@/features/helpdesk' rather
   than reaching into individual files, so internals can move freely.

   The page is wrapped rather than exported bare: a render error anywhere
   inside it used to unmount the whole tree and leave a blank white screen
   with nothing to report. Wrapping it here means every caller gets that
   protection without having to remember. */
import { HelpDeskBoundary } from './HelpDeskBoundary';
import { HelpDeskPage as Page } from './HelpDeskPage';

export function HelpDeskPage(props: { onNavigateBack?: () => void } = {}) {
  return (
    <HelpDeskBoundary>
      <Page {...props} />
    </HelpDeskBoundary>
  );
}

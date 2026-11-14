/* The new joiner's welcome (see WelcomeToast): the preview switch, and
   telling the server it has been shown. */
import { portalFetch } from '../portal/session';

/* ?welcome-preview in the address: show it to anyone, without marking it. */
export const isWelcomePreview = () => {
  try { return new URLSearchParams(window.location.search).has('welcome-preview'); } catch { return false; }
};

export const markWelcomed = () => { void portalFetch('/me/welcomed/', { method: 'POST' }).catch(() => {}); };

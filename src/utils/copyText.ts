/* Copy a short string to the clipboard, on http as well as https.
 *
 * `navigator.clipboard` only exists in a secure context: https, or
 * localhost. The intranet is served over plain http on its own network, so
 * on a developer's machine the modern API is there and on QA and Live it is
 * `undefined` — a copy button that works all through development and does
 * nothing at all once deployed. That is exactly what happened to the Health
 * Insurance policy number.
 *
 * So: use the real API where it exists, and fall back to the old
 * execCommand('copy') on a throwaway textarea, which every current browser
 * still supports and which has no secure-context rule. Returns whether the
 * text reached the clipboard, so a caller can select the text on screen and
 * say "press Ctrl+C" rather than claim a copy that never happened.
 */
export async function copyText(text: string): Promise<boolean> {
  // The modern path. `isSecureContext` is checked as well as the object
  // itself: some browsers expose a clipboard that rejects on http.
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* Denied by permissions, or the document wasn't focused. Fall through
         rather than give up -- the old path often still works. */
    }
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    // Off-screen but still focusable: a hidden or display:none field cannot
    // be selected, and a visible one would scroll the page as it takes
    // focus. 16px stops iOS zooming in on focus.
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '-9999px';
    area.style.fontSize = '16px';
    document.body.appendChild(area);

    area.focus();
    area.select();
    // Safari ignores select() on an off-screen field; this is the explicit
    // form it does honour.
    area.setSelectionRange(0, text.length);

    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

// Small DOM helpers shared by catalog options. Kept tiny and dependency-free.

/** Inject a <style> and return a disposer that removes it. */
export function injectStyle(css: string, tag: string): () => void {
  const el = document.createElement("style");
  el.setAttribute("data-customizer-dynamic", tag);
  el.textContent = css;
  document.head.appendChild(el);
  return () => el.remove();
}

export interface Hotkey {
  key: string; // KeyboardEvent.key, case-insensitive
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
}

/**
 * Match by `key`, falling back to the physical `code` for letters/digits: on macOS
 * ⌥ changes `key` (⌥⇧X yields "˛"), which would silently break Option combos.
 */
function keyMatches(e: KeyboardEvent, key: string): boolean {
  if (e.key.toLowerCase() === key.toLowerCase()) return true;
  if (/^[a-z]$/i.test(key)) return e.code === `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return e.code === `Digit${key}`;
  return false;
}

/** Register a global hotkey. Returns a disposer. */
export function onHotkey(combo: Hotkey, handler: (e: KeyboardEvent) => void): () => void {
  const listener = (e: KeyboardEvent): void => {
    if (!keyMatches(e, combo.key)) return;
    if (!!combo.ctrl !== e.ctrlKey) return;
    if (!!combo.meta !== e.metaKey) return;
    if (!!combo.shift !== e.shiftKey) return;
    if (!!combo.alt !== e.altKey) return;
    handler(e);
  };
  window.addEventListener("keydown", listener, true);
  return () => window.removeEventListener("keydown", listener, true);
}

/** First visible element matching selector whose text contains `text` (case-insensitive). */
export function findByText(selector: string, text: string): HTMLElement | null {
  const needle = text.toLowerCase();
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
    if ((el.textContent ?? "").toLowerCase().includes(needle)) return el;
  }
  return null;
}

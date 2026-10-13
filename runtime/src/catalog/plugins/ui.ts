// Tiny UI helpers shared by plugins. Text always goes through textContent.

/** Matches the "save to Liked Songs" heart in its various label forms. */
export const LIKE_BUTTON_SELECTOR = [
  'button[aria-label*="Liked Songs"]',
  'button[aria-label*="Your Library"]',
  'button[aria-label*="Save to"]',
  'button[aria-label*="Remove from"]',
].join(", ");

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const FLASH_MS = 1600;
let flashEl: HTMLElement | null = null;
let flashTimer = 0;

/** Brief centered status message ("Shuffle toggled"). */
export function flash(message: string): void {
  if (!flashEl?.isConnected) {
    flashEl = el("div", "sc-flash");
    flashEl.setAttribute("role", "status");
    document.body.appendChild(flashEl);
  }
  flashEl.textContent = message;
  flashEl.classList.add("sc-flash--show");
  window.clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => flashEl?.classList.remove("sc-flash--show"), FLASH_MS);
}

export const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

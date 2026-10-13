// Defensive accessors for the Spotify client. We deliberately depend on as little
// of Spotify's internals as possible — the more we assume, the more an update can
// break. Everything here feature-detects and degrades instead of throwing.

/** Candidate selectors for Spotify's top-level app container, newest first. */
const ROOT_SELECTORS = [
  ".Root__top-container",
  "#main",
  '[data-testid="app"]',
  "body",
];

export function getAppRoot(): HTMLElement | null {
  for (const sel of ROOT_SELECTORS) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

/**
 * Resolve once the document is loaded and a plausible app container exists.
 * Resolves (rather than rejecting) on timeout so CSS options still apply on a
 * client whose DOM we don't fully recognize.
 */
export function waitForReady(timeoutMs = 15000): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();

    const check = (): boolean => {
      if (document.readyState !== "complete") return false;
      // A recognizable container is nice-to-have, not required.
      return getAppRoot() !== null;
    };

    if (check()) {
      resolve();
      return;
    }

    const observer = new MutationObserver(() => {
      if (check()) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Hard timeout so we never hang the boot sequence.
    const timer = window.setInterval(() => {
      if (check() || Date.now() - start > timeoutMs) {
        window.clearInterval(timer);
        observer.disconnect();
        resolve();
      }
    }, 250);
  });
}

/** Run `fn` now and again whenever the DOM mutates, until `fn` returns true or timeout. */
export function whenPresent(
  fn: () => boolean,
  { timeoutMs = 10000 }: { timeoutMs?: number } = {},
): () => void {
  if (fn()) return () => {};
  const start = Date.now();
  const observer = new MutationObserver(() => {
    if (fn() || Date.now() - start > timeoutMs) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

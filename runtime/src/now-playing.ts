// Read-only view of what's playing, scraped from the now-playing bar. All anchors
// are data-testids confirmed in Spotify 1.3.x; every accessor degrades to empty
// values rather than throwing when markup changes.

export interface NowPlaying {
  title: string;
  artist: string;
  /** Small (64px) cover URL as rendered in the bar, or "". */
  artUrl: string;
  /** Absolute open.spotify.com track link, or "". */
  trackUrl: string;
  isPlaying: boolean;
}

const WIDGET = '[data-testid="now-playing-widget"]';

const text = (el: Element | null | undefined): string => (el?.textContent ?? "").trim();

export function getNowPlaying(): NowPlaying {
  const widget = document.querySelector(WIDGET);
  const title = text(widget?.querySelector('[data-testid="context-item-info-title"]'));
  const artist = text(widget?.querySelector('[data-testid="context-item-info-subtitles"]'));
  const img =
    widget?.querySelector<HTMLImageElement>('[data-testid="cover-art-image"]') ??
    widget?.querySelector<HTMLImageElement>("img");
  const href = widget?.querySelector('a[href*="/track/"]')?.getAttribute("href") ?? "";
  const playBtn = document.querySelector('[data-testid="control-button-playpause"]');
  // The button is labelled with the action it performs: "Pause" while playing.
  const label = (playBtn?.getAttribute("aria-label") ?? "").toLowerCase();
  return {
    title,
    artist,
    artUrl: img?.currentSrc || img?.src || "",
    trackUrl: href ? new URL(href, "https://open.spotify.com").href : "",
    isPlaying: label.includes("pause"),
  };
}

/** Spotify image ids encode size; swap in the 640px variant for big renders. */
export function largeArtUrl(url: string): string {
  return url.replace(/ab67616d0000(4851|1e02)/, "ab67616d0000b273");
}

type Listener = (np: NowPlaying) => void;

const trackListeners = new Set<Listener>();
const stateListeners = new Set<Listener>();
let observer: MutationObserver | null = null;
let lastKey = "";
let lastPlaying: boolean | null = null;
let scheduled = false;

function check(): void {
  scheduled = false;
  const np = getNowPlaying();
  const key = `${np.title}\u0000${np.artist}`;
  if (np.title && key !== lastKey) {
    lastKey = key;
    trackListeners.forEach((fn) => fn(np));
  }
  if (np.isPlaying !== lastPlaying) {
    lastPlaying = np.isPlaying;
    stateListeners.forEach((fn) => fn(np));
  }
}

function ensureObserver(): void {
  if (observer) return;
  observer = new MutationObserver(() => {
    // Coalesce mutation bursts into one read per frame.
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(check);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-label", "src"],
  });
}

function releaseObserverIfIdle(): void {
  if (trackListeners.size || stateListeners.size) return;
  observer?.disconnect();
  observer = null;
  lastKey = "";
  lastPlaying = null;
}

function subscribe(set: Set<Listener>, fn: Listener): () => void {
  set.add(fn);
  ensureObserver();
  return () => {
    set.delete(fn);
    releaseObserverIfIdle();
  };
}

/** Fires when the track changes (not on first subscribe). */
export function onTrackChange(fn: Listener): () => void {
  if (!lastKey) {
    const np = getNowPlaying();
    if (np.title) lastKey = `${np.title}\u0000${np.artist}`;
  }
  return subscribe(trackListeners, fn);
}

/** Fires when play/pause state changes, and once immediately. */
export function onPlayStateChange(fn: Listener): () => void {
  fn(getNowPlaying());
  if (lastPlaying === null) lastPlaying = getNowPlaying().isPlaying;
  return subscribe(stateListeners, fn);
}

/** Click a player control by testid. Returns false when it isn't on screen. */
export function clickControl(testId: string): boolean {
  const el = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!el) return false;
  el.click();
  return true;
}

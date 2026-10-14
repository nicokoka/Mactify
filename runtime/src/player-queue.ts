// Read-only view of the play queue via Spotify's internal PlayerAPI. There is no
// public handle to it, so we find Spotify's service registry in the React tree
// and resolve the "PlayerAPI" service from it (confirmed in Spotify 1.3.x).
// Every accessor feature-detects and degrades to "no queue" instead of throwing.

export interface QueuedArt {
  /** Spotify URI, e.g. "spotify:track:…" — matches the desktop notification's Track ID. */
  id: string;
  /** Direct https://i.scdn.co cover URL (~300px). */
  artUrl: string;
}

interface QueueImage {
  url?: string;
  label?: string;
}

interface QueueItem {
  uri?: string;
  images?: QueueImage[];
  album?: { images?: QueueImage[] };
}

interface PlayerQueue {
  current?: QueueItem | null;
  queued?: QueueItem[];
  nextUp?: QueueItem[];
}

interface PlayerEvents {
  addListener?: (event: string, fn: () => void) => void;
  removeListener?: (event: string, fn: () => void) => void;
}

interface PlayerApi {
  getQueue: () => Promise<PlayerQueue> | PlayerQueue;
  getEvents?: () => PlayerEvents;
}

interface ServiceRegistry {
  _map: Map<unknown, unknown>;
  resolve: (key: unknown) => unknown;
}

const IMAGE_URI = /^spotify:image:([0-9a-f]+)$/;
const SCDN_URL = /^https:\/\/i\.scdn\.co\/image\/[0-9a-f]+$/;

let cachedApi: PlayerApi | null = null;

function isRegistry(v: unknown): v is ServiceRegistry {
  const r = v as Partial<ServiceRegistry> | null;
  return !!r && typeof r.resolve === "function" && r._map instanceof Map;
}

function findRegistry(): ServiceRegistry | null {
  const start = document.querySelector('[data-testid="now-playing-widget"]') ?? document.querySelector("#main");
  if (!start) return null;
  const fiberKey = Object.keys(start).find((k) => k.startsWith("__reactFiber"));
  type Fiber = { return?: Fiber | null; memoizedProps?: { value?: unknown } | null };
  let fiber = fiberKey ? ((start as unknown as Record<string, Fiber>)[fiberKey] ?? null) : null;
  while (fiber) {
    const value = fiber.memoizedProps?.value;
    if (isRegistry(value)) return value;
    fiber = fiber.return ?? null;
  }
  return null;
}

function getPlayerApi(): PlayerApi | null {
  if (cachedApi) return cachedApi;
  try {
    const registry = findRegistry();
    if (!registry) return null;
    const key = [...registry._map.keys()].find(
      (k) => typeof k === "symbol" && k.description === "PlayerAPI",
    );
    const api = key ? (registry.resolve(key) as Partial<PlayerApi> | null) : null;
    if (api && typeof api.getQueue === "function") cachedApi = api as PlayerApi;
  } catch {
    // Spotify restructured its internals; queue features just stay off.
  }
  return cachedApi;
}

function artUrlOf(item: QueueItem): string {
  const images = item.images?.length ? item.images : (item.album?.images ?? []);
  const pick = images.find((i) => i.label === "standard") ?? images[0];
  const url = pick?.url ?? "";
  const id = IMAGE_URI.exec(url)?.[1];
  if (id) return `https://i.scdn.co/image/${id}`;
  return SCDN_URL.test(url) ? url : "";
}

/** True once Spotify's player service has been found. */
export function hasPlayerQueue(): boolean {
  return getPlayerApi() !== null;
}

/** The current track plus the next `count` (user-queued first, then up next). */
export async function getUpcomingArt(count: number): Promise<QueuedArt[]> {
  const api = getPlayerApi();
  if (!api) return [];
  try {
    const queue = await api.getQueue();
    const items = [queue.current, ...(queue.queued ?? []), ...(queue.nextUp ?? [])];
    const out: QueuedArt[] = [];
    for (const item of items) {
      if (out.length === count + 1) break;
      const artUrl = item?.uri ? artUrlOf(item) : "";
      if (item?.uri && artUrl && !out.some((a) => a.id === item.uri)) out.push({ id: item.uri, artUrl });
    }
    return out;
  } catch {
    return [];
  }
}

/** Fires when the queue changes (add/remove/reorder, shuffle, new context). */
export function onQueueUpdate(fn: () => void): () => void {
  const events = getPlayerApi()?.getEvents?.();
  if (typeof events?.addListener !== "function") return () => {};
  try {
    events.addListener("queue_update", fn);
  } catch {
    return () => {};
  }
  return () => {
    try {
      events.removeListener?.("queue_update", fn);
    } catch {
      // ignore
    }
  };
}

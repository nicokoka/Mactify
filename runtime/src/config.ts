// Config persistence. Lives in Spotify's own localStorage, which is stored outside
// xpui.spa (under ~/Library/Application Support/Spotify) and therefore survives
// re-patching and Spotify updates. The in-app panel is the single source of truth.

const STORAGE_KEY = "spotify-customizer:config:v1";

export interface CustomizerConfig {
  /** optionId -> enabled. Absent means "use the option's defaultEnabled". */
  enabled: Record<string, boolean>;
  /** optionId -> arbitrary per-option settings. */
  settings: Record<string, Record<string, unknown>>;
}

const EMPTY: CustomizerConfig = { enabled: {}, settings: {} };

function readRaw(): CustomizerConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw) as Partial<CustomizerConfig>;
    return {
      enabled: parsed.enabled ?? {},
      settings: parsed.settings ?? {},
    };
  } catch {
    // Corrupt or unavailable storage: fall back to empty, never throw into boot.
    return structuredClone(EMPTY);
  }
}

function writeRaw(config: CustomizerConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn("[SpotifyCustomizer] failed to persist config", err);
  }
}

export function loadConfig(): CustomizerConfig {
  return readRaw();
}

export function isEnabled(id: string, defaultEnabled: boolean): boolean {
  const cfg = readRaw();
  return cfg.enabled[id] ?? defaultEnabled;
}

export function setEnabled(id: string, value: boolean): void {
  const cfg = readRaw();
  cfg.enabled[id] = value;
  writeRaw(cfg);
}

export function getSetting<T>(id: string, key: string, fallback: T): T {
  const cfg = readRaw();
  const bucket = cfg.settings[id];
  if (!bucket || !(key in bucket)) return fallback;
  return bucket[key] as T;
}

export function setSetting(id: string, key: string, value: unknown): void {
  const cfg = readRaw();
  (cfg.settings[id] ??= {})[key] = value;
  writeRaw(cfg);
}

/** Safe mode: turn every option off (settings are kept so re-enabling restores them). */
export function disableAll(): void {
  const cfg = readRaw();
  for (const id of Object.keys(cfg.enabled)) cfg.enabled[id] = false;
  writeRaw(cfg);
}

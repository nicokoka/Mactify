// The catalog engine: applies/removes options, each inside a sandbox so a single
// broken option (e.g. one whose selectors a Spotify update renamed) can never take
// down the rest. Failures are recorded and surfaced in the settings panel.

import { getSetting, isEnabled, setEnabled } from "./config.js";
import type { CustomizerOption, OptionContext } from "./types.js";

const STYLE_ATTR = "data-customizer-option";

interface ActiveOption {
  styleEl?: HTMLStyleElement;
  cleanup?: () => void;
}

export class CustomizerEngine {
  readonly options: readonly CustomizerOption[];
  private readonly active = new Map<string, ActiveOption>();
  /** optionId -> last error, for display in the panel. */
  readonly failures = new Map<string, Error>();

  constructor(options: readonly CustomizerOption[]) {
    this.options = options;
  }

  isEnabled(option: CustomizerOption): boolean {
    return isEnabled(option.id, option.defaultEnabled ?? false);
  }

  /** Apply every option that is currently enabled. Called once at boot. */
  applyEnabled(): void {
    const claimedGroups = new Set<string>();
    for (const option of this.options) {
      if (!this.isEnabled(option)) continue;
      // Guard against a hand-edited config enabling two members of one group.
      if (option.exclusiveGroup) {
        if (claimedGroups.has(option.exclusiveGroup)) continue;
        claimedGroups.add(option.exclusiveGroup);
      }
      this.apply(option);
    }
  }

  private contextFor(option: CustomizerOption): OptionContext {
    return {
      doc: document,
      getSetting: (key, fallback) => getSetting(option.id, key, fallback),
    };
  }

  /** Enable an option now (does not persist; caller decides). */
  apply(option: CustomizerOption): void {
    if (this.active.has(option.id)) return;
    this.failures.delete(option.id);
    const record: ActiveOption = {};
    try {
      if (option.css != null && (option.kind === "css" || option.kind === "both")) {
        const styleEl = document.createElement("style");
        styleEl.setAttribute(STYLE_ATTR, option.id);
        styleEl.textContent = option.css;
        document.head.appendChild(styleEl);
        record.styleEl = styleEl;
      }
      if (option.init && (option.kind === "js" || option.kind === "both")) {
        const maybeCleanup = option.init(this.contextFor(option));
        if (typeof maybeCleanup === "function") record.cleanup = maybeCleanup;
      }
      this.active.set(option.id, record);
    } catch (err) {
      // Roll back any partial application so we don't leak a style tag.
      record.styleEl?.remove();
      this.failures.set(option.id, err instanceof Error ? err : new Error(String(err)));
      console.error(`[SpotifyCustomizer] option "${option.id}" failed to apply`, err);
    }
  }

  /** Disable an option now (does not persist; caller decides). */
  unapply(option: CustomizerOption): void {
    const record = this.active.get(option.id);
    if (!record) return;
    this.active.delete(option.id);
    try {
      record.styleEl?.remove();
      record.cleanup?.();
      if (!record.cleanup && option.cleanup) option.cleanup(this.contextFor(option));
    } catch (err) {
      console.error(`[SpotifyCustomizer] option "${option.id}" failed to clean up`, err);
    }
  }

  /** Toggle + persist in one call — used by the panel. Enforces exclusive groups. */
  setEnabled(option: CustomizerOption, value: boolean): void {
    if (value && option.exclusiveGroup) {
      for (const other of this.options) {
        if (other.id === option.id || other.exclusiveGroup !== option.exclusiveGroup) continue;
        if (!this.isEnabled(other)) continue;
        this.unapply(other);
        setEnabled(other.id, false);
      }
    }
    if (value) this.apply(option);
    else this.unapply(option);
    setEnabled(option.id, value);
  }

  /** Re-run an active option so it picks up changed settings. */
  reapply(option: CustomizerOption): void {
    if (!this.active.has(option.id)) return;
    this.unapply(option);
    this.apply(option);
  }

  isActive(id: string): boolean {
    return this.active.has(id);
  }
}

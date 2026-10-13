// Shared types for the Spotify Customizer runtime.

export type OptionKind = "css" | "js" | "both";

export type OptionCategory = "theme" | "plugin" | "appearance" | "layout" | "playback" | "chrome";

export const CATEGORY_LABELS: Record<OptionCategory, string> = {
  theme: "Themes",
  plugin: "Plugins",
  appearance: "Appearance",
  layout: "Layout",
  playback: "Playback & Functional",
  chrome: "Chrome & Window",
};

/**
 * Context handed to an option's init()/cleanup(). Intentionally small so options
 * stay decoupled from engine internals and remain easy to reason about.
 */
export interface OptionContext {
  readonly doc: Document;
  /** Read a user-tunable setting for this option (persisted in localStorage). */
  getSetting<T>(key: string, fallback: T): T;
}

export type SettingType = "color" | "text" | "textarea" | "number" | "select";

/** A user-tunable value an option exposes. Rendered inline in the panel while enabled. */
export interface OptionSetting {
  key: string;
  label: string;
  type: SettingType;
  default: string | number;
  min?: number;
  max?: number;
  step?: number;
  /** For type "select": value/label pairs. */
  choices?: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
}

/**
 * One customization. Scales to hundreds by dropping more of these into catalog/.
 * `css` is applied declaratively when enabled; `init` runs for behavioral options.
 * Both run inside the engine's sandbox so one failure never breaks the rest.
 */
export interface CustomizerOption {
  id: string;
  name: string;
  description: string;
  category: OptionCategory;
  kind: OptionKind;
  defaultEnabled?: boolean;
  /** Settings rendered under the option in the panel while it is enabled. */
  settings?: readonly OptionSetting[];
  /** Options sharing a group are mutually exclusive (e.g. themes). */
  exclusiveGroup?: string;
  /** Preview colors for gallery cards (themes). */
  swatch?: readonly string[];
  /** Preview font stack for gallery cards (themes). */
  previewFont?: string;
  /** Static CSS applied while enabled. Required when kind includes "css". */
  css?: string;
  /**
   * Behavioral setup. Required when kind includes "js".
   * May return a cleanup function; otherwise `cleanup` is used on disable.
   */
  init?(ctx: OptionContext): void | (() => void);
  cleanup?(ctx: OptionContext): void;
}

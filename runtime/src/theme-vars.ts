// Helpers for overriding Spotify's Encore theme variables.
//
// Spotify 1.3.x does NOT define its palette on :root — it defines it on
// `.encore-dark-theme, .encore-dark-theme .encore-base-set` (plus app-frame and
// bright-accent "sets"), which shadow anything set on :root. Overrides must target
// those same scopes, which is what these helpers do.

/** Scopes that carry the main background/text palette. */
const BASE_SCOPES = [
  ":root",
  ".encore-dark-theme",
  ".encore-light-theme",
  ".encore-dark-theme .encore-base-set",
  ".encore-light-theme .encore-base-set",
  ".encore-dark-theme .encore-app-frame-set",
  ".encore-light-theme .encore-app-frame-set",
];

/** Scopes for accent-filled surfaces such as the big play button. */
const ACCENT_SET_SCOPES = [
  ".encore-dark-theme .encore-bright-accent-set",
  ".encore-light-theme .encore-bright-accent-set",
];

export interface Palette {
  /** Main view background. */
  bg: string;
  /** Sidebars, cards, elevated panels. */
  surface: string;
  /** Hover / selected rows. */
  highlight: string;
  text: string;
  subdued: string;
  accent: string;
  /** Text drawn on top of the accent (play button glyph). Defaults to black. */
  onAccent?: string;
  /** "light" switches native controls/scrollbars to light rendering. */
  scheme?: "dark" | "light";
}

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isHexColor(value: string): boolean {
  return HEX_RE.test(value.trim());
}

const mix = (a: string, b: string, pctA: number) =>
  `color-mix(in srgb, ${a} ${pctA}%, ${b})`;

function scoped(scopes: readonly string[], prefix: string): string {
  return scopes.map((s) => (prefix ? `${prefix} ${s}` : s)).join(",\n");
}

/** Full palette override for every base scope. */
export function paletteCss(p: Palette): string {
  const onAccent = p.onAccent ?? "#000";
  return `${scoped(BASE_SCOPES, "")} {
  color-scheme: ${p.scheme ?? "dark"} !important;
  --background-base: ${p.bg} !important;
  --background-highlight: ${p.highlight} !important;
  --background-press: ${mix(p.highlight, p.bg, 60)} !important;
  --background-elevated-base: ${p.surface} !important;
  --background-elevated-highlight: ${p.highlight} !important;
  --background-elevated-press: ${mix(p.surface, p.bg, 50)} !important;
  --background-tinted-base: ${mix(p.text, "transparent", 10)} !important;
  --background-tinted-highlight: ${mix(p.text, "transparent", 14)} !important;
  --background-tinted-press: ${mix(p.text, "transparent", 21)} !important;
  --text-base: ${p.text} !important;
  --text-subdued: ${p.subdued} !important;
  --essential-base: ${p.text} !important;
  --essential-subdued: ${mix(p.subdued, p.bg, 70)} !important;
  --decorative-base: ${p.text} !important;
  --decorative-subdued: ${p.highlight} !important;
}
body { background-color: ${p.bg} !important; color: ${p.text}; }
${accentCss(p.accent, onAccent, "")}`;
}

/**
 * Accent override. `prefix` raises specificity (e.g. "html") so a standalone accent
 * option wins over a theme's accent regardless of which style tag came last.
 */
export function accentCss(accent: string, onAccent = "#000", prefix = "html"): string {
  return `${scoped(BASE_SCOPES, prefix)} {
  --text-bright-accent: ${accent} !important;
  --essential-bright-accent: ${accent} !important;
  --text-positive: ${accent} !important;
  --essential-positive: ${accent} !important;
}
${scoped(ACCENT_SET_SCOPES, prefix)} {
  --background-base: ${accent} !important;
  --background-highlight: ${mix(accent, "#fff", 85)} !important;
  --background-press: ${mix(accent, "#000", 85)} !important;
  --text-base: ${onAccent} !important;
  --essential-base: ${onAccent} !important;
}
${prefix} [data-testid="progress-bar"],
${prefix} [data-testid="volume-bar"] [data-testid="progress-bar"] {
  --is-active-fg-color: ${accent} !important;
}`;
}

/** Swap Spotify's UI fonts for a (macOS-bundled) font stack. */
export function fontCss(stack: string): string {
  return `${scoped(BASE_SCOPES, "")}, body {
  --encore-body-font-stack: ${stack} !important;
  --encore-title-font-stack: ${stack} !important;
  --encore-variable-font-stack: ${stack} !important;
  --encore-text-font-family: ${stack} !important;
}
body, body button, body input, body textarea, body h1, body h2, body h3, body p, body span, body a {
  font-family: ${stack} !important;
}`;
}

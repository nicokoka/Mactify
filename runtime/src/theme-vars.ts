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

/**
 * Stable layout anchors (Spotify 1.3.x). Class names are hashed, so we use ids and
 * testids. Decorate only these OUTER panels: putting clip-path/backdrop-filter on
 * the inner scrolling <main> (thousands of px tall) makes Chromium stop painting it.
 */
export const LAYOUT = {
  /** The app frame that holds every panel; Spotify paints it solid black. */
  frame: `[data-testid="root"] > div:has(> #main-view)`,
  topBar: `#global-nav-bar`,
  leftPanel: `#Desktop_LeftSidebar_Id`,
  mainPanel: `#main-view`,
  rightPanel: `#Desktop_PanelContainer_Id`,
  playerBar: `[data-testid="now-playing-bar"]`,
} as const;

/**
 * Lyrics view anchors (Spotify 1.3.x). Line state classes are hashed, but the
 * current line alone carries this unhashed `view-timeline-name`, and the element
 * holding Spotify's inline `--lyrics-color-*` vars wraps lines + background layer.
 */
export const LYRICS = {
  line: `[data-testid="lyrics-line"]`,
  colorScope: `[style*="--lyrics-color-background"]`,
  activeTimeline: "--scroll-to-viewport-button-anim",
} as const;

/** The three content panels plus the player bar — safe to skin. */
export const PANELS = [LAYOUT.leftPanel, LAYOUT.mainPanel, LAYOUT.rightPanel, LAYOUT.playerBar].join(", ");

/** Everything Spotify paints solid black around the panels. */
export const FRAME_PARTS = [
  LAYOUT.frame,
  LAYOUT.topBar,
  LAYOUT.leftPanel,
  `${LAYOUT.frame} > div:has(> ${LAYOUT.playerBar})`,
].join(", ");

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
  /** Outer frame + top bar. Defaults to a slightly darker shade of `bg`. */
  frame?: string;
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
html { background-color: ${p.bg} !important; }
body { background-color: transparent !important; color: ${p.text}; }
${FRAME_PARTS} {
  background-color: ${p.frame ?? mix(p.bg, "#000", p.scheme === "light" ? 92 : 70)} !important;
}
::selection { background: ${mix(p.accent, "transparent", 40)}; }
::-webkit-scrollbar-thumb { background-color: ${mix(p.subdued, "transparent", 45)} !important; }
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

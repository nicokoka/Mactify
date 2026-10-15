// Shared selectors and helpers for signature themes.
//
// Rules learned the hard way on Spotify 1.3.x:
//  - Only decorate the OUTER panels (LAYOUT/PANELS). clip-path or backdrop-filter on
//    the inner scrolling <main> stops Chromium painting the feed once you scroll.
//  - Spotify paints the frame between panels solid black; scenes need FRAME_PARTS
//    made transparent so the body backdrop shows through.
//  - The visible pill of an Encore button is its first <span>.

import { FRAME_PARTS, LAYOUT, PANELS } from "../../theme-vars.js";

export const PRIMARY_PILL = `[data-encore-id="buttonPrimary"] > span:first-child`;
export const PRIMARY_HOVER = `[data-encore-id="buttonPrimary"]:hover > span:first-child`;
export const CHIP_PILL = `button[data-encore-id="chip"] > span:first-child`;
export const CHIP_ON = `button[data-encore-id="chip"][aria-checked="true"] > span:first-child`;
export const CARD = `[data-encore-id="card"]`;
export const BIG_PLAY = `${LAYOUT.playerBar} [data-testid="control-button-playpause"] > span:first-child`;
export const TRACK_FG = `${LAYOUT.playerBar} [data-testid="progress-bar"]`;
export const HEADINGS = `${LAYOUT.mainPanel} h1, ${LAYOUT.mainPanel} h2[data-encore-id="text"], ${LAYOUT.mainPanel} section h2`;

/**
 * Backdrop + transparent frame so it shows between panels. The backdrop goes on
 * <html>, NOT <body>: Spotify gives <html> its own background, so body's background
 * would paint above our z-index:-1 layers (rain, grid, blobs) and hide them.
 */
export function scene(backdrop: string, base: string): string {
  return `
html { background: ${backdrop} center bottom / cover no-repeat fixed, ${base} !important; }
body { background: transparent !important; }
${FRAME_PARTS} { background: transparent !important; }
${LAYOUT.leftPanel}, ${LAYOUT.rightPanel} { position: relative; }`;
}

/**
 * Spotify already uses ::before/::after on some panels with inset 0 — a label that
 * only sets top/left inherits full-panel size and paints over the content. Always
 * reset the whole box first.
 */
export const PSEUDO_RESET = `inset: auto; width: auto; height: auto;`;

/** Disable every theme animation for reduced-motion users. `extra` adds selectors. */
export function noMotion(extra = ""): string {
  const base = `body::before, body::after, ${PANELS}, ${HEADINGS}, ${PRIMARY_PILL}`;
  return `@media (prefers-reduced-motion: reduce) {
  ${extra ? `${base}, ${extra}` : base} { animation: none !important; }
}`;
}

export const NO_MOTION = noMotion();

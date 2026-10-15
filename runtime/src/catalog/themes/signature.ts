// Signature themes: a palette plus a full "material" — scene backdrop, panel
// treatment and restyled components (buttons, chips, cards, progress bar).
// Shared selectors and the hard-won Spotify 1.3.x rules live in parts.ts.

import { LAYOUT, PANELS } from "../../theme-vars.js";
import type { CustomizerOption } from "../../types.js";
import { cyberCity, svgUrl, synthSunset, terminalRain } from "./art.js";
import { defineTheme, FONTS } from "./define-theme.js";
import {
  BIG_PLAY, CARD, CHIP_ON, CHIP_PILL, HEADINGS, NO_MOTION, PRIMARY_PILL, PSEUDO_RESET, scene, TRACK_FG,
} from "./parts.js";

// ── Cyberpunk ────────────────────────────────────────────────────────────────

const CHAMFER = (n: number) =>
  `polygon(0 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% 100%, ${n}px 100%, 0 calc(100% - ${n}px))`;

/** Corner brackets drawn with gradients (no extra DOM). */
const HUD_BRACKETS = (c: string) =>
  [
    `linear-gradient(${c},${c}) left top / 22px 2px`,
    `linear-gradient(${c},${c}) left top / 2px 22px`,
    `linear-gradient(${c},${c}) right bottom / 22px 2px`,
    `linear-gradient(${c},${c}) right bottom / 2px 22px`,
  ]
    .map((g) => `${g} no-repeat`)
    .join(", ");

const cyberpunk = defineTheme({
  id: "cyberpunk",
  name: "Cyberpunk",
  description: "Neon city at night: HUD panels, chamfered yellow buttons, glitch headings, rain.",
  font: FONTS.sfMono,
  palette: {
    bg: "rgba(6, 2, 16, 0.78)",
    surface: "rgba(14, 6, 30, 0.82)",
    highlight: "rgba(0, 240, 255, 0.12)",
    text: "#e8fbff",
    subdued: "#7fd8e8",
    accent: "#fcee0a",
  },
  extraCss: `
${scene(svgUrl(cyberCity()), "#03000a")}
/* Rain, behind the panels. */
body::before {
  content: ""; position: fixed; inset: -50% 0 0; z-index: -1; pointer-events: none;
  background: repeating-linear-gradient(100deg, transparent 0 22px, rgba(0, 240, 255, 0.10) 22px 23px, transparent 23px 47px);
  animation: sc-rain 0.9s linear infinite;
}
@keyframes sc-rain { to { transform: translate3d(-10px, 50%, 0); } }
/* Scanlines over everything, very faint. */
body::after {
  content: ""; position: fixed; inset: 0; z-index: 2147482000; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.18) 0 1px, transparent 1px 3px);
}

${PANELS} {
  clip-path: ${CHAMFER(18)};
  backdrop-filter: blur(3px);
  border-radius: 0 !important;
}
${LAYOUT.leftPanel}::after, ${LAYOUT.mainPanel}::after, ${LAYOUT.rightPanel}::after {
  content: ""; position: absolute; inset: 0; z-index: 3; pointer-events: none;
  background: ${HUD_BRACKETS("#00f0ff")};
  box-shadow: inset 0 0 0 1px rgba(0, 240, 255, 0.28), inset 0 0 40px rgba(255, 42, 109, 0.10);
}
${LAYOUT.mainPanel}::before {
  ${PSEUDO_RESET}
  content: "SYS://MAIN_VIEW  ▮ ONLINE"; position: absolute; top: 8px; right: 26px; z-index: 3;
  font: 600 10px/1 "SF Mono", Menlo, monospace; letter-spacing: 0.2em; color: #00f0ff; opacity: 0.7;
  pointer-events: none;
}
${LAYOUT.playerBar} {
  border-top: 1px solid rgba(255, 42, 109, 0.6);
  background: linear-gradient(90deg, rgba(255, 42, 109, 0.14), rgba(6, 2, 16, 0.85) 30%, rgba(6, 2, 16, 0.85) 70%, rgba(0, 240, 255, 0.14)) !important;
}

${HEADINGS} {
  text-transform: uppercase; letter-spacing: 0.06em;
  text-shadow: 2px 0 #ff2a6d, -2px 0 #00f0ff;
}
${LAYOUT.mainPanel} h1:hover, ${LAYOUT.mainPanel} section h2:hover { animation: sc-glitch 0.3s steps(2) infinite; }
@keyframes sc-glitch {
  0% { text-shadow: 3px 0 #ff2a6d, -3px 0 #00f0ff; transform: translateX(0); }
  50% { text-shadow: -3px 1px #ff2a6d, 3px -1px #00f0ff; transform: translateX(1px) skewX(-4deg); }
  100% { text-shadow: 2px 0 #ff2a6d, -2px 0 #00f0ff; transform: translateX(-1px); }
}

${PRIMARY_PILL} {
  border-radius: 0 !important;
  clip-path: ${CHAMFER(10)};
  background: #fcee0a !important; color: #05010d !important;
  text-transform: uppercase; letter-spacing: 0.08em;
  box-shadow: none !important;
}
[data-encore-id="buttonPrimary"]:hover > span:first-child { background: #00f0ff !important; }
${BIG_PLAY} { clip-path: ${CHAMFER(8)}; background: #fcee0a !important; }
[data-encore-id="buttonSecondary"] {
  border-radius: 0 !important; border: 1px solid #00f0ff !important; color: #00f0ff !important;
  clip-path: ${CHAMFER(8)};
}
${CHIP_PILL} {
  border-radius: 0 !important; clip-path: ${CHAMFER(8)};
  background: rgba(0, 240, 255, 0.08) !important; color: #7fd8e8 !important;
  box-shadow: inset 0 0 0 1px rgba(0, 240, 255, 0.45) !important;
  text-transform: uppercase; letter-spacing: 0.06em;
}
${CHIP_ON} { background: #ff2a6d !important; color: #fff !important; box-shadow: 0 0 14px #ff2a6d !important; }

${CARD} { border-radius: 0 !important; transition: box-shadow 120ms, background 120ms; }
${CARD}:hover { box-shadow: inset 0 0 0 1px #00f0ff, 0 0 18px rgba(0, 240, 255, 0.25); background: rgba(0, 240, 255, 0.06) !important; }
${LAYOUT.mainPanel} img, ${LAYOUT.leftPanel} img { border-radius: 0 !important; }

${TRACK_FG} { --fg-color: #ff2a6d !important; --bg-color: rgba(0, 240, 255, 0.25) !important; }
${TRACK_FG} [data-testid="progress-bar-background"] { box-shadow: 0 0 10px rgba(255, 42, 109, 0.7); }
::-webkit-scrollbar-thumb { background: #ff2a6d !important; border-radius: 0 !important; }
${NO_MOTION}`,
});

// ── Synthwave ────────────────────────────────────────────────────────────────

const synthwave = defineTheme({
  id: "synthwave",
  name: "Synthwave",
  description: "Outrun sunset over a moving neon grid. Chrome headings, glowing gradient buttons.",
  font: FONTS.futura,
  palette: {
    bg: "rgba(22, 6, 46, 0.62)",
    surface: "rgba(30, 8, 60, 0.7)",
    highlight: "rgba(255, 106, 213, 0.16)",
    text: "#ffeefb",
    subdued: "#d8a6f0",
    accent: "#ff6ad5",
    onAccent: "#fff",
  },
  extraCss: `
${scene(svgUrl(synthSunset()), "#0b0221")}
/* Animated grid floor in front of the static one. */
body::before {
  content: ""; position: fixed; left: -50%; right: -50%; bottom: 0; height: 36vh; z-index: -1;
  pointer-events: none; transform: perspective(260px) rotateX(62deg); transform-origin: bottom;
  background:
    repeating-linear-gradient(90deg, rgba(0, 240, 255, 0.5) 0 2px, transparent 2px 70px),
    repeating-linear-gradient(0deg, rgba(0, 240, 255, 0.5) 0 2px, transparent 2px 70px);
  mask-image: linear-gradient(to top, #000 20%, transparent);
  animation: sc-grid-run 3s linear infinite;
}
@keyframes sc-grid-run { to { background-position: 0 70px, 0 70px; } }

${PANELS} {
  backdrop-filter: blur(10px) saturate(140%);
  border-radius: 16px !important;
  box-shadow: 0 0 0 1px rgba(255, 106, 213, 0.35), 0 0 30px rgba(255, 106, 213, 0.18) !important;
}
${LAYOUT.playerBar} {
  border-radius: 16px !important; margin: 0 8px;
  background: linear-gradient(90deg, rgba(41, 9, 79, 0.85), rgba(122, 31, 143, 0.7), rgba(41, 9, 79, 0.85)) !important;
}

${HEADINGS} {
  font-style: italic; font-weight: 800 !important;
  background: linear-gradient(180deg, #ffffff 0%, #a7f3ff 45%, #ff6ad5 55%, #ffd319 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 10px rgba(255, 106, 213, 0.55));
}

${PRIMARY_PILL} {
  background: linear-gradient(90deg, #ff2975, #ff7b39) !important; color: #fff !important;
  font-style: italic; box-shadow: 0 0 18px rgba(255, 41, 117, 0.65) !important;
}
[data-encore-id="buttonPrimary"]:hover > span:first-child { background: linear-gradient(90deg, #ff7b39, #ffd319) !important; }
${BIG_PLAY} { background: linear-gradient(135deg, #ffd319, #ff2975 60%, #8c1eff) !important; color: #fff !important; }
${CHIP_PILL} {
  background: transparent !important; color: #ffd6f4 !important;
  box-shadow: inset 0 0 0 1px rgba(255, 106, 213, 0.6) !important;
}
${CHIP_ON} { background: #ff6ad5 !important; color: #20033d !important; box-shadow: 0 0 16px rgba(255, 106, 213, 0.8) !important; }
${CARD}:hover { box-shadow: 0 0 0 1px rgba(0, 240, 255, 0.5), 0 0 24px rgba(0, 240, 255, 0.25); }

${TRACK_FG} { --fg-color: #ffd319 !important; --bg-color: rgba(255, 255, 255, 0.2) !important; }
${TRACK_FG} [data-testid="progress-bar-background"] { box-shadow: 0 0 12px rgba(255, 211, 25, 0.6); }
${NO_MOTION}`,
});

// ── Terminal CRT ─────────────────────────────────────────────────────────────

const terminal = defineTheme({
  id: "terminal",
  name: "Terminal CRT",
  description: "Green phosphor shell: bracket buttons, prompt headings, blinking cursor, glyph rain.",
  font: FONTS.menlo,
  palette: {
    bg: "rgba(1, 6, 1, 0.9)",
    surface: "rgba(3, 14, 4, 0.92)",
    highlight: "rgba(43, 255, 79, 0.10)",
    text: "#5bff6e",
    subdued: "#2fa83c",
    accent: "#5bff6e",
  },
  extraCss: `
${scene(svgUrl(terminalRain()), "#010401")}
body { text-shadow: 0 0 4px rgba(91, 255, 110, 0.5); }
body::after {
  content: ""; position: fixed; inset: 0; z-index: 2147482000; pointer-events: none;
  background:
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.3) 0 1px, transparent 1px 3px),
    radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, 0.6) 100%);
  animation: sc-crt-flicker 7s infinite;
}
@keyframes sc-crt-flicker { 0%, 96%, 100% { opacity: 1; } 97% { opacity: 0.82; } 98% { opacity: 0.95; } }

${PANELS} {
  border-radius: 0 !important;
  box-shadow: inset 0 0 0 1px #1f7a2b, 0 0 18px rgba(43, 255, 79, 0.12) !important;
}
${LAYOUT.mainPanel}::before, ${LAYOUT.rightPanel}::before, ${LAYOUT.leftPanel}::before {
  ${PSEUDO_RESET}
  position: absolute; top: -1px; left: 14px; z-index: 3; padding: 0 6px;
  background: #010401; color: #5bff6e; font: 11px/1.2 Menlo, monospace; pointer-events: none;
}
${LAYOUT.mainPanel}::before { content: "[ ~/spotify ]"; }
${LAYOUT.rightPanel}::before { content: "[ now_playing.log ]"; }
${LAYOUT.leftPanel}::before { content: "[ lib ]"; left: 6px; }

${HEADINGS} { text-transform: lowercase; letter-spacing: 0.02em; }
${LAYOUT.mainPanel} h1::before, ${LAYOUT.mainPanel} section h2 > :first-child::before { content: "$ "; opacity: 0.6; }
${LAYOUT.mainPanel} h1::after {
  content: "▊"; margin-left: 6px; animation: sc-blink 1s steps(1) infinite;
}
@keyframes sc-blink { 50% { opacity: 0; } }

${PRIMARY_PILL} {
  border-radius: 0 !important; background: transparent !important; color: #5bff6e !important;
  box-shadow: inset 0 0 0 1px #5bff6e !important; text-transform: lowercase;
}
[data-encore-id="buttonPrimary"]:not([data-testid]) > span:first-child::before { content: "[ "; }
[data-encore-id="buttonPrimary"]:not([data-testid]) > span:first-child::after { content: " ]"; }
[data-encore-id="buttonPrimary"]:hover > span:first-child { background: #5bff6e !important; color: #010401 !important; text-shadow: none; }
${BIG_PLAY} { background: #5bff6e !important; color: #010401 !important; border-radius: 0 !important; }
${CHIP_PILL} { border-radius: 0 !important; background: transparent !important; color: #2fa83c !important; box-shadow: inset 0 0 0 1px #1f7a2b !important; }
${CHIP_ON} { background: #5bff6e !important; color: #010401 !important; }
${CHIP_ON}::before { content: "> "; }
${CARD} { border-radius: 0 !important; }
${CARD}:hover { outline: 1px dashed #5bff6e; outline-offset: -1px; background: rgba(43, 255, 79, 0.06) !important; }
body img { filter: grayscale(1) sepia(1) hue-rotate(70deg) saturate(2.4) brightness(0.9) contrast(1.1); border-radius: 0 !important; }
body ::selection { background: #5bff6e; color: #010401; }
${TRACK_FG} { --fg-color: #5bff6e !important; --bg-color: #0b2a0f !important; --progress-bar-radius: 0px !important; }
${NO_MOTION}
@media (prefers-reduced-motion: reduce) { ${LAYOUT.mainPanel} h1::after { animation: none !important; } }`,
});

// ── Retro 98 ─────────────────────────────────────────────────────────────────

const BEVEL_OUT = `inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #dfdfdf`;
const BEVEL_IN = `inset -1px -1px #ffffff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px #808080`;
const TITLE_H = 22;

/** A Win98 title bar (label + _ □ × boxes) on an outer panel. */
const titleBar = (panel: string, label: string) => `
${panel} { padding-top: ${TITLE_H}px !important; box-sizing: border-box; }
${panel} > * { max-height: calc(100% - ${TITLE_H}px); }
${panel}::before {
  ${PSEUDO_RESET}
  content: "${label}"; position: absolute; top: 3px; left: 3px; right: 3px; height: ${TITLE_H - 4}px; z-index: 3;
  display: flex; align-items: center; padding: 0 64px 0 6px; box-sizing: border-box;
  background: linear-gradient(90deg, #000080, #1084d0); color: #fff;
  font: 700 12px/1 Tahoma, Geneva, sans-serif; white-space: nowrap; overflow: hidden; pointer-events: none;
}
${panel}::after {
  ${PSEUDO_RESET}
  content: "_  □  ×"; position: absolute; top: 5px; right: 6px; z-index: 4; height: 14px; padding: 0 4px;
  display: flex; align-items: center; background: #c0c0c0; color: #000; box-shadow: ${BEVEL_OUT};
  font: 700 10px/1 Tahoma, Geneva, sans-serif; letter-spacing: 1px; pointer-events: none;
}`;

const retro98 = defineTheme({
  id: "retro-98",
  name: "Retro 98",
  description: "Teal desktop, silver windows with title bars, bevelled buttons. It's 1998 again.",
  font: FONTS.tahoma,
  palette: {
    bg: "#c0c0c0",
    surface: "#c0c0c0",
    highlight: "#000080",
    text: "#000000",
    subdued: "#404040",
    accent: "#000080",
    onAccent: "#fff",
    frame: "#008080",
    scheme: "light",
  },
  extraCss: `
${LAYOUT.leftPanel}, ${LAYOUT.rightPanel} { position: relative; }
body * { border-radius: 0 !important; }
${PANELS} { box-shadow: ${BEVEL_OUT} !important; }
${titleBar(LAYOUT.mainPanel, "Spotify - Media Player")}
${titleBar(LAYOUT.rightPanel, "Now Playing")}
${LAYOUT.playerBar} { background: #c0c0c0 !important; box-shadow: inset 0 1px #fff, inset 0 2px #dfdfdf !important; }
/* Hover-only card play buttons stay invisible until hover, so skip them. */
body button:not([data-testid="control-button-playpause"]):not([data-testid="play-button"]) { background-color: #c0c0c0; box-shadow: ${BEVEL_OUT}; }
body button:active { box-shadow: ${BEVEL_IN} !important; }
${PRIMARY_PILL} { background: #c0c0c0 !important; color: #000 !important; box-shadow: ${BEVEL_OUT} !important; }
${BIG_PLAY} { background: #c0c0c0 !important; color: #000 !important; box-shadow: ${BEVEL_OUT} !important; }
${CHIP_PILL} { background: #c0c0c0 !important; color: #000 !important; box-shadow: ${BEVEL_OUT} !important; }
${CHIP_ON} { box-shadow: ${BEVEL_IN} !important; background: #dfdfdf !important; }
body input { background: #fff !important; box-shadow: ${BEVEL_IN}; color: #000 !important; }
${LAYOUT.mainPanel} h1, ${LAYOUT.mainPanel} section h2 {
  background: linear-gradient(90deg, #000080, #1084d0); color: #fff !important;
  padding: 2px 6px; font-weight: 700;
}
body [role="row"]:hover, body [aria-selected="true"][role="row"] { background: #000080 !important; color: #fff !important; }
${TRACK_FG} { --fg-color: #000080 !important; --bg-color: #fff !important; }
${TRACK_FG} [data-testid="progress-bar-background"] { box-shadow: ${BEVEL_IN}; }
body ::-webkit-scrollbar { width: 16px; height: 16px; background: #dfdfdf; }
body ::-webkit-scrollbar-thumb { background: #c0c0c0 !important; box-shadow: ${BEVEL_OUT}; }`,
});

// ── Liquid Glass (parked: functional baseline, to be redesigned) ─────────────

const liquidGlass = defineTheme({
  id: "liquid-glass",
  name: "Liquid Glass",
  description: "Frosted glass panels floating over slowly drifting color. (Work in progress.)",
  font: FONTS.sf,
  palette: {
    bg: "rgba(255, 255, 255, 0.06)",
    surface: "rgba(255, 255, 255, 0.08)",
    highlight: "rgba(255, 255, 255, 0.14)",
    text: "#f5f7fb",
    subdued: "rgba(235, 240, 250, 0.7)",
    accent: "#0a84ff",
    onAccent: "#fff",
  },
  extraCss: `
${scene("linear-gradient(#0d0f16, #0d0f16)", "#0d0f16")}
body::before {
  content: ""; position: fixed; inset: -20%; z-index: -1; pointer-events: none;
  background:
    radial-gradient(38% 42% at 22% 28%, #3a7bff 0%, transparent 70%),
    radial-gradient(34% 40% at 78% 24%, #c04bff 0%, transparent 70%),
    radial-gradient(40% 46% at 62% 82%, #00c2a8 0%, transparent 70%),
    radial-gradient(30% 36% at 18% 86%, #ff6a3d 0%, transparent 70%);
  filter: blur(60px) saturate(140%);
  animation: sc-glass-drift 38s ease-in-out infinite alternate;
}
@keyframes sc-glass-drift {
  50% { transform: translate3d(4%, -3%, 0) rotate(8deg) scale(1.08); }
  100% { transform: translate3d(-3%, 4%, 0) rotate(-6deg) scale(1.02); }
}
${PANELS} {
  backdrop-filter: blur(28px) saturate(180%);
  border-radius: 22px !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.12), 0 18px 40px rgba(0, 0, 0, 0.35) !important;
}
${PRIMARY_PILL} { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 6px 18px rgba(10, 132, 255, 0.4) !important; }
${NO_MOTION}`,
});

export const signatureThemes: CustomizerOption[] = [cyberpunk, synthwave, terminal, retro98, liquidGlass];

// "World" signature themes: Deep Space, Jungle and Beach. Like the themes in
// signature.ts each one is a full material (scene, panels, components, motion),
// not a recolor. Selectors and rules come from parts.ts.

import { LAYOUT, LYRICS, PANELS } from "../../theme-vars.js";
import type { CustomizerOption } from "../../types.js";
import { svgUrl } from "./art.js";
import { deepSpace, jungleCanopy, tropicalBeach, vineGarland, waveCrest } from "./art-worlds.js";
import { defineTheme, FONTS } from "./define-theme.js";
import {
  BIG_PLAY, CARD, CHIP_ON, CHIP_PILL, HEADINGS, noMotion, PRIMARY_HOVER, PRIMARY_PILL, PSEUDO_RESET, scene, TRACK_FG,
} from "./parts.js";

const CONTENT_PANELS = [LAYOUT.leftPanel, LAYOUT.mainPanel, LAYOUT.rightPanel];
const each = (suffix: string) => CONTENT_PANELS.map((p) => `${p}${suffix}`).join(", ");

// ── Deep Space ───────────────────────────────────────────────────────────────

/** Two tiled layers of tiny stars; offsets differ so the tiling isn't obvious. */
const STAR_DUST = [
  `radial-gradient(1px 1px at 20px 30px, #fff, transparent)`,
  `radial-gradient(1px 1px at 120px 80px, #cfe3ff, transparent)`,
  `radial-gradient(1.5px 1.5px at 60px 160px, #fff, transparent)`,
  `radial-gradient(1px 1px at 180px 200px, #ffe9c4, transparent)`,
  `radial-gradient(1.5px 1.5px at 90px 240px, #d9ccff, transparent)`,
].join(", ");

const deepSpaceTheme = defineTheme({
  id: "deep-space",
  name: "Deep Space",
  description: "Drift past a ringed planet: observatory-glass panels, a planet play button, shooting stars.",
  font: FONTS.avenir,
  palette: {
    bg: "rgba(6, 6, 24, 0.58)",
    surface: "rgba(12, 12, 38, 0.72)",
    highlight: "rgba(150, 170, 255, 0.14)",
    text: "#eef1ff",
    subdued: "#a3b1d9",
    accent: "#a78bfa",
    onAccent: "#fff",
  },
  extraCss: `
${scene(svgUrl(deepSpace()), "#010108")}
/* Twinkling star dust drifting slowly behind the panels. */
body::before {
  content: ""; position: fixed; inset: -260px; z-index: -1; pointer-events: none;
  background: ${STAR_DUST};
  background-size: 260px 260px;
  animation: sc-space-drift 160s linear infinite, sc-space-twinkle 5s ease-in-out infinite alternate;
}
@keyframes sc-space-drift { to { transform: translate3d(-260px, 130px, 0); } }
@keyframes sc-space-twinkle { from { opacity: 0.35; } to { opacity: 0.9; } }
/* A shooting star every 11 s. */
body::after {
  content: ""; position: fixed; top: 14vh; left: 0; width: 180px; height: 2px; z-index: -1;
  pointer-events: none; border-radius: 2px; opacity: 0;
  background: linear-gradient(90deg, transparent, rgba(207, 227, 255, 0.4) 60%, #fff);
  box-shadow: 0 0 8px rgba(207, 227, 255, 0.8);
  animation: sc-space-meteor 11s ease-in infinite;
}
@keyframes sc-space-meteor {
  0% { transform: translate3d(10vw, 0, 0) rotate(18deg); opacity: 0; }
  2% { opacity: 1; }
  9% { transform: translate3d(70vw, 26vh, 0) rotate(18deg); opacity: 0; }
  100% { transform: translate3d(70vw, 26vh, 0) rotate(18deg); opacity: 0; }
}

${PANELS} {
  backdrop-filter: blur(14px) saturate(130%);
  border-radius: 22px !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 0 0 1px rgba(170, 190, 255, 0.16),
    0 0 46px rgba(120, 100, 255, 0.14) !important;
}
/* Mission telemetry readout, bottom-right of the main view. */
${LAYOUT.mainPanel}::before {
  ${PSEUDO_RESET}
  content: "◉ ORBIT 408 KM   ·   V 7.66 KM/S   ·   SIGNAL ▮▮▮▮▯";
  position: absolute; top: 12px; right: 24px; z-index: 3; pointer-events: none;
  font: 600 9px/1 "SF Mono", Menlo, monospace; letter-spacing: 0.22em; color: #a3b1d9; opacity: 0.55;
}
${LAYOUT.playerBar} {
  border-radius: 22px !important; margin: 0 8px;
  background: linear-gradient(90deg, rgba(40, 24, 90, 0.75), rgba(10, 10, 32, 0.85) 35%, rgba(10, 10, 32, 0.85) 65%, rgba(20, 70, 110, 0.7)) !important;
}

${HEADINGS} {
  text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700 !important;
  background: linear-gradient(180deg, #ffffff 30%, #b9c4ff);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 12px rgba(167, 139, 250, 0.45));
}

${PRIMARY_PILL} {
  background: linear-gradient(115deg, #5b4bff, #a78bfa 45%, #5ee7ff) !important; background-size: 200% 100% !important;
  color: #fff !important; letter-spacing: 0.06em;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25), 0 0 22px rgba(140, 120, 255, 0.55) !important;
  transition: background-position 400ms, box-shadow 200ms;
}
${PRIMARY_HOVER} {
  background-position: 100% 0 !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4), 0 0 32px rgba(94, 231, 255, 0.6) !important;
}
/* The big play button is a little planet. */
${BIG_PLAY} {
  background: radial-gradient(circle at 32% 28%, #ffe2b8, #e0805a 42%, #5a2457 88%) !important;
  color: #fff !important;
  box-shadow: 0 0 0 2px rgba(245, 217, 176, 0.55), 0 0 18px rgba(255, 138, 92, 0.55) !important;
}
${CHIP_PILL} {
  background: rgba(167, 139, 250, 0.08) !important; color: #cdd5ff !important;
  box-shadow: inset 0 0 0 1px rgba(167, 139, 250, 0.45) !important;
  letter-spacing: 0.04em;
}
${CHIP_ON} { background: #a78bfa !important; color: #fff !important; box-shadow: 0 0 16px rgba(167, 139, 250, 0.8) !important; }

${CARD} { transition: transform 200ms, box-shadow 200ms; }
${CARD}:hover {
  transform: translateY(-3px);
  box-shadow: 0 0 0 1px rgba(94, 231, 255, 0.4), 0 10px 30px rgba(94, 231, 255, 0.18);
}

${TRACK_FG} { --fg-color: #5ee7ff !important; --bg-color: rgba(255, 255, 255, 0.16) !important; }
${TRACK_FG} [data-testid="progress-bar-background"] { box-shadow: 0 0 10px rgba(94, 231, 255, 0.55); }
::-webkit-scrollbar-thumb { background: linear-gradient(#a78bfa, #5ee7ff) !important; border-radius: 8px !important; }
${noMotion(`${CARD}`)}`,
});

// ── Jungle ───────────────────────────────────────────────────────────────────

/** Leaf shape: two round corners, two pointed ones. */
const LEAF_RADIUS = `22px 4px 22px 4px`;

const jungleTheme = defineTheme({
  id: "jungle",
  name: "Jungle",
  description: "Deep rainforest: vines over every panel, leaf-shaped buttons, sun shafts and fireflies.",
  font: FONTS.optima,
  palette: {
    bg: "rgba(7, 26, 13, 0.66)",
    surface: "rgba(11, 36, 18, 0.78)",
    highlight: "rgba(182, 240, 60, 0.13)",
    text: "#effbe2",
    subdued: "#a9cf8f",
    accent: "#b6f03c",
    onAccent: "#0b2a10",
  },
  extraCss: `
${scene(svgUrl(jungleCanopy()), "#05170c")}
/* Sun shafts slowly breathing through the canopy. */
body::before {
  content: ""; position: fixed; inset: -10% -20%; z-index: -1; pointer-events: none;
  background: repeating-linear-gradient(108deg, transparent 0 90px, rgba(255, 250, 200, 0.08) 90px 150px, transparent 150px 280px);
  mask-image: radial-gradient(ellipse at 55% 0%, #000 10%, transparent 70%);
  animation: sc-jungle-rays 16s ease-in-out infinite alternate;
}
@keyframes sc-jungle-rays {
  from { transform: translate3d(-3%, 0, 0); opacity: 0.6; }
  to { transform: translate3d(3%, 0, 0); opacity: 1; }
}
/* Fireflies. */
body::after {
  content: ""; position: fixed; inset: 0 0 -300px; z-index: -1; pointer-events: none;
  background:
    radial-gradient(3px 3px at 40px 60px, #f4ff9a, transparent),
    radial-gradient(2px 2px at 210px 140px, #eaff7a, transparent),
    radial-gradient(3px 3px at 130px 250px, #f4ff9a, transparent),
    radial-gradient(2px 2px at 290px 40px, #fffbc0, transparent);
  background-size: 320px 300px;
  filter: drop-shadow(0 0 4px #e6ff6a);
  animation: sc-jungle-fly 30s linear infinite, sc-jungle-glow 2.6s ease-in-out infinite alternate;
}
@keyframes sc-jungle-fly { to { transform: translate3d(40px, -300px, 0); } }
@keyframes sc-jungle-glow { from { opacity: 0.3; } to { opacity: 1; } }

${PANELS} {
  backdrop-filter: blur(6px) saturate(120%);
  border-radius: 28px 10px 28px 10px !important;
  box-shadow: inset 0 0 0 1px rgba(182, 240, 60, 0.16), 0 12px 32px rgba(0, 0, 0, 0.4) !important;
}
/* A vine draped over the top edge of each panel, swaying a little. */
${each("::after")} {
  ${PSEUDO_RESET}
  content: ""; position: absolute; top: 0; left: 18px; right: 18px; height: 34px; z-index: 3;
  pointer-events: none; transform-origin: top center;
  background: ${svgUrl(vineGarland())} repeat-x 0 0 / 160px 34px;
  filter: drop-shadow(0 3px 3px rgba(0, 0, 0, 0.45));
  animation: sc-jungle-sway 7s ease-in-out infinite alternate;
}
@keyframes sc-jungle-sway { from { transform: skewX(-3deg); } to { transform: skewX(3deg); } }
${LAYOUT.playerBar} {
  border-top: 2px solid #2e6b2a;
  background: linear-gradient(180deg, rgba(20, 52, 24, 0.92), rgba(6, 22, 10, 0.95)) !important;
}

${HEADINGS} {
  letter-spacing: 0.01em; font-weight: 700 !important;
  background: linear-gradient(90deg, #e2ff8a, #7fdc6a);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.35));
}

${PRIMARY_PILL} {
  border-radius: ${LEAF_RADIUS} !important;
  background: linear-gradient(135deg, #d8ff6a, #7fcf2a) !important; color: #0b2a10 !important;
  box-shadow: 0 4px 0 #3c7417, 0 8px 18px rgba(0, 0, 0, 0.35) !important;
  transition: transform 120ms, box-shadow 120ms;
}
${PRIMARY_HOVER} { transform: translateY(-1px) rotate(-1deg); background: linear-gradient(135deg, #ecff9a, #94e03a) !important; }
[data-encore-id="buttonPrimary"]:active > span:first-child { transform: translateY(3px); box-shadow: 0 1px 0 #3c7417 !important; }
${BIG_PLAY} {
  border-radius: 50% 8px 50% 8px !important;
  background: linear-gradient(135deg, #d8ff6a, #6fbf22) !important; color: #0b2a10 !important;
  box-shadow: 0 3px 0 #3c7417, 0 0 16px rgba(182, 240, 60, 0.35) !important;
}
${CHIP_PILL} {
  border-radius: ${LEAF_RADIUS} !important;
  background: rgba(46, 107, 42, 0.35) !important; color: #d6f5b8 !important;
  box-shadow: inset 0 0 0 1px rgba(182, 240, 60, 0.35) !important;
}
${CHIP_ON} { background: #b6f03c !important; color: #0b2a10 !important; }

${CARD} { border-radius: 24px 8px 24px 8px !important; transition: background 160ms, box-shadow 160ms; }
${CARD}:hover { background: rgba(182, 240, 60, 0.08) !important; box-shadow: inset 0 0 0 1px rgba(182, 240, 60, 0.35); }
${CARD} img { border-radius: 18px 4px 18px 4px !important; }

${TRACK_FG} { --fg-color: #b6f03c !important; --bg-color: rgba(214, 245, 184, 0.16) !important; }
::-webkit-scrollbar-thumb { background: #3f7a35 !important; border-radius: 10px 2px !important; }
${noMotion(`${each("::after")}`)}`,
});

// ── Beach ────────────────────────────────────────────────────────────────────

const beachTheme = defineTheme({
  id: "beach",
  name: "Beach",
  description: "Sunny tropical shore: sand-glass panels, a striped awning, a life-ring play button, rolling waves.",
  font: FONTS.avenirRounded,
  palette: {
    bg: "rgba(255, 251, 242, 0.74)",
    surface: "rgba(255, 249, 236, 0.84)",
    highlight: "rgba(24, 182, 200, 0.16)",
    text: "#0b3954",
    subdued: "#3f6f86",
    accent: "#ff6b4a",
    onAccent: "#fff",
    scheme: "light",
  },
  extraCss: `
${scene(svgUrl(tropicalBeach()), "#a6e3fb")}
/* Waves rolling in along the bottom of the window. */
body::before {
  content: ""; position: fixed; left: 0; bottom: 0; width: 200%; height: 48px; z-index: -1; pointer-events: none;
  background: ${svgUrl(waveCrest())} repeat-x 0 100% / 240px 48px;
  animation: sc-beach-roll 9s linear infinite;
}
@keyframes sc-beach-roll { to { transform: translate3d(-240px, 0, 0); } }
/* Warm sun glare in the top-right corner. */
body::after {
  content: ""; position: fixed; top: -20vh; right: -10vw; width: 60vw; height: 60vh; z-index: -1; pointer-events: none;
  background: radial-gradient(closest-side, rgba(255, 244, 190, 0.55), transparent);
  animation: sc-beach-glare 8s ease-in-out infinite alternate;
}
@keyframes sc-beach-glare { from { transform: scale(0.92); opacity: 0.7; } to { transform: scale(1.06); opacity: 1; } }

${PANELS} {
  /* No texture image here: an SVG noise fill on these huge panels stalls Chromium's painting. */
  backdrop-filter: blur(18px) saturate(130%);
  border-radius: 24px !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.75), 0 12px 30px rgba(11, 57, 84, 0.14) !important;
}
/* Striped beach-umbrella awning with a scalloped edge on the player bar. */
${LAYOUT.playerBar} { position: relative; border-radius: 24px !important; margin: 0 8px; }
${LAYOUT.playerBar}::before {
  ${PSEUDO_RESET}
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 12px; z-index: 3; pointer-events: none;
  background: repeating-linear-gradient(90deg, #ff6b4a 0 28px, #fffaf0 28px 56px);
  -webkit-mask: radial-gradient(circle at 14px 0, #000 13px, transparent 13.5px) 0 0 / 28px 12px repeat-x;
  mask: radial-gradient(circle at 14px 0, #000 13px, transparent 13.5px) 0 0 / 28px 12px repeat-x;
}

/* Spotify hardcodes white text for a dark UI; pull it back to ink on this light one. */
${LAYOUT.mainPanel} a:not([data-encore-id]), ${LAYOUT.leftPanel} a:not([data-encore-id]),
${LAYOUT.playerBar} a:not([data-encore-id]) { color: inherit; }
${LAYOUT.mainPanel} *:has(> a [data-testid="shortcut-image"]) * { color: #0b3954; }
${LAYOUT.playerBar} [data-testid="context-item-info-title"] { color: #0b3954 !important; }
${LAYOUT.playerBar} [data-testid="context-item-info-subtitles"] { color: #3f6f86 !important; }
/* The lyrics card keeps Spotify's dark album color, so its text stays white. */
${LYRICS.colorScope} { --text-base: #fff !important; --text-subdued: rgba(255, 255, 255, 0.8) !important; }
/* Home's header band is painted from the album color (usually dark gray); make it shallow water. */
${LAYOUT.mainPanel} div[style^="background-color"]:has(+ [data-testid="home-ads-container"]) {
  background-color: transparent !important;
  background-image: linear-gradient(rgba(24, 182, 200, 0.22), transparent) !important;
}

${LAYOUT.mainPanel} h1, ${LAYOUT.mainPanel} section h2 {
  font-weight: 800 !important;
  text-decoration: underline wavy #18b6c8; text-decoration-thickness: 2px; text-underline-offset: 8px;
}

${PRIMARY_PILL} {
  background: linear-gradient(135deg, #ff6b4a, #ffb347) !important; color: #fff !important;
  box-shadow: 0 6px 16px rgba(255, 107, 74, 0.35) !important;
}
${PRIMARY_HOVER} { animation: sc-beach-bob 1.6s ease-in-out infinite; }
@keyframes sc-beach-bob { 50% { transform: translateY(-3px) rotate(-1deg); } }
/* Life-ring play button. */
${BIG_PLAY} {
  background:
    radial-gradient(circle, #fffaf0 0 44%, transparent 46%),
    repeating-conic-gradient(#ff5a4a 0 45deg, #fffaf0 45deg 90deg) !important;
  color: #0b3954 !important;
  box-shadow: inset 0 0 0 1.5px rgba(11, 57, 84, 0.25), 0 4px 10px rgba(11, 57, 84, 0.25) !important;
}
${CHIP_PILL} {
  background: rgba(24, 182, 200, 0.12) !important; color: #0b5a6e !important;
  box-shadow: inset 0 0 0 1px rgba(24, 182, 200, 0.4) !important;
}
${CHIP_ON} { background: #18b6c8 !important; color: #fff !important; }

${CARD} { border-radius: 18px !important; transition: transform 200ms, box-shadow 200ms; }
${CARD}:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(11, 57, 84, 0.16); background: rgba(255, 255, 255, 0.6) !important; }
${LAYOUT.mainPanel} img, ${LAYOUT.leftPanel} img { border-radius: 12px; }

${TRACK_FG} { --fg-color: #ff6b4a !important; --bg-color: rgba(11, 57, 84, 0.15) !important; }
::-webkit-scrollbar-thumb { background: rgba(11, 57, 84, 0.25) !important; border-radius: 8px !important; }
${noMotion(`${PRIMARY_HOVER}, ${CARD}`)}`,
});

export const worldThemes: CustomizerOption[] = [deepSpaceTheme, jungleTheme, beachTheme];

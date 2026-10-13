// Signature themes: a palette plus texture/material CSS. Spotify 1.3.x hashes its
// layout class names, so these anchor on semantic landmarks (nav/main/aside) and
// confirmed data-testids only. All motion is disabled under reduced-motion.

import type { CustomizerOption } from "../../types.js";
import { defineTheme, FONTS } from "./define-theme.js";

/** Panels we style as "surfaces" in material themes. */
const PANELS = `body nav, body main, body aside, body [data-testid="now-playing-bar"]`;
const NO_MOTION = `@media (prefers-reduced-motion: reduce) { body::before, body::after, ${PANELS} { animation: none !important; } }`;

const liquidGlass = defineTheme({
  id: "liquid-glass",
  name: "Liquid Glass",
  description: "Apple-style frosted glass panels floating over slowly drifting color.",
  font: FONTS.sf,
  palette: {
    bg: "rgba(18, 20, 28, 0.38)",
    surface: "rgba(255, 255, 255, 0.07)",
    highlight: "rgba(255, 255, 255, 0.14)",
    text: "#f5f7fb",
    subdued: "rgba(235, 240, 250, 0.68)",
    accent: "#0a84ff",
    onAccent: "#fff",
  },
  extraCss: `
body { background: #0d0f16 !important; }
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
  0% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
  50% { transform: translate3d(4%, -3%, 0) rotate(8deg) scale(1.08); }
  100% { transform: translate3d(-3%, 4%, 0) rotate(-6deg) scale(1.02); }
}
${PANELS} {
  background-color: rgba(255, 255, 255, 0.06) !important;
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-radius: 22px !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    inset 0 -1px 0 rgba(255, 255, 255, 0.04),
    0 18px 40px rgba(0, 0, 0, 0.35) !important;
}
body button[data-testid="control-button-playpause"] {
  box-shadow: inset 0 1px 0 rgba(255,255,255,.45), 0 6px 18px rgba(10,132,255,.45) !important;
}
body img { border-radius: 12px; }
${NO_MOTION}`,
});

const cyberpunk = defineTheme({
  id: "cyberpunk",
  name: "Cyberpunk",
  description: "Neon yellow, magenta and cyan on black. Chamfered panels, scanlines, glitchy headings.",
  font: FONTS.sfMono,
  palette: {
    bg: "#07070c",
    surface: "#0e0e18",
    highlight: "#1b1530",
    text: "#e8f9ff",
    subdued: "#7fd8e8",
    accent: "#fcee0a",
  },
  extraCss: `
body::after {
  content: ""; position: fixed; inset: 0; z-index: 2147482000; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(0, 255, 255, 0.035) 0 1px, transparent 1px 3px);
  mix-blend-mode: screen;
}
${PANELS} {
  border: 1px solid rgba(0, 240, 255, 0.35) !important;
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px));
  box-shadow: inset 0 0 24px rgba(255, 0, 170, 0.08) !important;
}
body h1, body h2 {
  text-transform: uppercase; letter-spacing: 0.06em;
  text-shadow: 2px 0 #ff00aa, -2px 0 #00f0ff;
}
body h1:hover, body h2:hover { animation: sc-glitch 0.35s steps(2) infinite; }
@keyframes sc-glitch {
  0% { text-shadow: 3px 0 #ff00aa, -3px 0 #00f0ff; transform: translateX(0); }
  50% { text-shadow: -3px 0 #ff00aa, 3px 0 #00f0ff; transform: translateX(1px); }
  100% { text-shadow: 2px 0 #ff00aa, -2px 0 #00f0ff; transform: translateX(-1px); }
}
body a:hover, body button:hover { text-shadow: 0 0 8px currentColor; }
body button[data-testid="control-button-playpause"] {
  border-radius: 0 !important;
  clip-path: polygon(0 0, 80% 0, 100% 20%, 100% 100%, 20% 100%, 0 80%);
  box-shadow: 0 0 18px rgba(252, 238, 10, 0.6) !important;
}
body img { border-radius: 0 !important; }
${NO_MOTION}
@media (prefers-reduced-motion: reduce) { body h1:hover, body h2:hover { animation: none !important; } }`,
});

const synthwave = defineTheme({
  id: "synthwave",
  name: "Synthwave",
  description: "Outrun sunset sky over a glowing perspective grid, hot-pink neon type.",
  font: `${FONTS.futura}`,
  palette: {
    bg: "rgba(20, 8, 38, 0.72)",
    surface: "rgba(30, 10, 52, 0.78)",
    highlight: "rgba(255, 60, 172, 0.18)",
    text: "#ffe9fb",
    subdued: "#c79be0",
    accent: "#ff3cac",
    onAccent: "#fff",
  },
  extraCss: `
body { background: linear-gradient(180deg, #12002b 0%, #2b0a4d 45%, #ff3cac 72%, #ffb347 100%) !important; }
body::before {
  content: ""; position: fixed; left: -50%; right: -50%; bottom: 0; height: 45vh; z-index: -1;
  pointer-events: none; transform: perspective(300px) rotateX(60deg); transform-origin: bottom;
  background:
    repeating-linear-gradient(90deg, rgba(0, 240, 255, 0.55) 0 2px, transparent 2px 60px),
    repeating-linear-gradient(0deg, rgba(0, 240, 255, 0.55) 0 2px, transparent 2px 60px);
  mask-image: linear-gradient(to top, #000 30%, transparent);
  animation: sc-grid-run 4s linear infinite;
}
@keyframes sc-grid-run { to { background-position: 0 60px, 0 60px; } }
body h1, body h2 { font-style: italic; text-shadow: 0 0 10px #ff3cac, 0 0 26px rgba(255, 60, 172, 0.6); }
${PANELS} { backdrop-filter: blur(6px); }
${NO_MOTION}`,
});

const terminal = defineTheme({
  id: "terminal",
  name: "Terminal CRT",
  description: "Green phosphor on black with scanlines, glow and a faint flicker.",
  font: FONTS.menlo,
  palette: {
    bg: "#020802",
    surface: "#041004",
    highlight: "#0a240a",
    text: "#5bff6e",
    subdued: "#2fa83c",
    accent: "#5bff6e",
  },
  extraCss: `
body { text-shadow: 0 0 4px rgba(91, 255, 110, 0.55); }
body::after {
  content: ""; position: fixed; inset: 0; z-index: 2147482000; pointer-events: none;
  background:
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.28) 0 1px, transparent 1px 3px),
    radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, 0.55) 100%);
  animation: sc-crt-flicker 6s infinite;
}
@keyframes sc-crt-flicker { 0%, 97%, 100% { opacity: 1; } 98% { opacity: 0.85; } 99% { opacity: 0.95; } }
body h1, body h2, body h3 { text-transform: uppercase; letter-spacing: 0.08em; }
body h1::before, body h2::before { content: "> "; opacity: 0.6; }
body img { filter: grayscale(1) sepia(1) hue-rotate(70deg) saturate(3) brightness(0.85); border-radius: 0 !important; }
${PANELS} { border: 1px solid #0f3d14 !important; border-radius: 0 !important; }
${NO_MOTION}`,
});

const BEVEL_OUT = `inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #dfdfdf`;
const BEVEL_IN = `inset -1px -1px #ffffff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px #808080`;

const retro98 = defineTheme({
  id: "retro-98",
  name: "Retro 98",
  description: "Silver bevelled buttons, navy title bars and square everything. It's 1998 again.",
  font: FONTS.tahoma,
  palette: {
    bg: "#c0c0c0",
    surface: "#c0c0c0",
    highlight: "#000080",
    text: "#000000",
    subdued: "#404040",
    accent: "#000080",
    onAccent: "#fff",
    scheme: "light",
  },
  extraCss: `
body { background: #008080 !important; }
body * { border-radius: 0 !important; }
${PANELS} { box-shadow: ${BEVEL_OUT} !important; padding: 2px; }
body button:not([data-testid="control-button-playpause"]) { background-color: #c0c0c0; box-shadow: ${BEVEL_OUT}; }
body button:active { box-shadow: ${BEVEL_IN} !important; }
body input { background: #fff !important; box-shadow: ${BEVEL_IN}; color: #000 !important; }
body h1, body h2 {
  background: linear-gradient(90deg, #000080, #1084d0); color: #fff !important;
  padding: 2px 6px; font-weight: 700;
}
body [role="row"]:hover, body [aria-selected="true"][role="row"] { background: #000080 !important; color: #fff !important; }
body ::-webkit-scrollbar { width: 16px; height: 16px; background: #dfdfdf; }
body ::-webkit-scrollbar-thumb { background: #c0c0c0; box-shadow: ${BEVEL_OUT}; }`,
});

export const signatureThemes: CustomizerOption[] = [liquidGlass, cyberpunk, synthwave, terminal, retro98];

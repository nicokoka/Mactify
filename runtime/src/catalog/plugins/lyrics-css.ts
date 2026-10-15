// Stylesheet for the Beautiful lyrics plugin. The plugin tags Spotify's lyrics DOM
// with stable sc- classes (see lyrics.ts); everything here keys off those, never
// off Spotify's hashed class names.

import { LYRICS } from "../../theme-vars.js";

export type LyricsAnimation = "glow" | "rise" | "wave";
export type LyricsBackground = "album" | "glass" | "default";
export type LyricsSize = "large" | "medium" | "huge";

const LINE = `.sc-lyrics ${LYRICS.line}`;
/** Everything inside the scope except our background layer. */
const CONTENT = `.sc-lyrics > :not(.sc-lyrics-bg)`;

const SIZE_EM: Record<LyricsSize, number> = { medium: 0.78, large: 1, huge: 1.3 };

const BASE = `
${LINE} {
  transform-origin: left center;
  transition: transform 450ms var(--sc-ease), opacity 450ms var(--sc-ease),
    filter 450ms var(--sc-ease), text-shadow 450ms var(--sc-ease);
}
${LINE}[dir="rtl"] { transform-origin: right center; }
${LINE}.sc-lyric--past { opacity: 0.42 !important; color: var(--lyrics-color-active) !important; }
${LINE}.sc-lyric--future { opacity: 0.55 !important; }
${LINE}.sc-lyric--active { opacity: 1 !important; color: var(--lyrics-color-active) !important; }
${LINE}:hover { opacity: 0.9 !important; }`;

const ANIMATIONS: Record<LyricsAnimation, string> = {
  glow: `
.sc-lyrics--glow ${LYRICS.line}.sc-lyric--active {
  transform: scale(1.06);
  text-shadow: 0 0 18px color-mix(in srgb, var(--lyrics-color-active) 55%, transparent),
    0 0 42px color-mix(in srgb, var(--lyrics-color-active) 25%, transparent);
}
.sc-lyrics--glow ${LYRICS.line}.sc-lyric--future { filter: blur(1.2px); }
.sc-lyrics--glow ${LYRICS.line}.sc-lyric--past { filter: blur(0.6px); }`,
  rise: `
.sc-lyrics--rise ${LYRICS.line}.sc-lyric--active { animation: sc-lyric-rise 650ms var(--sc-ease) both; }
.sc-lyrics--rise ${LYRICS.line}.sc-lyric--shift {
  animation: sc-lyric-follow 650ms var(--sc-ease) both;
  animation-delay: calc(var(--sc-i, 1) * 60ms);
}
@keyframes sc-lyric-rise {
  from { transform: translateY(14px) scale(0.98); opacity: 0.4; }
  to { transform: none; opacity: 1; }
}
@keyframes sc-lyric-follow { from { transform: translateY(12px); } to { transform: none; } }`,
  wave: `
.sc-lyrics--wave ${LYRICS.line}.sc-lyric--active {
  text-shadow: 0 0 22px color-mix(in srgb, var(--lyrics-color-active) 40%, transparent);
}
/* Visually hidden, still read by screen readers (the wave copy is aria-hidden). */
.sc-lyric--waving > :not(.sc-wave) {
  position: absolute !important; width: 1px; height: 1px; overflow: hidden;
  clip-path: inset(50%); white-space: nowrap;
}
.sc-wave-word { display: inline-block; white-space: nowrap; }
/* Per-letter animation-delay is set inline by lyrics.ts. */
.sc-wave-char { display: inline-block; animation: sc-lyric-wave 700ms var(--sc-ease) both; }
@keyframes sc-lyric-wave {
  0% { transform: translateY(0.35em); opacity: 0.35; }
  45% { transform: translateY(-0.12em); opacity: 1; }
  100% { transform: none; opacity: 1; }
}`,
};

const BACKGROUNDS: Record<LyricsBackground, string> = {
  album: `
${CONTENT} {
  --lyrics-color-background: rgba(6, 6, 10, 0.35) !important;
  --lyrics-color-active: #fff !important;
  --lyrics-color-passed: #fff !important;
  --lyrics-color-inactive: rgba(255, 255, 255, 0.92) !important;
}
.sc-lyrics-bg { position: relative; overflow: hidden; isolation: isolate; background: #08080c !important; }
.sc-lyrics-bg::before {
  content: ""; position: absolute; inset: -30%; z-index: -1;
  background: var(--sc-lyrics-art, none) center / cover no-repeat;
  filter: blur(80px) saturate(1.7) brightness(0.62);
  animation: sc-lyrics-drift 38s ease-in-out infinite alternate;
}
.sc-lyrics-bg--fresh::before { animation: sc-lyrics-fade 900ms ease-out, sc-lyrics-drift 38s ease-in-out infinite alternate; }
.sc-lyrics-bg::after {
  content: ""; position: absolute; inset: 0; z-index: -1;
  background: radial-gradient(120% 90% at 30% 20%, transparent 30%, rgba(0, 0, 0, 0.55) 100%);
}
@keyframes sc-lyrics-drift {
  from { transform: rotate(0deg) scale(1.05); }
  to { transform: rotate(14deg) scale(1.25) translate(4%, -3%); }
}
@keyframes sc-lyrics-fade { from { opacity: 0; } to { opacity: 1; } }`,
  glass: `
${CONTENT} {
  --lyrics-color-background: rgba(6, 6, 10, 0.35) !important;
  --lyrics-color-active: #fff !important;
  --lyrics-color-passed: #fff !important;
  --lyrics-color-inactive: rgba(255, 255, 255, 0.9) !important;
}
.sc-lyrics-bg {
  background:
    radial-gradient(90% 70% at 15% 0%, color-mix(in srgb, var(--lyrics-color-background), #fff 12%), transparent 75%),
    radial-gradient(70% 60% at 100% 100%, color-mix(in srgb, var(--lyrics-color-background) 75%, transparent), transparent 75%),
    linear-gradient(180deg, #101016, #050507) !important;
}`,
  default: "",
};

/** Turn every movement off; keep the brightness changes that carry meaning. */
const STILL = `
.sc-lyrics--still ${LYRICS.line} { transform: none !important; animation: none !important; transition-property: opacity, color !important; }
.sc-lyrics--still .sc-wave-char, .sc-lyrics--still .sc-lyrics-bg::before { animation: none !important; }`;

export function lyricsCss(anim: LyricsAnimation, bg: LyricsBackground, size: LyricsSize): string {
  const em = SIZE_EM[size];
  const sizeCss = em === 1 ? "" : `.sc-lyrics ${LYRICS.line} { font-size: ${em}em !important; }`;
  return [BASE, ANIMATIONS[anim], BACKGROUNDS[bg], sizeCss, STILL].join("\n");
}

/** CSS that only carries the current cover art; swapped on every song change. */
export function artCss(url: string): string {
  // Spotify covers are plain https URLs; refuse anything that could break out of url("").
  if (!/^https:\/\/[^"'\\\s()]+$/.test(url)) return "";
  return `.sc-lyrics-bg { --sc-lyrics-art: url("${url}"); }`;
}

// Appearance options. Selectors anchored to data-testid / encore CSS vars that
// exist in Spotify 1.3.x — best-effort and clearly commented, since an update can
// rename them (the engine sandboxes any that break).

import { injectStyle } from "../dom.js";
import { accentCss, isHexColor } from "../theme-vars.js";
import type { CustomizerOption } from "../types.js";

const DEFAULT_ACCENT = "#1db954";

/** Black or white, whichever reads better on `hex` (relative luminance). */
function readableOn(hex: string): string {
  const full = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, "#$1$1$2$2$3$3") : hex;
  const channel = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255;
  const [r, g, b] = [channel(1), channel(3), channel(5)];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.5 ? "#000" : "#fff";
}

export const appearanceOptions: CustomizerOption[] = [
  {
    id: "grayscale-ui",
    name: "Grayscale UI",
    description: "Desaturate the entire interface. A dramatic, always-works demo option.",
    category: "appearance",
    kind: "css",
    css: `html { filter: grayscale(1); }`,
  },
  {
    id: "rounded-images",
    name: "Rounded artwork",
    description: "Round the corners of album and playlist artwork.",
    category: "appearance",
    kind: "css",
    css: `img { border-radius: 8px; }`,
  },
  {
    id: "thick-progress-bar",
    name: "Thicker progress bar",
    description: "Make the playback progress bar taller and easier to grab. Timestamps are untouched.",
    category: "appearance",
    kind: "js", // dynamic: height comes from settings
    settings: [
      {
        key: "height",
        label: "Bar height",
        type: "select",
        default: "8",
        choices: [
          { value: "6", label: "Slightly thicker (6px)" },
          { value: "8", label: "Thick (8px)" },
          { value: "10", label: "Chunky (10px)" },
        ],
      },
    ],
    init(ctx) {
      const px = Number(ctx.getSetting<string>("height", "8")) || 8;
      // Spotify sizes the track via --progress-bar-height on the inner
      // [data-testid="progress-bar"]. The old transform: scaleY() on the outer
      // wrapper also stretched the hover time label, so we only touch the variable.
      return injectStyle(
        `[data-testid="playback-progressbar"] [data-testid="progress-bar"] {
           --progress-bar-height: ${px}px !important;
         }
         [data-testid="playback-progressbar"] {
           min-height: ${px + 8}px;
         }`,
        "thick-progress-bar",
      );
    },
  },
  {
    id: "accent-color",
    name: "Accent color",
    description: "Replace Spotify's green everywhere (play button, links, progress bar). Wins over themes.",
    category: "appearance",
    kind: "js", // dynamic: reads the user's color from config at apply time
    settings: [{ key: "color", label: "Accent", type: "color", default: DEFAULT_ACCENT }],
    init(ctx) {
      const raw = ctx.getSetting<string>("color", DEFAULT_ACCENT);
      const color = isHexColor(raw) ? raw : DEFAULT_ACCENT;
      return injectStyle(accentCss(color, readableOn(color)), "accent-color");
    },
  },
];

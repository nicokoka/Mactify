// Custom background: any image or GIF from disk behind see-through panels. Works on
// top of any theme. The picture is stored in IndexedDB (see asset-store.ts).

import { assetKeyFor, getAsset } from "../../asset-store.js";
import { injectStyle } from "../../dom.js";
import { FRAME_PARTS, LAYOUT, PANELS } from "../../theme-vars.js";
import type { CustomizerOption } from "../../types.js";

const ID = "plugin-custom-background";

/** Encore scopes inside the panels whose backgrounds must turn translucent. */
const PANEL_SCOPES = [
  "html .encore-dark-theme",
  "html .encore-dark-theme .encore-base-set",
  "html .encore-dark-theme .encore-app-frame-set",
  "html .encore-light-theme",
  "html .encore-light-theme .encore-base-set",
].join(", ");

function backdropCss(url: string, panelAlpha: number, blurPx: number): string {
  const glass = (a: number) => `rgba(8, 8, 12, ${a.toFixed(2)})`;
  return `
/* On <html>, not <body>: body's own background would cover the z-index:-1 layer. */
html { background: #000 !important; }
html body { background: transparent !important; }
html body::before {
  content: ""; position: fixed; inset: ${blurPx ? -blurPx * 2 : 0}px; z-index: -1; pointer-events: none;
  background: url("${url}") center / cover no-repeat;
  ${blurPx ? `filter: blur(${blurPx}px);` : ""}
  animation: none !important; transform: none !important; mask-image: none !important;
}
html ${FRAME_PARTS} { background: transparent !important; }
${PANEL_SCOPES} {
  --background-base: ${glass(panelAlpha)} !important;
  --background-elevated-base: ${glass(Math.min(1, panelAlpha + 0.1))} !important;
  --background-highlight: rgba(255, 255, 255, 0.10) !important;
  --background-elevated-highlight: rgba(255, 255, 255, 0.14) !important;
}
html ${PANELS} { backdrop-filter: blur(6px); }
html ${LAYOUT.mainPanel} { background-color: transparent !important; }`;
}

export const customBackground: CustomizerOption = {
  id: ID,
  name: "Custom background",
  description: "Put any image or GIF from your Mac behind Spotify. Works with every theme.",
  category: "plugin",
  kind: "js",
  settings: [
    { key: "image", label: "Image", type: "image", default: "" },
    {
      key: "panels",
      label: "Panel see-through",
      type: "select",
      default: "0.55",
      choices: [
        { value: "0.75", label: "A little" },
        { value: "0.55", label: "Balanced" },
        { value: "0.35", label: "A lot" },
        { value: "0.15", label: "Almost clear" },
      ],
    },
    {
      key: "blur",
      label: "Blur image",
      type: "select",
      default: "0",
      choices: [
        { value: "0", label: "Sharp" },
        { value: "8", label: "Soft" },
        { value: "24", label: "Dreamy" },
      ],
    },
  ],
  init(ctx) {
    const alpha = Number(ctx.getSetting<string>("panels", "0.55")) || 0.55;
    const blur = Number(ctx.getSetting<string>("blur", "0")) || 0;
    let remove: (() => void) | null = null;
    let cancelled = false;
    void getAsset(assetKeyFor(ID, "image"))
      .then((url) => {
        if (cancelled || !url) return;
        remove = injectStyle(backdropCss(url, alpha, blur), "custom-background");
      })
      .catch((err: unknown) => console.warn("[SpotifyCustomizer] custom background unavailable", err));
    return () => {
      cancelled = true;
      remove?.();
    };
  },
};

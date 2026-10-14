// Fun / eye-candy plugins. Purely cosmetic; each cleans up fully on disable.

import { injectStyle } from "../../dom.js";
import { getNowPlaying, largeArtUrl, onPlayStateChange, onTrackChange } from "../../now-playing.js";
import { whenPresent } from "../../spotify-api.js";
import { FRAME_PARTS, LAYOUT } from "../../theme-vars.js";
import type { CustomizerOption } from "../../types.js";
import { el, LIKE_BUTTON_SELECTOR, prefersReducedMotion } from "./ui.js";

// The background agent's loopback endpoint that drives the system-wide popup.
const OVERLAY_ENDPOINT = "http://127.0.0.1:47621/overlay";

interface OverlaySettings {
  enabled: boolean;
  showOverFullScreen: boolean;
  seconds: number;
}

let overlaySyncTimer = 0;

/**
 * Push toast settings to the background agent (it may not be running; that's fine).
 * Debounced: a settings change runs cleanup ("off") then init ("on") in one tick,
 * and two racing requests could land out of order — only the last state is sent.
 */
function syncSystemOverlay(settings: OverlaySettings): void {
  window.clearTimeout(overlaySyncTimer);
  overlaySyncTimer = window.setTimeout(() => {
    // text/plain keeps this a CORS "simple" request (no preflight round-trip).
    fetch(OVERLAY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(settings),
    }).catch(() => {});
  }, 150);
}

const trackToast: CustomizerOption = {
  id: "plugin-track-toast",
  name: "Now-playing toast",
  description:
    "A glassy card with the artwork, title and artist slides in whenever the song changes — in Spotify, and over your other apps.",
  category: "plugin",
  kind: "js",
  settings: [
    { key: "seconds", label: "Show for (seconds)", type: "number", default: 4, min: 1, max: 15 },
    { key: "overOtherApps", label: "Pop up over other apps", type: "toggle", default: true },
    { key: "overFullScreen", label: "…including full-screen apps", type: "toggle", default: true },
  ],
  init(ctx) {
    const seconds = Math.max(1, Number(ctx.getSetting<number>("seconds", 4)) || 4);
    const ms = seconds * 1000;
    const overlay: OverlaySettings = {
      enabled: ctx.getSetting<boolean>("overOtherApps", true),
      showOverFullScreen: ctx.getSetting<boolean>("overFullScreen", true),
      seconds,
    };
    syncSystemOverlay(overlay);
    const toast = el("div", "sc-toast");
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
    let timer = 0;
    const dispose = onTrackChange((np) => {
      const art = el("img", "sc-toast-art");
      art.src = np.artUrl;
      art.alt = "";
      const meta = el("div", "sc-toast-meta");
      meta.append(el("span", "sc-toast-kicker", "Now playing"), el("strong", "", np.title), el("span", "", np.artist));
      toast.replaceChildren(art, meta);
      // Resend each track so an agent started after Spotify picks the settings up.
      syncSystemOverlay(overlay);
      toast.classList.add("sc-toast--show");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => toast.classList.remove("sc-toast--show"), ms);
    });
    return () => {
      dispose();
      window.clearTimeout(timer);
      toast.remove();
      syncSystemOverlay({ ...overlay, enabled: false });
    };
  },
};

/** Lift a muddy average color into a usable tint: keep the hue, fix S and L. */
function vivid(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  if (d) {
    const [rn, gn, bn] = [r / 255, g / 255, b / 255];
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  // Near-grey art stays grey; everything else gets enough color to read as a tint.
  const sat = s < 0.08 ? s * 100 : Math.max(55, s * 100);
  return `hsl(${Math.round((h + 360) % 360)} ${Math.round(sat)}% ${Math.round(Math.min(0.55, Math.max(0.38, l)) * 100)}%)`;
}

/** Average color of an image, or null if it can't be read (e.g. CORS-tainted). */
function averageColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 16;
        const g = canvas.getContext("2d", { willReadFrequently: true });
        if (!g) return resolve(null);
        g.drawImage(img, 0, 0, 16, 16);
        const { data } = g.getImageData(0, 0, 16, 16);
        let r = 0, gr = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i] ?? 0;
          gr += data[i + 1] ?? 0;
          b += data[i + 2] ?? 0;
        }
        const n = data.length / 4;
        resolve(vivid(r / n, gr / n, b / n));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const AMBIENT_SCOPES = [
  "html .encore-dark-theme",
  "html .encore-dark-theme .encore-base-set",
  "html .encore-dark-theme .encore-app-frame-set",
].join(", ");

const ambientColor: CustomizerOption = {
  id: "plugin-ambient-color",
  name: "Ambient album color",
  description: "Tints all of Spotify with the current album art's color, fading smoothly between songs.",
  category: "plugin",
  kind: "js",
  settings: [
    {
      key: "strength",
      label: "Strength",
      type: "select",
      default: "28",
      choices: [
        { value: "16", label: "Subtle" },
        { value: "28", label: "Noticeable" },
        { value: "42", label: "Bold" },
      ],
    },
  ],
  init(ctx) {
    const VAR = "--sc-ambient";
    const pct = Number(ctx.getSetting<string>("strength", "28")) || 28;
    const tint = (base: string, p: number) => `color-mix(in srgb, var(${VAR}) ${p}%, ${base})`;
    // Registered so it animates; every tinted var derives from it and follows along.
    const removeStyle = injectStyle(
      `@property ${VAR} { syntax: "<color>"; inherits: true; initial-value: #121212; }
       html { transition: ${VAR} 1.4s ease; }
       ${AMBIENT_SCOPES} {
         --background-base: ${tint("#101012", pct)} !important;
         --background-elevated-base: ${tint("#1a1a1d", pct)} !important;
         --background-highlight: ${tint("#26262a", pct + 6)} !important;
         --background-elevated-highlight: ${tint("#2c2c31", pct + 6)} !important;
       }
       html ${FRAME_PARTS} { background-color: ${tint("#000", Math.round(pct * 0.6))} !important; }
       html ${LAYOUT.mainPanel} > div { background-image: linear-gradient(180deg, color-mix(in srgb, var(${VAR}) 45%, transparent), transparent 360px); }`,
      "ambient-color",
    );
    let alive = true;
    const update = async (url: string): Promise<void> => {
      const color = await averageColor(url);
      if (alive && color) document.documentElement.style.setProperty(VAR, color);
    };
    // At boot the player bar may not have rendered its artwork yet; wait for it.
    const stopWaiting = whenPresent(() => {
      const url = getNowPlaying().artUrl;
      if (url) void update(url);
      return !!url;
    });
    const dispose = onTrackChange((np) => {
      // The <img> src can lag the title by a frame; read it once more shortly after.
      window.setTimeout(() => void update(getNowPlaying().artUrl || np.artUrl), 300);
    });
    return () => {
      alive = false;
      stopWaiting();
      dispose();
      removeStyle();
      document.documentElement.style.removeProperty(VAR);
    };
  },
};

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "touchstart"] as const;

const screensaver: CustomizerOption = {
  id: "plugin-screensaver",
  name: "Big-art screensaver",
  description: "After you've been idle a while, show the album art full-screen. Any input wakes it.",
  category: "plugin",
  kind: "js",
  settings: [{ key: "minutes", label: "Idle minutes", type: "number", default: 3, min: 1, max: 60 }],
  init(ctx) {
    const idleMs = Math.max(1, Number(ctx.getSetting<number>("minutes", 3)) || 3) * 60_000;
    const overlay = el("div", "sc-saver");
    overlay.hidden = true;
    document.body.appendChild(overlay);

    const show = (): void => {
      const np = getNowPlaying();
      if (!np.title) return;
      const big = largeArtUrl(np.artUrl);
      overlay.style.setProperty("--sc-saver-art", `url("${CSS.escape(big)}")`);
      const art = el("img", "sc-saver-art");
      art.src = big;
      art.alt = "";
      const meta = el("div", "sc-saver-meta");
      meta.append(el("strong", "", np.title), el("span", "", np.artist));
      overlay.replaceChildren(art, meta);
      overlay.hidden = false;
    };
    let timer = window.setTimeout(show, idleMs);
    const onActivity = (): void => {
      overlay.hidden = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(show, idleMs);
    };
    ACTIVITY_EVENTS.forEach((t) => window.addEventListener(t, onActivity, { capture: true, passive: true }));
    // Keep the overlay current if the song changes while it's up.
    const disposeTrack = onTrackChange(() => {
      if (!overlay.hidden) show();
    });
    return () => {
      window.clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((t) => window.removeEventListener(t, onActivity, { capture: true }));
      disposeTrack();
      overlay.remove();
    };
  },
};

const BURST_GLYPHS = ["♥", "✦", "♪", "★"];
const BURST_COUNT = 16;

const heartBurst: CustomizerOption = {
  id: "plugin-heart-burst",
  name: "Heart burst",
  description: "Liking a song sets off a little burst of hearts and sparkles.",
  category: "plugin",
  kind: "js",
  init() {
    const onClick = (e: MouseEvent): void => {
      const btn = (e.target as Element | null)?.closest<HTMLElement>(LIKE_BUTTON_SELECTOR);
      if (!btn || prefersReducedMotion()) return;
      // Only celebrate saving, not un-saving: the label still says "Add/Save" pre-click.
      const label = (btn.getAttribute("aria-label") ?? "").toLowerCase();
      if (label.includes("remove") || btn.getAttribute("aria-checked") === "true") return;
      const rect = btn.getBoundingClientRect();
      const layer = el("div", "sc-burst");
      layer.style.left = `${rect.left + rect.width / 2}px`;
      layer.style.top = `${rect.top + rect.height / 2}px`;
      for (let i = 0; i < BURST_COUNT; i++) {
        const angle = (i / BURST_COUNT) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 40 + Math.random() * 50;
        const p = el("span", "sc-burst-p", BURST_GLYPHS[i % BURST_GLYPHS.length]);
        p.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
        p.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
        p.style.setProperty("--rot", `${Math.round(Math.random() * 120 - 60)}deg`);
        p.style.animationDelay = `${Math.random() * 60}ms`;
        layer.appendChild(p);
      }
      document.body.appendChild(layer);
      window.setTimeout(() => layer.remove(), 1000);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  },
};

const equalizer: CustomizerOption = {
  id: "plugin-equalizer",
  name: "Dancing equalizer",
  description: "Decorative bouncing bars next to the song title while music plays. Freezes when paused.",
  category: "plugin",
  kind: "js",
  init() {
    const bars = el("span", "sc-eq");
    bars.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 4; i++) bars.appendChild(el("i"));
    const place = (): boolean => {
      const title = document.querySelector('[data-testid="now-playing-widget"] [data-testid="context-item-info-title"]');
      if (!title) return false;
      if (bars.parentElement !== title.parentElement) title.after(bars);
      return true;
    };
    const stopWaiting = whenPresent(place);
    const disposeTrack = onTrackChange(() => place()); // the title node is re-rendered per track
    const disposeState = onPlayStateChange((np) => bars.classList.toggle("sc-eq--paused", !np.isPlaying));
    return () => {
      stopWaiting();
      disposeTrack();
      disposeState();
      bars.remove();
    };
  },
};

export const funPlugins: CustomizerOption[] = [trackToast, ambientColor, screensaver, heartBurst, equalizer];

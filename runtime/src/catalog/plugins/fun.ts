// Fun / eye-candy plugins. Purely cosmetic; each cleans up fully on disable.

import { injectStyle } from "../../dom.js";
import { getNowPlaying, largeArtUrl, onPlayStateChange, onTrackChange } from "../../now-playing.js";
import { whenPresent } from "../../spotify-api.js";
import type { CustomizerOption } from "../../types.js";
import { el, LIKE_BUTTON_SELECTOR, prefersReducedMotion } from "./ui.js";

const trackToast: CustomizerOption = {
  id: "plugin-track-toast",
  name: "Now-playing toast",
  description: "A glassy card with the artwork, title and artist slides in whenever the song changes.",
  category: "plugin",
  kind: "js",
  settings: [{ key: "seconds", label: "Show for (seconds)", type: "number", default: 4, min: 1, max: 15 }],
  init(ctx) {
    const ms = Math.max(1, Number(ctx.getSetting<number>("seconds", 4)) || 4) * 1000;
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
      toast.classList.add("sc-toast--show");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => toast.classList.remove("sc-toast--show"), ms);
    });
    return () => {
      dispose();
      window.clearTimeout(timer);
      toast.remove();
    };
  },
};

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
        resolve(`rgb(${Math.round(r / n)}, ${Math.round(gr / n)}, ${Math.round(b / n)})`);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const ambientColor: CustomizerOption = {
  id: "plugin-ambient-color",
  name: "Ambient album color",
  description: "Tints the whole background with the current album art's color, fading between songs.",
  category: "plugin",
  kind: "js",
  init() {
    const VAR = "--sc-ambient";
    const removeStyle = injectStyle(
      `@property ${VAR} { syntax: "<color>"; inherits: true; initial-value: transparent; }
       html { transition: ${VAR} 1.2s ease; }
       body main { background-image: linear-gradient(180deg, color-mix(in srgb, var(${VAR}) 55%, transparent) 0%, transparent 420px) !important; }
       body [data-testid="now-playing-bar"] { background-image: linear-gradient(90deg, color-mix(in srgb, var(${VAR}) 30%, transparent), transparent 60%) !important; }`,
      "ambient-color",
    );
    let alive = true;
    const update = async (url: string): Promise<void> => {
      const color = await averageColor(url);
      if (alive && color) document.documentElement.style.setProperty(VAR, color);
    };
    void update(getNowPlaying().artUrl);
    const dispose = onTrackChange((np) => {
      // The <img> src can lag the title by a frame; read it once more shortly after.
      window.setTimeout(() => void update(getNowPlaying().artUrl || np.artUrl), 300);
    });
    return () => {
      alive = false;
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

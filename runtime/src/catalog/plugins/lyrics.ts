// Beautiful lyrics: animates Spotify's own synced lyrics and paints a nicer
// background behind them. Spotify keeps doing the timing; we only watch which line
// it marks as current and tag lines with stable sc- classes that lyrics-css.ts styles.
// We never remove or rewrite Spotify's nodes; Wave only appends a sibling span.

import { injectStyle } from "../../dom.js";
import { getNowPlaying, largeArtUrl, onTrackChange } from "../../now-playing.js";
import { LYRICS } from "../../theme-vars.js";
import type { CustomizerOption } from "../../types.js";
import {
  artCss,
  lyricsCss,
  type LyricsAnimation,
  type LyricsBackground,
  type LyricsSize,
} from "./lyrics-css.js";
import { el, prefersReducedMotion } from "./ui.js";

const ID = "plugin-beautiful-lyrics";

const ACTIVE = "sc-lyric--active";
const PAST = "sc-lyric--past";
const FUTURE = "sc-lyric--future";
const SHIFT = "sc-lyric--shift";
const WAVING = "sc-lyric--waving";
const SCOPE = "sc-lyrics";
const BG = "sc-lyrics-bg";
const BG_FRESH = "sc-lyrics-bg--fresh";
/** Every class this plugin may add, for a complete cleanup. */
const OUR_CLASSES = [ACTIVE, PAST, FUTURE, SHIFT, WAVING, SCOPE, BG, BG_FRESH];

/** Lines below the current one that follow it up in Rise. */
const RISE_FOLLOWERS = 3;
/** Wave finishes the whole line within about this long, however long it is. */
const WAVE_TOTAL_MS = 900;
const WAVE_MAX_STEP_MS = 28;

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Class list without our own additions, so our edits don't look like Spotify's. */
const spotifyClasses = (line: Element): string => line.className.replace(/(^|\s)sc-\S+/g, "");

const isCurrent = (line: Element): boolean =>
  getComputedStyle(line).getPropertyValue("view-timeline-name").includes(LYRICS.activeTimeline);

/** Spotify's background layer: an empty, painted direct child of the color scope. */
function findBackgroundLayer(scope: Element): HTMLElement | null {
  for (const child of Array.from(scope.children)) {
    if (!(child instanceof HTMLElement) || child.childElementCount) continue;
    if (getComputedStyle(child).backgroundColor !== "rgba(0, 0, 0, 0)") return child;
  }
  return null;
}

/** Letter-by-letter copy of the line; the original stays for screen readers. */
function startWave(line: HTMLElement): void {
  const text = (line.textContent ?? "").trim();
  if (!text || text === "♪") return;
  const wrap = el("span", "sc-wave");
  wrap.setAttribute("aria-hidden", "true");
  const step = Math.min(WAVE_MAX_STEP_MS, Math.round(WAVE_TOTAL_MS / [...text].length));
  let i = 0;
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      wrap.append(" ");
      continue;
    }
    const word = el("span", "sc-wave-word");
    for (const ch of part) {
      const span = el("span", "sc-wave-char", ch);
      span.style.animationDelay = `${i++ * step}ms`;
      word.append(span);
    }
    wrap.append(word);
  }
  line.append(wrap);
  line.classList.add(WAVING);
}

function stopWave(line: HTMLElement): void {
  line.classList.remove(WAVING);
  line.querySelectorAll(":scope > .sc-wave").forEach((n) => n.remove());
}

/** Restart Rise's follow-up motion on the next few lines. */
function shiftFollowers(lines: readonly HTMLElement[], activeIdx: number): void {
  lines.forEach((l) => l.classList.remove(SHIFT));
  const followers = lines.slice(activeIdx + 1, activeIdx + 1 + RISE_FOLLOWERS);
  if (!followers.length) return;
  void followers[0]?.offsetWidth; // reflow so the animation restarts
  followers.forEach((l, i) => {
    l.style.setProperty("--sc-i", String(i + 1));
    l.classList.add(SHIFT);
  });
}

export const beautifulLyrics: CustomizerOption = {
  id: ID,
  name: "Beautiful lyrics",
  description:
    "Animated lyrics with a blurred album-art background. Pick how the current line moves.",
  category: "plugin",
  kind: "js",
  settings: [
    {
      key: "animation",
      label: "Animation",
      type: "select",
      default: "glow",
      choices: [
        { value: "glow", label: "Glow" },
        { value: "rise", label: "Rise" },
        { value: "wave", label: "Wave" },
      ],
    },
    {
      key: "background",
      label: "Background",
      type: "select",
      default: "album",
      choices: [
        { value: "album", label: "Album colors" },
        { value: "glass", label: "Dark glass" },
        { value: "default", label: "Spotify default" },
      ],
    },
    {
      key: "size",
      label: "Text size",
      type: "select",
      default: "large",
      choices: [
        { value: "medium", label: "Medium" },
        { value: "large", label: "Large" },
        { value: "huge", label: "Huge" },
      ],
    },
  ],
  init(ctx) {
    const anim = pick<LyricsAnimation>(ctx.getSetting("animation", "glow"), ["glow", "rise", "wave"], "glow");
    const bg = pick<LyricsBackground>(ctx.getSetting("background", "album"), ["album", "glass", "default"], "album");
    const size = pick<LyricsSize>(ctx.getSetting("size", "large"), ["medium", "large", "huge"], "large");
    const still = prefersReducedMotion();
    const doc = ctx.doc;

    const removeStyle = injectStyle(lyricsCss(anim, bg, size), "beautiful-lyrics");
    let removeArt = (): void => {};
    const setArt = (smallUrl: string): void => {
      removeArt();
      removeArt = bg === "album" && smallUrl ? injectStyle(artCss(largeArtUrl(smallUrl)), "beautiful-lyrics-art") : () => {};
    };
    setArt(getNowPlaying().artUrl);

    /** Last-seen Spotify class signature per lines container, to skip no-op scans. */
    const signatures = new WeakMap<Element, string>();
    const currentLine = new WeakMap<Element, HTMLElement>();

    const tagScope = (container: Element): void => {
      const scope = container.closest(LYRICS.colorScope) ?? container.parentElement;
      if (!scope || scope.classList.contains(SCOPE)) return;
      scope.classList.add(SCOPE, `sc-lyrics--${anim}`);
      if (still) scope.classList.add("sc-lyrics--still");
      if (bg !== "default") findBackgroundLayer(scope)?.classList.add(BG);
    };

    const decorate = (container: Element, lines: HTMLElement[]): void => {
      const signature = lines.map(spotifyClasses).join("|");
      if (signatures.get(container) === signature) return;
      signatures.set(container, signature);
      tagScope(container);

      const activeIdx = lines.findIndex(isCurrent);
      lines.forEach((line, i) => {
        line.classList.toggle(ACTIVE, activeIdx >= 0 && i === activeIdx);
        line.classList.toggle(PAST, activeIdx >= 0 && i < activeIdx);
        line.classList.toggle(FUTURE, activeIdx >= 0 && i > activeIdx);
      });

      const active = lines[activeIdx];
      const previous = currentLine.get(container);
      if (active === previous) return;
      if (previous) stopWave(previous);
      if (!active) {
        currentLine.delete(container);
        return;
      }
      currentLine.set(container, active);
      if (anim === "wave" && !still) startWave(active);
      if (anim === "rise" && !still) shiftFollowers(lines, activeIdx);
    };

    const scan = (): void => {
      const groups = new Map<Element, HTMLElement[]>();
      doc.querySelectorAll<HTMLElement>(LYRICS.line).forEach((line) => {
        const parent = line.parentElement;
        if (!parent) return;
        const group = groups.get(parent);
        if (group) group.push(line);
        else groups.set(parent, [line]);
      });
      groups.forEach((lines, container) => decorate(container, lines));
    };

    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        scan();
      });
    });
    observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    scan();

    const stopTrackWatch = onTrackChange((np) => {
      setArt(np.artUrl);
      doc.querySelectorAll<HTMLElement>(`.${BG}`).forEach((layer) => {
        layer.classList.remove(BG_FRESH);
        void layer.offsetWidth; // reflow so the fade restarts
        layer.classList.add(BG_FRESH);
      });
    });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      stopTrackWatch();
      removeStyle();
      removeArt();
      doc.querySelectorAll(".sc-wave").forEach((n) => n.remove());
      const selector = OUR_CLASSES.map((c) => `.${c}`).join(", ");
      doc.querySelectorAll<HTMLElement>(selector).forEach((node) => {
        node.classList.remove(...OUR_CLASSES, `sc-lyrics--${anim}`, "sc-lyrics--still");
        node.style.removeProperty("--sc-i");
      });
    };
  },
};

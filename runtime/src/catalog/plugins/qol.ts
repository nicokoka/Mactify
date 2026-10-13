// Quality-of-life plugins. Each returns a cleanup that removes every listener and
// node it created, so toggling off leaves no trace.

import { injectStyle, onHotkey } from "../../dom.js";
import { clickControl, getNowPlaying, onTrackChange, type NowPlaying } from "../../now-playing.js";
import type { CustomizerOption } from "../../types.js";
import { el, flash, LIKE_BUTTON_SELECTOR } from "./ui.js";

const MS_PER_MIN = 60_000;

const sleepTimer: CustomizerOption = {
  id: "plugin-sleep-timer",
  name: "Sleep timer",
  description: "Pause playback after a set time. A countdown chip shows in the corner; click it to cancel.",
  category: "plugin",
  kind: "js",
  settings: [{ key: "minutes", label: "Minutes", type: "number", default: 30, min: 1, max: 480, step: 5 }],
  init(ctx) {
    const minutes = Math.max(1, Number(ctx.getSetting<number>("minutes", 30)) || 30);
    const endsAt = Date.now() + minutes * MS_PER_MIN;
    const chip = el("button", "sc-chip sc-chip--timer");
    chip.type = "button";
    chip.title = "Sleep timer — click to cancel";
    document.body.appendChild(chip);

    const render = (): void => {
      const left = Math.max(0, endsAt - Date.now());
      const m = Math.floor(left / MS_PER_MIN);
      const s = Math.floor((left % MS_PER_MIN) / 1000);
      chip.textContent = `☾ ${m}:${String(s).padStart(2, "0")}`;
    };
    const stop = (): void => {
      window.clearInterval(tick);
      chip.remove();
    };
    const tick = window.setInterval(() => {
      render();
      if (Date.now() < endsAt) return;
      if (getNowPlaying().isPlaying) clickControl("control-button-playpause");
      stop();
      flash("Sleep timer — paused playback");
    }, 1000);
    chip.onclick = () => {
      stop();
      flash("Sleep timer cancelled");
    };
    render();
    return stop;
  },
};

const mediaHotkeys: CustomizerOption = {
  id: "plugin-media-hotkeys",
  name: "Media hotkeys",
  description: "⌥→ next · ⌥← previous · ⌥S shuffle · ⌥R repeat · ⌥L like the current track.",
  category: "plugin",
  kind: "js",
  init() {
    const like = (): boolean => {
      const btn = document
        .querySelector('[data-testid="now-playing-widget"]')
        ?.querySelector<HTMLElement>(LIKE_BUTTON_SELECTOR);
      btn?.click();
      return !!btn;
    };
    // Match on KeyboardEvent.code: ⌥+letter produces a symbol (e.g. ß) in `key` on macOS.
    const bindings: ReadonlyArray<[code: string, action: () => boolean, label: string]> = [
      ["ArrowRight", () => clickControl("control-button-skip-forward"), "⏭ Next"],
      ["ArrowLeft", () => clickControl("control-button-skip-back"), "⏮ Previous"],
      ["KeyS", () => clickControl("control-button-shuffle"), "Shuffle toggled"],
      ["KeyR", () => clickControl("control-button-repeat"), "Repeat toggled"],
      ["KeyL", like, "♥ Like toggled"],
    ];
    const listener = (e: KeyboardEvent): void => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const match = bindings.find(([code]) => code === e.code);
      if (!match) return;
      e.preventDefault();
      if (match[1]()) flash(match[2]);
    };
    window.addEventListener("keydown", listener, true);
    return () => window.removeEventListener("keydown", listener, true);
  },
};

const scrollVolume: CustomizerOption = {
  id: "plugin-scroll-volume",
  name: "Scroll for volume",
  description: "Scroll anywhere over the bottom player bar to change volume, not just on the slider.",
  category: "plugin",
  kind: "js",
  init() {
    const onWheel = (e: WheelEvent): void => {
      const target = e.target as Element | null;
      if (!e.isTrusted || !target?.closest('[data-testid="now-playing-bar"]')) return;
      const volume = document.querySelector('[data-testid="volume-bar"]');
      // The volume bar has its own wheel handler; let native events there through.
      if (!volume || volume.contains(target)) return;
      e.preventDefault();
      volume.dispatchEvent(
        new WheelEvent("wheel", { deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode, bubbles: true, cancelable: true }),
      );
    };
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => window.removeEventListener("wheel", onWheel, { capture: true });
  },
};

const zenMode: CustomizerOption = {
  id: "plugin-zen-mode",
  name: "Zen mode (⌘⇧Z)",
  description: "Toggle hiding the sidebars and top bar so only the main view and player remain.",
  category: "plugin",
  kind: "js",
  init() {
    const ZEN_CLASS = "sc-zen";
    const removeStyle = injectStyle(
      `html.${ZEN_CLASS} body nav,
       html.${ZEN_CLASS} body aside,
       html.${ZEN_CLASS} [data-testid="topbar"],
       html.${ZEN_CLASS} #Desktop_PanelContainer_Id { display: none !important; }`,
      "zen-mode",
    );
    const disposeKey = onHotkey({ key: "z", meta: true, shift: true }, (e) => {
      e.preventDefault();
      const on = document.documentElement.classList.toggle(ZEN_CLASS);
      flash(on ? "Zen mode on — ⌘⇧Z to exit" : "Zen mode off");
    });
    return () => {
      disposeKey();
      removeStyle();
      document.documentElement.classList.remove(ZEN_CLASS);
    };
  },
};

interface HistoryEntry {
  np: NowPlaying;
  at: Date;
}

const HISTORY_LIMIT = 50;

const sessionHistory: CustomizerOption = {
  id: "plugin-session-history",
  name: "Session history (⌘⇧H)",
  description: "Remembers what played this session. Open the list with ⌘⇧H; click a track to copy its link.",
  category: "plugin",
  kind: "js",
  init() {
    let entries: readonly HistoryEntry[] = [];
    const first = getNowPlaying();
    if (first.title) entries = [{ np: first, at: new Date() }];
    const disposeTrack = onTrackChange((np) => {
      entries = [{ np, at: new Date() }, ...entries].slice(0, HISTORY_LIMIT);
      if (!pop.hidden) render();
    });

    const pop = el("div", "sc-popover");
    pop.hidden = true;
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "Session history");
    document.body.appendChild(pop);

    const fmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
    function render(): void {
      const title = el("h4", "sc-popover-title", `This session · ${entries.length} track${entries.length === 1 ? "" : "s"}`);
      const list = el("ol", "sc-history");
      for (const { np, at } of entries) {
        const item = el("li", "sc-history-item");
        const btn = el("button", "sc-history-btn");
        btn.type = "button";
        const art = el("img", "sc-history-art");
        art.src = np.artUrl;
        art.alt = "";
        const meta = el("span", "sc-history-meta");
        meta.append(el("strong", "", np.title), el("span", "", np.artist));
        btn.append(art, meta, el("time", "sc-history-time", fmt.format(at)));
        btn.onclick = () => {
          if (!np.trackUrl) return flash("No link for this track");
          void navigator.clipboard
            ?.writeText(np.trackUrl)
            .then(() => flash("Link copied"))
            .catch(() => flash("Clipboard unavailable"));
        };
        item.appendChild(btn);
        list.appendChild(item);
      }
      if (!entries.length) list.appendChild(el("li", "sc-history-empty", "Nothing yet — play something."));
      pop.replaceChildren(title, list);
    }

    const disposeKey = onHotkey({ key: "h", meta: true, shift: true }, (e) => {
      e.preventDefault();
      pop.hidden = !pop.hidden;
      if (!pop.hidden) render();
    });
    const onOutside = (e: MouseEvent): void => {
      if (!pop.hidden && !pop.contains(e.target as Node)) pop.hidden = true;
    };
    document.addEventListener("mousedown", onOutside, true);
    return () => {
      disposeTrack();
      disposeKey();
      document.removeEventListener("mousedown", onOutside, true);
      pop.remove();
    };
  },
};

export const qolPlugins: CustomizerOption[] = [sleepTimer, mediaHotkeys, scrollVolume, zenMode, sessionHistory];

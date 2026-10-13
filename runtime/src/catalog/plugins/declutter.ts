// Home page cleanup. Shelves are classified by what their cards LINK to rather than
// by heading text, so podcast/audiobook rows are caught whatever Spotify names them.

import { injectStyle } from "../../dom.js";
import type { CustomizerOption, OptionContext } from "../../types.js";

const HOME = `[data-testid="home-page"]`;
const SHELF = `section[data-testid="component-shelf"]`;
const HIDE_ATTR = "data-sc-hidden";

const SPOKEN = new Set(["show", "episode", "audiobook", "chapter"]);
const MUSIC = new Set(["playlist", "album", "artist", "track", "collection"]);

/** True when most of a shelf's cards point at shows/episodes/audiobooks. */
function isSpokenWordShelf(shelf: Element): boolean {
  let spoken = 0;
  let music = 0;
  for (const a of Array.from(shelf.querySelectorAll("a[href]"))) {
    const kind = (a.getAttribute("href") ?? "").split("/")[1] ?? "";
    if (SPOKEN.has(kind)) spoken++;
    else if (MUSIC.has(kind)) music++;
  }
  return spoken > 0 && spoken >= music;
}

function parseNames(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function staticCss(ctx: OptionContext): string {
  const rules: string[] = [];
  if (ctx.getSetting("ads", true)) {
    // The ad container is a sibling of the home-page section, not inside it.
    rules.push(`[data-testid="home-ads-container"], [data-testid="home-ad-card"] { display: none !important; }`);
  }
  if (ctx.getSetting("chips", false)) {
    // The sticky band that wraps the All/Music/Podcasts/Audiobooks filter row.
    rules.push(`div:has(> div > div > [aria-label="Home Filters"]) { display: none !important; }`);
  } else if (ctx.getSetting("podcasts", true)) {
    rules.push(
      `[aria-label="Home Filters"] div:has(> button[data-encore-id="chip"]:is([aria-label="Podcasts"], [aria-label="Audiobooks"])) { display: none !important; }`,
    );
  }
  if (ctx.getSetting("shortcuts", false)) {
    rules.push(`${HOME} section[aria-label]:not([data-testid]) { display: none !important; }`);
  }
  rules.push(`${HOME} [${HIDE_ATTR}] { display: none !important; }`);
  return rules.join("\n");
}

export const cleanHome: CustomizerOption = {
  id: "plugin-clean-home",
  name: "Clean home page",
  description: "Strip the home page down to your music: no ads, podcasts or audiobooks, plus any shelves you name.",
  category: "plugin",
  kind: "js",
  settings: [
    { key: "ads", label: "Hide ads & promos", type: "toggle", default: true },
    { key: "podcasts", label: "Hide podcasts & audiobooks", type: "toggle", default: true },
    { key: "chips", label: "Hide filter chips row", type: "toggle", default: false },
    { key: "shortcuts", label: "Hide top shortcut grid", type: "toggle", default: false },
    {
      key: "names",
      label: "Also hide shelves named",
      type: "text",
      default: "",
      placeholder: "e.g. Recommended Stations, For fans of",
    },
  ],
  init(ctx) {
    const removeStyle = injectStyle(staticCss(ctx), "clean-home");
    const hidePodcasts = ctx.getSetting("podcasts", true);
    const names = parseNames(ctx.getSetting("names", ""));

    const sweep = (): void => {
      for (const shelf of Array.from(document.querySelectorAll(`${HOME} ${SHELF}`))) {
        const label = (shelf.getAttribute("aria-label") ?? "").toLowerCase();
        const byName = names.some((n) => label.includes(n));
        const hide = byName || (hidePodcasts && isSpokenWordShelf(shelf));
        shelf.toggleAttribute(HIDE_ATTR, hide);
      }
    };

    // Shelves stream in as you scroll; re-sweep at most once per frame.
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        sweep();
      });
    });
    // Scoped to the main view: observing <body> would re-sweep on every progress tick.
    observer.observe(document.getElementById("main-view") ?? document.body, { childList: true, subtree: true });
    sweep();

    return () => {
      observer.disconnect();
      removeStyle();
      document.querySelectorAll(`[${HIDE_ATTR}]`).forEach((el) => el.removeAttribute(HIDE_ATTR));
    };
  },
};

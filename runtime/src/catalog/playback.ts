// Playback & functional options. These are behavioral (js) and lean on data-testid
// anchors + the clipboard API, feature-detecting so they degrade instead of throwing.

import { onHotkey } from "../dom.js";
import { onTrackChange } from "../now-playing.js";
import type { CustomizerOption } from "../types.js";

export const playbackOptions: CustomizerOption[] = [
  {
    id: "copy-song-link",
    name: "Copy song link (⌘⇧C)",
    description: "Copy a link to the currently playing track to the clipboard.",
    category: "playback",
    kind: "js",
    init() {
      return onHotkey({ key: "c", meta: true, shift: true }, () => {
        const widget = document.querySelector('[data-testid="now-playing-widget"]');
        const anchor = widget?.querySelector<HTMLAnchorElement>('a[href*="/track/"]');
        if (!anchor) {
          console.info("[SpotifyCustomizer] copy-song-link: no track link found");
          return;
        }
        const url = new URL(anchor.getAttribute("href") ?? "", "https://open.spotify.com").href;
        void navigator.clipboard?.writeText(url).catch(() => {
          console.info("[SpotifyCustomizer] copy-song-link: clipboard unavailable");
        });
      });
    },
  },
  {
    id: "log-track-changes",
    name: "Log track changes",
    description: "Print the track title to the console whenever it changes (demo of live watching).",
    category: "playback",
    kind: "js",
    init() {
      return onTrackChange((np) => {
        console.info("[SpotifyCustomizer] now playing:", `${np.title} — ${np.artist}`);
      });
    },
  },
  {
    id: "scroll-to-now-playing",
    name: "Scroll to playing track (⌘⇧G)",
    description: "Jump the tracklist to the currently highlighted row.",
    category: "playback",
    kind: "js",
    init() {
      return onHotkey({ key: "g", meta: true, shift: true }, () => {
        const row =
          document.querySelector('[aria-selected="true"][role="row"]') ??
          document.querySelector('[aria-current="true"]');
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
  },
];

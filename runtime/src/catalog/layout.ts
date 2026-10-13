// Layout options.

import type { CustomizerOption } from "../types.js";

export const layoutOptions: CustomizerOption[] = [
  {
    id: "hide-now-playing-bar",
    name: "Hide now-playing bar",
    description: "Remove the bottom playback bar entirely for a cleaner view.",
    category: "layout",
    kind: "css",
    css: `[data-testid="now-playing-bar"] { display: none !important; }`,
  },
  {
    id: "hide-now-playing-art",
    name: "Hide bar artwork",
    description: "Hide the small album thumbnail inside the now-playing bar.",
    category: "layout",
    kind: "css",
    css: `[data-testid="now-playing-widget"] img { display: none !important; }`,
  },
  {
    id: "compact-density",
    name: "Compact density",
    description: "Shrink the base font size slightly to fit more on screen.",
    category: "layout",
    kind: "css",
    css: `html { font-size: 92%; }`,
  },
];

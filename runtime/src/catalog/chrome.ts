// Chrome & window options.

import { findByText, injectStyle } from "../dom.js";
import type { CustomizerOption } from "../types.js";

export const chromeOptions: CustomizerOption[] = [
  {
    id: "hide-upgrade-button",
    name: "Hide Upgrade button",
    description: "Remove the top-bar Premium upgrade button (found by its label; best-effort).",
    category: "chrome",
    kind: "js", // no stable testid for it in this version, so we match by text
    init() {
      let hidden: HTMLElement | null = null;
      const hide = (): boolean => {
        const btn = findByText("button, a", "Upgrade");
        if (btn) {
          btn.style.display = "none";
          hidden = btn;
          return true;
        }
        return false;
      };
      if (!hide()) {
        // The top bar may mount late; retry on DOM changes for a short while.
        const observer = new MutationObserver(() => {
          if (hide()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return () => {
          observer.disconnect();
          if (hidden) hidden.style.display = "";
        };
      }
      return () => {
        if (hidden) hidden.style.display = "";
      };
    },
  },
  {
    id: "custom-css",
    name: "Custom CSS",
    description: "Paste your own CSS in this option's settings. The power-user escape hatch.",
    category: "chrome",
    kind: "js", // dynamic: reads the CSS string from config at apply time
    settings: [
      { key: "css", label: "CSS", type: "textarea", default: "", placeholder: "/* e.g. */\nimg { filter: saturate(1.4); }" },
    ],
    init(ctx) {
      const css = ctx.getSetting<string>("css", "");
      if (!css.trim()) return () => {};
      return injectStyle(css, "custom-css");
    },
  },
];

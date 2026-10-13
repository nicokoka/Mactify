// Themes as a radio-card gallery: one active at a time, plus a "Spotify default"
// card that switches the current theme off.

import type { CustomizerEngine } from "../engine.js";
import type { CustomizerOption } from "../types.js";

const DEFAULT_SWATCH = ["#121212", "#1f1f1f", "#1ed760", "#ffffff"];

function card(
  name: string,
  description: string,
  swatch: readonly string[],
  font: string | undefined,
  selected: boolean,
  failed: boolean,
  onSelect: () => void,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `sc-theme${selected ? " sc-theme--on" : ""}`;
  btn.setAttribute("role", "radio");
  btn.setAttribute("aria-checked", String(selected));
  btn.title = description;

  const [bg = "#000", surface = bg, accent = "#fff", text = "#fff"] = swatch;
  const preview = document.createElement("span");
  preview.className = "sc-theme-preview";
  preview.style.setProperty("--p-bg", bg);
  preview.style.setProperty("--p-surface", surface);
  preview.style.setProperty("--p-accent", accent);
  preview.style.setProperty("--p-text", text);
  const sample = document.createElement("span");
  sample.className = "sc-theme-sample";
  sample.textContent = "Aa";
  if (font) sample.style.fontFamily = font;
  preview.append(sample, document.createElement("i"));

  const label = document.createElement("span");
  label.className = "sc-theme-name";
  label.textContent = name;
  if (failed) {
    const badge = document.createElement("span");
    badge.className = "sc-badge";
    badge.textContent = "failed";
    label.appendChild(badge);
  }

  btn.append(preview, label);
  btn.onclick = onSelect;
  return btn;
}

export function renderThemeGallery(
  engine: CustomizerEngine,
  themes: readonly CustomizerOption[],
  rerender: () => void,
  showDefault: boolean,
): HTMLElement {
  const grid = document.createElement("div");
  grid.className = "sc-gallery";
  grid.setAttribute("role", "radiogroup");
  grid.setAttribute("aria-label", "Theme");

  // Look across all themes, not just the (possibly search-filtered) visible ones.
  const active = engine.options.find((o) => o.category === "theme" && engine.isEnabled(o));
  if (showDefault) {
    grid.appendChild(
      card("Spotify default", "Stock Spotify colors and fonts.", DEFAULT_SWATCH, undefined, !active, false, () => {
        if (active) engine.setEnabled(active, false);
        rerender();
      }),
    );
  }
  for (const theme of themes) {
    grid.appendChild(
      card(
        theme.name,
        theme.description,
        theme.swatch ?? DEFAULT_SWATCH,
        theme.previewFont,
        theme === active,
        engine.failures.has(theme.id),
        () => {
          engine.setEnabled(theme, theme !== active);
          rerender();
        },
      ),
    );
  }
  return grid;
}

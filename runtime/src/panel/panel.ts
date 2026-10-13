// The in-app settings panel: a self-mounted overlay. It deliberately does NOT hook
// Spotify's router or nav (those change often across updates) — it mounts its own
// floating button + overlay on <body>, which is about as update-proof as it gets.

import type { CustomizerEngine } from "../engine.js";
import { onHotkey } from "../dom.js";
import { CATEGORY_LABELS, type CustomizerOption, type OptionCategory } from "../types.js";
import { renderSettings } from "./setting-controls.js";
import { renderThemeGallery } from "./theme-gallery.js";

const OVERLAY_ID = "sc-overlay";

type TabId = "themes" | "plugins" | "tweaks";

const TABS: ReadonlyArray<{ id: TabId; label: string; categories: readonly OptionCategory[] }> = [
  { id: "themes", label: "Themes", categories: ["theme"] },
  { id: "plugins", label: "Plugins", categories: ["plugin"] },
  { id: "tweaks", label: "Tweaks", categories: ["appearance", "layout", "playback", "chrome"] },
];

function matches(option: CustomizerOption, query: string): boolean {
  if (!query) return true;
  return `${option.name} ${option.description}`.toLowerCase().includes(query);
}

function optionRow(engine: CustomizerEngine, option: CustomizerOption, rerender: () => void): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "sc-row-wrap";

  const row = document.createElement("label");
  row.className = "sc-row";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "sc-switch";
  checkbox.checked = engine.isEnabled(option);
  checkbox.onchange = () => {
    engine.setEnabled(option, checkbox.checked);
    // Re-render so settings appear/disappear and new failures show immediately.
    rerender();
  };

  const text = document.createElement("div");
  text.className = "sc-row-text";
  const name = document.createElement("span");
  name.className = "sc-name";
  name.textContent = option.name;
  if (engine.failures.has(option.id)) {
    const badge = document.createElement("span");
    badge.className = "sc-badge";
    badge.textContent = "failed";
    name.appendChild(badge);
  }
  const desc = document.createElement("span");
  desc.className = "sc-desc";
  desc.textContent = option.description;
  text.append(name, desc);

  row.append(checkbox, text);
  wrap.appendChild(row);

  if (checkbox.checked) {
    const settings = renderSettings(engine, option);
    if (settings) wrap.appendChild(settings);
  }
  return wrap;
}

export function mountPanel(engine: CustomizerEngine): () => void {
  let activeTab: TabId = "themes";
  let query = "";

  // Floating launcher button.
  const launcher = document.createElement("button");
  launcher.className = "sc-launcher";
  launcher.type = "button";
  launcher.title = "Spotify Customizer  (⌘⇧K)";
  launcher.textContent = "✦";

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.className = "sc-overlay sc-hidden";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Spotify Customizer settings");

  const isOpen = () => !overlay.classList.contains("sc-hidden");
  const open = () => {
    render();
    overlay.classList.remove("sc-hidden");
  };
  const close = () => overlay.classList.add("sc-hidden");
  const toggle = () => (isOpen() ? close() : open());

  function renderHeader(): HTMLElement {
    const header = document.createElement("header");
    header.className = "sc-header";

    const titleRow = document.createElement("div");
    titleRow.className = "sc-title-row";
    const h2 = document.createElement("h2");
    h2.textContent = "Spotify Customizer";
    const count = document.createElement("p");
    count.textContent = `${engine.options.length} options`;
    const closeBtn = document.createElement("button");
    closeBtn.className = "sc-close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "✕";
    closeBtn.onclick = close;
    titleRow.append(h2, count, closeBtn);

    const tabs = document.createElement("div"); // not <nav>: themes & zen mode target nav
    tabs.className = "sc-tabs";
    tabs.setAttribute("role", "tablist");
    for (const tab of TABS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `sc-tab${tab.id === activeTab ? " sc-tab--on" : ""}`;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(tab.id === activeTab));
      const enabled = engine.options.filter((o) => tab.categories.includes(o.category) && engine.isEnabled(o)).length;
      btn.textContent = tab.label;
      if (enabled) {
        const pill = document.createElement("span");
        pill.className = "sc-tab-count";
        pill.textContent = String(enabled);
        btn.appendChild(pill);
      }
      btn.onclick = () => {
        activeTab = tab.id;
        render();
      };
      tabs.appendChild(btn);
    }

    const search = document.createElement("input");
    search.type = "search";
    search.className = "sc-search";
    search.placeholder = "Search…";
    search.setAttribute("aria-label", "Search options");
    search.value = query;
    search.oninput = () => {
      query = search.value.trim().toLowerCase();
      renderBody();
    };

    header.append(titleRow, tabs, search);
    return header;
  }

  const body = document.createElement("div");
  body.className = "sc-body";

  function renderBody(): void {
    body.replaceChildren();
    const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0]!;
    const visible = engine.options.filter((o) => tab.categories.includes(o.category) && matches(o, query));

    if (!visible.length) {
      const empty = document.createElement("p");
      empty.className = "sc-empty";
      empty.textContent = "Nothing matches that search.";
      body.appendChild(empty);
      return;
    }

    if (tab.id === "themes") {
      body.appendChild(renderThemeGallery(engine, visible, render, !query));
      const note = document.createElement("p");
      note.className = "sc-note";
      note.textContent = "Tip: the Accent color tweak overrides any theme's accent.";
      body.appendChild(note);
      return;
    }

    for (const category of tab.categories) {
      const options = visible.filter((o) => o.category === category);
      if (!options.length) continue;
      const section = document.createElement("section");
      section.className = "sc-section";
      if (tab.categories.length > 1) {
        const h3 = document.createElement("h3");
        h3.textContent = CATEGORY_LABELS[category];
        section.appendChild(h3);
      }
      for (const option of options) section.appendChild(optionRow(engine, option, render));
      body.appendChild(section);
    }
  }

  function render(): void {
    const scroll = sheet.scrollTop;
    sheet.replaceChildren(renderHeader(), body);
    renderBody();
    sheet.scrollTop = scroll;
  }

  const sheet = document.createElement("div");
  sheet.className = "sc-sheet";
  overlay.appendChild(sheet);

  launcher.onclick = toggle;
  overlay.onclick = (e) => {
    if (e.target === overlay) close(); // click backdrop to dismiss
  };
  const onEscape = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && isOpen()) close();
  };
  window.addEventListener("keydown", onEscape, true);

  document.body.append(launcher, overlay);
  const disposeHotkey = onHotkey({ key: "k", meta: true, shift: true }, toggle);

  return () => {
    disposeHotkey();
    window.removeEventListener("keydown", onEscape, true);
    launcher.remove();
    overlay.remove();
  };
}

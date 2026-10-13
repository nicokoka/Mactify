// Inline controls for an option's `settings`. Writes go straight to config and the
// option is re-applied, so changes show live. Values are assigned via properties,
// never innerHTML.

import { assetKeyFor, deleteAsset, fileToDataUrl, getAsset, putAsset } from "../asset-store.js";
import { getSetting, setSetting } from "../config.js";
import type { CustomizerEngine } from "../engine.js";
import { isHexColor } from "../theme-vars.js";
import type { CustomizerOption, OptionSetting } from "../types.js";

const TEXT_DEBOUNCE_MS = 350;

function debounce(fn: () => void, ms: number): () => void {
  let t = 0;
  return () => {
    window.clearTimeout(t);
    t = window.setTimeout(fn, ms);
  };
}

/** Expand #abc to #aabbcc — <input type="color"> only accepts the long form. */
function longHex(hex: string): string {
  return hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, "#$1$1$2$2$3$3") : hex.slice(0, 7);
}

function colorControl(
  current: string,
  commit: (value: string) => void,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "sc-color";

  const picker = document.createElement("input");
  picker.type = "color";
  picker.value = longHex(current);
  picker.setAttribute("aria-label", "Pick color");

  const hex = document.createElement("input");
  hex.type = "text";
  hex.className = "sc-input sc-input--hex";
  hex.value = current;
  hex.maxLength = 9;
  hex.spellcheck = false;
  hex.setAttribute("aria-label", "Hex color");

  picker.oninput = () => {
    hex.value = picker.value;
    hex.classList.remove("sc-invalid");
    commit(picker.value);
  };
  const commitHex = debounce(() => {
    const value = hex.value.trim().startsWith("#") ? hex.value.trim() : `#${hex.value.trim()}`;
    const ok = isHexColor(value);
    hex.classList.toggle("sc-invalid", !ok);
    if (!ok) return;
    picker.value = longHex(value);
    commit(value);
  }, TEXT_DEBOUNCE_MS);
  hex.oninput = commitHex;

  wrap.append(picker, hex);
  return wrap;
}

/** Image/GIF picker. The file goes to IndexedDB; config only stores a revision stamp. */
function imageControl(assetKey: string, commit: (value: unknown) => void): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "sc-image";
  const preview = document.createElement("span");
  preview.className = "sc-image-preview";
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.hidden = true;
  const pick = document.createElement("button");
  pick.type = "button";
  pick.className = "sc-btn";
  pick.textContent = "Choose image or GIF…";
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "sc-btn sc-btn--ghost";
  clear.textContent = "Remove";
  const status = document.createElement("span");
  status.className = "sc-image-status";

  const show = (url: string | null): void => {
    preview.style.backgroundImage = url ? `url("${url}")` : "";
    preview.classList.toggle("sc-image-preview--empty", !url);
    clear.hidden = !url;
  };
  void getAsset(assetKey).then(show).catch(() => show(null));

  pick.onclick = () => input.click();
  input.onchange = async () => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    status.textContent = "Loading…";
    try {
      const url = await fileToDataUrl(file);
      await putAsset(assetKey, url);
      show(url);
      status.textContent = "";
      commit(Date.now());
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : "Couldn't load that image.";
    }
  };
  clear.onclick = async () => {
    await deleteAsset(assetKey).catch(() => undefined);
    show(null);
    commit(Date.now());
  };

  wrap.append(preview, pick, clear, input, status);
  return wrap;
}

function fieldFor(
  setting: OptionSetting,
  current: unknown,
  commit: (v: unknown) => void,
  assetKey: string,
): HTMLElement {
  switch (setting.type) {
    case "image":
      return imageControl(assetKey, commit);
    case "toggle": {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "sc-switch sc-switch--small";
      input.checked = current === true;
      input.onchange = () => commit(input.checked);
      return input;
    }
    case "color":
      return colorControl(String(current), commit);
    case "select": {
      const select = document.createElement("select");
      select.className = "sc-input";
      for (const choice of setting.choices ?? []) {
        const opt = document.createElement("option");
        opt.value = choice.value;
        opt.textContent = choice.label;
        select.appendChild(opt);
      }
      select.value = String(current);
      select.onchange = () => commit(select.value);
      return select;
    }
    case "number": {
      const input = document.createElement("input");
      input.type = "number";
      input.className = "sc-input sc-input--num";
      if (setting.min != null) input.min = String(setting.min);
      if (setting.max != null) input.max = String(setting.max);
      if (setting.step != null) input.step = String(setting.step);
      input.value = String(current);
      input.oninput = debounce(() => {
        const n = input.valueAsNumber;
        const inRange =
          Number.isFinite(n) && (setting.min == null || n >= setting.min) && (setting.max == null || n <= setting.max);
        input.classList.toggle("sc-invalid", !inRange);
        if (inRange) commit(n);
      }, TEXT_DEBOUNCE_MS);
      return input;
    }
    case "textarea":
    case "text": {
      const input = document.createElement(setting.type === "textarea" ? "textarea" : "input");
      input.className = `sc-input${setting.type === "textarea" ? " sc-input--area" : ""}`;
      input.spellcheck = false;
      if (setting.placeholder) input.placeholder = setting.placeholder;
      input.value = String(current);
      input.oninput = debounce(() => commit(input.value), TEXT_DEBOUNCE_MS);
      return input;
    }
  }
}

/** Render the settings block for an enabled option, or null if it has none. */
export function renderSettings(engine: CustomizerEngine, option: CustomizerOption): HTMLElement | null {
  if (!option.settings?.length) return null;
  const box = document.createElement("div");
  box.className = "sc-settings";
  for (const setting of option.settings) {
    const label = document.createElement("label");
    label.className = "sc-setting";
    const caption = document.createElement("span");
    caption.className = "sc-setting-label";
    caption.textContent = setting.label;
    const current = getSetting<unknown>(option.id, setting.key, setting.default);
    const field = fieldFor(
      setting,
      current,
      (value) => {
        setSetting(option.id, setting.key, value);
        engine.reapply(option);
      },
      assetKeyFor(option.id, setting.key),
    );
    label.append(caption, field);
    box.appendChild(label);
  }
  return box;
}

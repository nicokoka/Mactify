// Theme factory: a palette + font becomes a CSS-only, mutually exclusive option.

import { fontCss, paletteCss, type Palette } from "../../theme-vars.js";
import type { CustomizerOption } from "../../types.js";

export const THEME_GROUP = "theme";

/** macOS-bundled font stacks — no network fetch, so they work offline. */
export const FONTS = {
  sf: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif`,
  avenir: `"Avenir Next", Avenir, -apple-system, sans-serif`,
  avenirRounded: `"Avenir Next Rounded Std", "SF Pro Rounded", "Avenir Next", -apple-system, sans-serif`,
  menlo: `Menlo, "SF Mono", Monaco, monospace`,
  sfMono: `"SF Mono", Menlo, Monaco, monospace`,
  optima: `Optima, "Avenir Next", sans-serif`,
  futura: `Futura, "Trebuchet MS", sans-serif`,
  gill: `"Gill Sans", "Gill Sans MT", Avenir, sans-serif`,
  baskerville: `Baskerville, "Baskerville Old Face", Georgia, serif`,
  georgia: `Georgia, "Times New Roman", serif`,
  helvetica: `"Helvetica Neue", Helvetica, Arial, sans-serif`,
  hiragino: `"Hiragino Sans", "Hiragino Kaku Gothic ProN", -apple-system, sans-serif`,
  tahoma: `Tahoma, Geneva, Verdana, sans-serif`,
} as const;

export interface ThemeSpec {
  id: string;
  name: string;
  description: string;
  palette: Palette;
  font?: string;
  /** Extra CSS for signature themes (textures, glass, glow…). */
  extraCss?: string;
}

export function defineTheme(spec: ThemeSpec): CustomizerOption {
  const { palette: p } = spec;
  const css = [paletteCss(p), spec.font ? fontCss(spec.font) : "", spec.extraCss ?? ""].join("\n");
  return {
    id: `theme-${spec.id}`,
    name: spec.name,
    description: spec.description,
    category: "theme",
    kind: "css",
    exclusiveGroup: THEME_GROUP,
    swatch: [p.bg, p.surface, p.accent, p.text],
    previewFont: spec.font,
    css,
  };
}

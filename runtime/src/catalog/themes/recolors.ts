// Recolor + font themes. Each is just a palette and a font stack.

import type { CustomizerOption } from "../../types.js";
import { defineTheme, FONTS } from "./define-theme.js";

export const recolorThemes: CustomizerOption[] = [
  defineTheme({
    id: "midnight",
    name: "Midnight",
    description: "Deep navy with a cool sky-blue accent.",
    font: FONTS.avenir,
    palette: { bg: "#0b1220", surface: "#111a2e", highlight: "#1a2742", text: "#e6edf7", subdued: "#8a9bb8", accent: "#5cb8ff" },
  }),
  defineTheme({
    id: "dracula",
    name: "Dracula",
    description: "The classic: purple and pink on charcoal.",
    font: FONTS.menlo,
    palette: { bg: "#282a36", surface: "#21222c", highlight: "#44475a", text: "#f8f8f2", subdued: "#a4a8c4", accent: "#ff79c6" },
  }),
  defineTheme({
    id: "nord",
    name: "Nord",
    description: "Arctic slate greys with frost-blue highlights.",
    font: FONTS.avenir,
    palette: { bg: "#2e3440", surface: "#3b4252", highlight: "#434c5e", text: "#eceff4", subdued: "#a3acbd", accent: "#88c0d0" },
  }),
  defineTheme({
    id: "gruvbox",
    name: "Gruvbox",
    description: "Warm retro browns with a burnt-orange accent.",
    font: FONTS.sfMono,
    palette: { bg: "#282828", surface: "#32302f", highlight: "#3c3836", text: "#ebdbb2", subdued: "#a89984", accent: "#fe8019" },
  }),
  defineTheme({
    id: "catppuccin",
    name: "Catppuccin Mocha",
    description: "Soft pastels over a cozy mocha base.",
    font: FONTS.avenirRounded,
    palette: { bg: "#1e1e2e", surface: "#181825", highlight: "#313244", text: "#cdd6f4", subdued: "#a6adc8", accent: "#cba6f7" },
  }),
  defineTheme({
    id: "solarized",
    name: "Solarized",
    description: "Ethan Schoonover's teal-black with a golden accent.",
    font: FONTS.optima,
    palette: { bg: "#002b36", surface: "#073642", highlight: "#0d4654", text: "#eee8d5", subdued: "#93a1a1", accent: "#b58900" },
  }),
  defineTheme({
    id: "rose-pine",
    name: "Rosé Pine",
    description: "Muted rose and gold, all soho vibes.",
    font: FONTS.futura,
    palette: { bg: "#191724", surface: "#1f1d2e", highlight: "#26233a", text: "#e0def4", subdued: "#908caa", accent: "#ebbcba" },
  }),
  defineTheme({
    id: "tokyo-night",
    name: "Tokyo Night",
    description: "Late-night indigo lit by neon blue.",
    font: FONTS.gill,
    palette: { bg: "#1a1b26", surface: "#16161e", highlight: "#292e42", text: "#c0caf5", subdued: "#787fa6", accent: "#7aa2f7" },
  }),
  defineTheme({
    id: "forest",
    name: "Forest",
    description: "Deep evergreen with warm amber light.",
    font: FONTS.baskerville,
    palette: { bg: "#0f1a14", surface: "#13221a", highlight: "#1d3326", text: "#e4eedf", subdued: "#91a896", accent: "#f2b33d" },
  }),
  defineTheme({
    id: "crimson",
    name: "Crimson",
    description: "Pitch black and blood red.",
    font: FONTS.futura,
    palette: { bg: "#0a0606", surface: "#140b0b", highlight: "#241212", text: "#f5e9e9", subdued: "#a88f8f", accent: "#e5243b", onAccent: "#fff" },
  }),
  defineTheme({
    id: "ocean",
    name: "Ocean",
    description: "Deep-sea teal with a bright aqua accent.",
    font: FONTS.avenir,
    palette: { bg: "#06222b", surface: "#0a2c37", highlight: "#103a48", text: "#e2f4f7", subdued: "#82a9b3", accent: "#2ee6d6" },
  }),
  defineTheme({
    id: "sakura",
    name: "Sakura",
    description: "A light theme in blush pink and cherry rose.",
    font: FONTS.hiragino,
    palette: { bg: "#fff4f6", surface: "#ffe9ee", highlight: "#ffdbe3", text: "#3b1f2a", subdued: "#8a6070", accent: "#e0457b", onAccent: "#fff", scheme: "light" },
  }),
  defineTheme({
    id: "paper",
    name: "Paper",
    description: "Editorial light theme: warm cream paper, ink-black serif type.",
    font: FONTS.baskerville,
    palette: { bg: "#f5f0e6", surface: "#ece5d6", highlight: "#e1d8c5", text: "#1b1915", subdued: "#6b6457", accent: "#b23a1e", onAccent: "#fff", scheme: "light" },
  }),
  defineTheme({
    id: "monochrome",
    name: "Monochrome",
    description: "Pure black and white. No color, no distractions.",
    font: FONTS.helvetica,
    palette: { bg: "#000000", surface: "#0c0c0c", highlight: "#1c1c1c", text: "#ffffff", subdued: "#8f8f8f", accent: "#ffffff" },
  }),
  defineTheme({
    id: "sunset",
    name: "Sunset",
    description: "Dusky plum fading into a coral glow.",
    font: FONTS.futura,
    palette: { bg: "#1d1023", surface: "#26152e", highlight: "#36203f", text: "#fbe9e4", subdued: "#b398a6", accent: "#ff7a59" },
    extraCss: `[data-testid="now-playing-bar"] { background: linear-gradient(90deg, #26152e, #3a1a2e 60%, #4a2128) !important; }`,
  }),
];

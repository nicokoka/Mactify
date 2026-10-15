// The catalog registry. Adding option #13…#300 is just importing more arrays here.

import { appearanceOptions } from "./appearance.js";
import { chromeOptions } from "./chrome.js";
import { layoutOptions } from "./layout.js";
import { playbackOptions } from "./playback.js";
import { customBackground } from "./plugins/backdrop.js";
import { cleanHome } from "./plugins/declutter.js";
import { funPlugins } from "./plugins/fun.js";
import { beautifulLyrics } from "./plugins/lyrics.js";
import { qolPlugins } from "./plugins/qol.js";
import { recolorThemes } from "./themes/recolors.js";
import { signatureThemes } from "./themes/signature.js";
import { worldThemes } from "./themes/worlds.js";
import type { CustomizerOption } from "../types.js";

export const CATALOG: readonly CustomizerOption[] = [
  ...signatureThemes,
  ...worldThemes,
  ...recolorThemes,
  cleanHome,
  customBackground,
  beautifulLyrics,
  ...qolPlugins,
  ...funPlugins,
  ...appearanceOptions,
  ...layoutOptions,
  ...playbackOptions,
  ...chromeOptions,
];

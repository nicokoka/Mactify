# Spotify Customizer

A macOS Spotify customizer with a scalable library of CSS + JS options and an
in-app settings panel. Inspired by Spicetify; built from scratch.

## How it works

Spotify's desktop UI lives in `/Applications/Spotify.app/Contents/Resources/Apps/xpui.spa`
— an uncompressed ZIP of the web client. The customizer:

1. **Backs up** a pristine copy of `xpui.spa` (per version, under
   `~/Library/Application Support/SpotifyCustomizer/backups/`).
2. **Patches** it: injects `/customizer/loader.js` + `loader.css` into `index.html`
   and copies the built runtime into the archive.
3. **Always patches from the pristine backup**, so re-applying is idempotent and
   never stacks.
4. **Auto re-applies** after Spotify updates via a launchd watcher.

Options are **sandboxed** — one that breaks (e.g. an update renamed a selector)
never takes down the rest, and the panel flags it as `failed`.

Config lives in Spotify's own `localStorage`, which is stored outside `xpui.spa`,
so your settings survive re-patching and Spotify updates.

## Layout

```
engine/    Swift package — CustomizerCore + `customizer` CLI + menu-bar app
runtime/   TypeScript — injected loader, catalog engine, options, settings panel
scripts/   dev.sh dev loop
```

## Quick start

```bash
# 1. Build the runtime
cd runtime && npm install && npm run build && cd ..

# 2. Patch Spotify (captures a pristine backup on first run) and relaunch
./scripts/dev.sh
```

Then open Spotify and press **⌘⇧K** (or click the ✦ button, bottom-right) for the
settings panel.

### CLI

```bash
cd engine
swift run customizer status
swift run customizer apply   --assets ../runtime/dist/customizer --restart
swift run customizer restore --restart
swift run customizer watch   --assets ../runtime/dist/customizer   # auto re-apply loop
```

### Menu-bar app

```bash
cd engine && swift run CustomizerMenuBar
```

Gives a menu-bar item with Apply / Restore / Auto-re-apply toggle / status.

## What's included

- **20 themes** (Themes tab, one active at a time): 15 recolor + font themes
  (Midnight, Dracula, Nord, Gruvbox, Catppuccin Mocha, Solarized, Rosé Pine, Tokyo
  Night, Forest, Crimson, Ocean, Sakura, Paper, Monochrome, Sunset) and 5 signature
  themes (Liquid Glass, Cyberpunk, Synthwave, Terminal CRT, Retro 98).
- **10 plugins**: Sleep timer, Media hotkeys (⌥→ ⌥← ⌥S ⌥R ⌥L), Scroll for volume,
  Zen mode (⌘⇧Z), Session history (⌘⇧H), Now-playing toast, Ambient album color,
  Big-art screensaver, Heart burst, Dancing equalizer.
- **Tweaks**: accent color, thicker progress bar, layout/chrome options, custom CSS.

## Adding options

Drop a `CustomizerOption` into the relevant file under `runtime/src/catalog/`
and rebuild. Each option is CSS, JS, or both:

```ts
{
  id: "my-option",
  name: "My option",
  description: "What it does.",
  category: "appearance",  // theme | plugin | appearance | layout | playback | chrome
  kind: "css",            // or "js" | "both"
  css: `img { opacity: .9; }`,
  // init(ctx) { … return cleanup }  // for kind "js"/"both"
  // settings: [{ key: "color", label: "Color", type: "color", default: "#fff" }],
  // exclusiveGroup: "theme",         // only one option per group can be on
}
```

`settings` render inline under the option in the panel while it's enabled; read
them in `init` with `ctx.getSetting(key, fallback)`. Changing one re-runs `init`.

Themes use the factory in `catalog/themes/define-theme.ts`:

```ts
defineTheme({
  id: "my-theme", name: "My theme", description: "…",
  font: FONTS.avenir,
  palette: { bg, surface, highlight, text, subdued, accent },
  extraCss: "…", // optional textures/effects
})
```

Spotify defines its colors on `.encore-dark-theme …-set` classes, not `:root`, so
always go through `theme-vars.ts` (`paletteCss`, `accentCss`, `fontCss`) rather than
setting `--background-base` etc. on `:root` yourself.

## Caveats

- macOS only, and patches an unsigned client — expect to re-apply after Spotify
  self-updates (the watcher automates this).
- Options that target Spotify's internal markup are **best-effort**: an update can
  rename selectors. Patch re-application is guaranteed; individual option survival
  is not — hence the sandbox + `failed` badges.

# Spotify Customizer

A macOS Spotify customizer with a scalable library of CSS + JS options and an
in-app settings panel. Built from scratch.

## Install

1. Install [Spotify](https://www.spotify.com/download/) and open it once.
2. Open **Terminal** (press ⌘Space, type "Terminal", press Return).
3. Paste this line and press Return:

```bash
curl -fsSL https://raw.githubusercontent.com/nicokoka/Mactify/main/install.sh | bash
```

Spotify restarts with the customizer. Press **⌘⇧K** in Spotify (or click the ✦
button, bottom-right) to pick themes and plugins. Run the same line again any
time to update.

No password is needed. If macOS says Terminal was blocked from modifying apps,
turn Terminal on under **System Settings → Privacy & Security → App Management**
and paste the line again.

### Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/nicokoka/Mactify/main/uninstall.sh | bash
```

Puts Spotify back to normal and removes everything the installer added.

## How it works

Spotify's desktop UI lives in `/Applications/Spotify.app/Contents/Resources/Apps/xpui.spa`
— an uncompressed ZIP of the web client. The customizer:

1. **Backs up** a pristine copy of `xpui.spa` (per version, under
   `~/Library/Application Support/SpotifyCustomizer/backups/`).
2. **Patches** it: injects `/customizer/loader.js` + `loader.css` into `index.html`
   and copies the built runtime into the archive.
3. **Always patches from the pristine backup**, so re-applying is idempotent and
   never stacks.
4. **Auto re-applies** after Spotify updates, via a small invisible background
   agent (a launchd LaunchAgent — no app, Dock or menu-bar icon). The same agent
   shows the now-playing popup over other apps.

Everything installed lives in `~/Library/Application Support/SpotifyCustomizer/`
plus `~/Library/LaunchAgents/com.spotifycustomizer.agent.plist`.

Options are **sandboxed** — one that breaks (e.g. an update renamed a selector)
never takes down the rest, and the panel flags it as `failed`.

Config lives in Spotify's own `localStorage`, which is stored outside `xpui.spa`,
so your settings survive re-patching and Spotify updates.

## Development

```
engine/    Swift package — CustomizerCore, `customizer` CLI, background agent
runtime/   TypeScript — injected loader, catalog engine, options, settings panel
scripts/   dev.sh dev loop, package-release.sh release bundle
install.sh / uninstall.sh   what users paste into Terminal
```

Needs Xcode (or the Swift toolchain) and Node.

```bash
./scripts/dev.sh   # build for this Mac and install it exactly like install.sh does
```

### Releasing

```bash
./scripts/package-release.sh   # universal build → dist/spotify-customizer-macos.tar.gz
```

Attach the tarball to a new GitHub release. `install.sh` always downloads the
latest release's `spotify-customizer-macos.tar.gz`.

### CLI

Installed at `~/Library/Application Support/SpotifyCustomizer/bin/customizer`, or
from the repo:

```bash
cd engine
swift run customizer status
swift run customizer apply   --assets ../runtime/dist/customizer --restart
swift run customizer restore --restart
```

## What's included

- **20 themes** (Themes tab, one active at a time): 15 recolor + font themes
  (Midnight, Dracula, Nord, Gruvbox, Catppuccin Mocha, Solarized, Rosé Pine, Tokyo
  Night, Forest, Crimson, Ocean, Sakura, Paper, Monochrome, Sunset) and 5 signature
  themes (Liquid Glass, Cyberpunk, Synthwave, Terminal CRT, Retro 98).
- **12 plugins**: Clean home page (hide ads, podcasts/audiobooks, chips, named
  shelves), Custom background (any image or GIF from disk), Sleep timer, Media
  hotkeys (⌥→ ⌥← ⌥S ⌥R ⌥L), Scroll for volume, Zen mode, Session history (⌘⇧H),
  Now-playing toast, Ambient album color, Big-art screensaver, Heart burst,
  Dancing equalizer.
- **System-wide now-playing popup**: part of the Now-playing toast option. The
  background agent floats it over every app and Space on track change (optionally
  over full-screen apps too); its settings live in the toast's panel settings.
- **Tweaks**: accent color, thicker progress bar, layout/chrome options, custom CSS.

**Safe mode:** if an option ever makes Spotify unusable, press **⌘⌥⇧X** — it turns
every option off and reloads.

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

Signature themes paint a generated SVG scene (`catalog/themes/art.ts`) on `<html>`
— Spotify's CSP blocks remote images, but `data:` URIs load. Only decorate the
outer panels in `LAYOUT`/`PANELS`; `clip-path` or `backdrop-filter` on the inner
scrolling `<main>` stops Chromium painting it.

Spotify defines its colors on `.encore-dark-theme …-set` classes, not `:root`, so
always go through `theme-vars.ts` (`paletteCss`, `accentCss`, `fontCss`) rather than
setting `--background-base` etc. on `:root` yourself.

## Caveats

- macOS only, and patches an unsigned client — expect to re-apply after Spotify
  self-updates (the watcher automates this).
- Options that target Spotify's internal markup are **best-effort**: an update can
  rename selectors. Patch re-application is guaranteed; individual option survival
  is not — hence the sandbox + `failed` badges.

#!/usr/bin/env bash
# Spotify Customizer installer. Paste into Terminal:
#
#   curl -fsSL https://raw.githubusercontent.com/nicokoka/Mactify/main/install.sh | bash
#
# Downloads the latest release, patches Spotify, and starts a small invisible
# background agent (now-playing popup + re-patching after Spotify updates).
# Running it again updates to the newest release.
#
# Dev: ./install.sh --local dist/spotify-customizer   installs a local build.
set -euo pipefail

REPO="nicokoka/Mactify"
RELEASE_URL="https://github.com/$REPO/releases/latest/download/spotify-customizer-macos.tar.gz"
SUPPORT="$HOME/Library/Application Support/SpotifyCustomizer"
SPOTIFY_APP="/Applications/Spotify.app"
LABEL="com.spotifycustomizer.agent"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

say() { printf '\033[1;32m▸\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# Earlier dev builds used a launchd watcher and a menu-bar helper app.
remove_legacy() {
  local watcher="$HOME/Library/LaunchAgents/com.spotifycustomizer.watcher.plist"
  if [[ -f "$watcher" ]]; then
    launchctl bootout "$DOMAIN" "$watcher" 2>/dev/null || true
    rm -f "$watcher"
  fi
  pkill -f "Spotify Customizer Helper.app" 2>/dev/null || true
  rm -rf "$HOME/Applications/Spotify Customizer Helper.app"
}

[[ "$(uname -s)" == Darwin ]] || die "Spotify Customizer only works on macOS."
[[ -d "$SPOTIFY_APP" ]] || die "Spotify isn't installed in /Applications. Get it from spotify.com/download, open it once, then run this again."
[[ -w "$SPOTIFY_APP/Contents/Resources/Apps" ]] ||
  die "Spotify was installed by a different user account, so it can't be customized from this one. Reinstall Spotify from spotify.com/download while logged in as $(id -un), then run this again."

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [[ "${1:-}" == "--local" ]]; then
  SRC="$(cd "${2:?--local needs the path to a packaged build}" && pwd)"
else
  say "Downloading the latest Spotify Customizer…"
  curl -fsSL "$RELEASE_URL" -o "$TMP/release.tar.gz" ||
    die "Download failed. Check your internet connection and try again."
  tar -xzf "$TMP/release.tar.gz" -C "$TMP"
  SRC="$TMP/spotify-customizer"
fi
[[ -x "$SRC/bin/customizer" && -x "$SRC/bin/spotify-customizer-agent" && -f "$SRC/runtime/customizer/loader.js" ]] ||
  die "The download looks incomplete. Please try again."

say "Installing…"
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
remove_legacy
mkdir -p "$SUPPORT/runtime"
rm -rf "$SUPPORT/bin" "$SUPPORT/runtime/customizer"
cp -R "$SRC/bin" "$SUPPORT/bin"
cp -R "$SRC/runtime/customizer" "$SUPPORT/runtime/customizer"
[[ -f "$SRC/VERSION" ]] && cp "$SRC/VERSION" "$SUPPORT/VERSION"
xattr -dr com.apple.quarantine "$SUPPORT/bin" 2>/dev/null || true

say "Patching Spotify…"
if ! "$SUPPORT/bin/customizer" apply --assets "$SUPPORT/runtime/customizer"; then
  die "macOS may have blocked changing Spotify. Open System Settings → Privacy & Security → App Management, turn on Terminal, then run this again."
fi

say "Starting the background helper…"
mkdir -p "$(dirname "$PLIST")"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$SUPPORT/bin/spotify-customizer-agent</string>
    <string>--assets</string>
    <string>$SUPPORT/runtime/customizer</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Interactive</string>
  <key>LimitLoadToSessionType</key><string>Aqua</string>
</dict>
</plist>
PLIST
launchctl bootstrap "$DOMAIN" "$PLIST"

# Restart Spotify last, so the agent is already listening when the customizer
# loads and sends it the popup settings.
say "Restarting Spotify…"
pkill -x -U "$(id -u)" Spotify 2>/dev/null || true
sleep 1
open -a Spotify

printf '\n\033[1;32m✓ Done!\033[0m Open Spotify and press ⌘⇧K (or click ✦ bottom-right) to customize.\n'
printf '  To uninstall: curl -fsSL https://raw.githubusercontent.com/%s/main/uninstall.sh | bash\n' "$REPO"

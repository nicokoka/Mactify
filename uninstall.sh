#!/usr/bin/env bash
# Spotify Customizer uninstaller. Paste into Terminal:
#
#   curl -fsSL https://raw.githubusercontent.com/nicokoka/Mactify/main/uninstall.sh | bash
#
# Stops the background agent, puts Spotify back to normal, and deletes every
# file the installer added.
set -euo pipefail

SUPPORT="$HOME/Library/Application Support/SpotifyCustomizer"
LABEL="com.spotifycustomizer.agent"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

say() { printf '\033[1;32m▸\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*" >&2; }

say "Stopping the background helper…"
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
rm -f "$PLIST"

# Earlier dev builds used a launchd watcher and a menu-bar helper app.
WATCHER="$HOME/Library/LaunchAgents/com.spotifycustomizer.watcher.plist"
if [[ -f "$WATCHER" ]]; then
  launchctl bootout "$DOMAIN" "$WATCHER" 2>/dev/null || true
  rm -f "$WATCHER"
fi
pkill -f "Spotify Customizer Helper.app" 2>/dev/null || true
rm -rf "$HOME/Applications/Spotify Customizer Helper.app"

say "Restoring the original Spotify…"
if [[ -x "$SUPPORT/bin/customizer" ]] && "$SUPPORT/bin/customizer" restore --restart; then
  :
else
  warn "Couldn't restore Spotify automatically. Reinstalling Spotify from spotify.com/download also removes the customizer."
fi

say "Removing files…"
rm -rf "$SUPPORT"

printf '\n\033[1;32m✓ Uninstalled.\033[0m Spotify is back to normal.\n'

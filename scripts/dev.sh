#!/usr/bin/env bash
# Dev loop: rebuild the runtime, stage assets, (re)patch Spotify, relaunch it.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS_SRC="$REPO/runtime/dist/customizer"
ASSETS_DST="$HOME/Library/Application Support/SpotifyCustomizer/runtime/customizer"

echo "▸ Building runtime…"
( cd "$REPO/runtime" && npm run --silent build )

echo "▸ Staging assets → $ASSETS_DST"
mkdir -p "$ASSETS_DST"
rm -f "$ASSETS_DST"/*
cp "$ASSETS_SRC"/* "$ASSETS_DST"/

echo "▸ Building engine…"
( cd "$REPO/engine" && swift build )

echo "▸ Applying + restarting Spotify…"
( cd "$REPO/engine" && swift run customizer apply --assets "$ASSETS_DST" --restart )

echo "✓ Done. Open Spotify and press ⌘⇧K for the panel."

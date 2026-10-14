#!/usr/bin/env bash
# Dev loop: build everything for this Mac and install it exactly the way users
# get it from install.sh (patch Spotify + start the background agent).
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$REPO/scripts/package-release.sh" --native
"$REPO/install.sh" --local "$REPO/dist/spotify-customizer"

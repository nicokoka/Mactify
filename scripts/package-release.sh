#!/usr/bin/env bash
# Build the bundle install.sh downloads: the CLI + background agent binaries and
# the runtime assets, packed as dist/spotify-customizer-macos.tar.gz.
#
#   ./scripts/package-release.sh           # universal (Apple silicon + Intel)
#   ./scripts/package-release.sh --native  # this Mac's arch only, faster (dev.sh)
#
# Publish by attaching the tarball to a GitHub release; install.sh always pulls
# from the latest one.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$REPO/dist"
STAGE="$OUT/spotify-customizer"
TARBALL="$OUT/spotify-customizer-macos.tar.gz"

ARCH_FLAGS=(--arch arm64 --arch x86_64)
[[ "${1:-}" == "--native" ]] && ARCH_FLAGS=()
# bash 3.2 (macOS default) treats an empty "${arr[@]}" as unbound under `set -u`.
SWIFT_FLAGS=(-c release ${ARCH_FLAGS[@]+"${ARCH_FLAGS[@]}"})

echo "▸ Building runtime…"
( cd "$REPO/runtime" && { [[ -d node_modules ]] || npm ci --silent; } && npm run --silent build )

echo "▸ Building engine (${ARCH_FLAGS[*]:-native})…"
( cd "$REPO/engine" && swift build "${SWIFT_FLAGS[@]}" --product customizer \
                    && swift build "${SWIFT_FLAGS[@]}" --product spotify-customizer-agent )
BIN_DIR="$(cd "$REPO/engine" && swift build "${SWIFT_FLAGS[@]}" --show-bin-path)"

echo "▸ Staging $STAGE"
rm -rf "$STAGE" "$TARBALL"
mkdir -p "$STAGE/bin" "$STAGE/runtime/customizer"
cp "$BIN_DIR/customizer" "$BIN_DIR/spotify-customizer-agent" "$STAGE/bin/"
cp "$REPO/runtime/dist/customizer/"* "$STAGE/runtime/customizer/"
git -c safe.directory="$REPO" -C "$REPO" rev-parse --short HEAD > "$STAGE/VERSION" 2>/dev/null || date +%Y%m%d > "$STAGE/VERSION"

# Ad-hoc signatures so the binaries run on Apple silicon after download.
codesign --force --sign - "$STAGE/bin/customizer" "$STAGE/bin/spotify-customizer-agent"

COPYFILE_DISABLE=1 tar -czf "$TARBALL" -C "$OUT" spotify-customizer
echo "✓ $TARBALL ($(du -h "$TARBALL" | cut -f1 | xargs))"

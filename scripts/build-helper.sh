#!/usr/bin/env bash
# Package the menu-bar app as "Spotify Customizer Helper.app" — the optional
# helper behind the toast's "pop up over other apps" feature.
#
#   ./scripts/build-helper.sh            # build into dist/
#   ./scripts/build-helper.sh --install  # …and copy into ~/Applications
#   ./scripts/build-helper.sh --zip      # …and zip it for a GitHub release
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="Spotify Customizer Helper"
BUNDLE_ID="com.spotifycustomizer.helper"
URL_SCHEME="spotify-customizer-helper"
OUT="$REPO/dist"
APP="$OUT/$APP_NAME.app"

echo "▸ Building release binary…"
( cd "$REPO/engine" && swift build -c release --product CustomizerMenuBar )
BIN="$(cd "$REPO/engine" && swift build -c release --show-bin-path)/CustomizerMenuBar"

echo "▸ Assembling $APP"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp "$BIN" "$APP/Contents/MacOS/CustomizerMenuBar"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>$APP_NAME</string>
  <key>CFBundleDisplayName</key><string>$APP_NAME</string>
  <key>CFBundleIdentifier</key><string>$BUNDLE_ID</string>
  <key>CFBundleExecutable</key><string>CustomizerMenuBar</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <!-- Menu-bar only: no Dock icon. -->
  <key>LSUIElement</key><true/>
  <!-- Spotify opens $URL_SCHEME://launch on startup to start the helper. -->
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key><string>$BUNDLE_ID</string>
      <key>CFBundleURLSchemes</key><array><string>$URL_SCHEME</string></array>
    </dict>
  </array>
</dict>
</plist>
PLIST

# Ad-hoc signature so macOS will run it locally (not notarized).
codesign --force --sign - "$APP"
echo "✓ Built $APP"

case "${1:-}" in
  --install)
    DEST="$HOME/Applications"
    mkdir -p "$DEST"
    rm -rf "$DEST/$APP_NAME.app"
    cp -R "$APP" "$DEST/"
    # Register the URL scheme with LaunchServices right away.
    /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$DEST/$APP_NAME.app"
    echo "✓ Installed to $DEST/$APP_NAME.app"
    ;;
  --zip)
    ( cd "$OUT" && rm -f "$APP_NAME.zip" && ditto -c -k --keepParent "$APP_NAME.app" "$APP_NAME.zip" )
    echo "✓ Zipped $OUT/$APP_NAME.zip — attach it to a GitHub release"
    ;;
esac

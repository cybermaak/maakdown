#!/usr/bin/env bash
# postbuild-darwin.sh — compile the themed .icon bundle and inject the compiled
# assets into the macOS app bundle after a Wails build.
#
# Apple's .icon format (from Icon Composer) carries layered theming metadata for
# light/dark/tinted icons on macOS.  The raw .icon bundle is NOT directly
# usable by the system — it must be compiled with actool into:
#   1. Assets.car   — compiled asset catalog (theming / modern icon)
#   2. maakdown.icns — legacy fallback for older macOS
#
# This script runs actool, places both artefacts into Contents/Resources/,
# removes the Wails-generated iconfile.icns (which was built from the generic
# build/appicon.png), and touches the bundle so Finder re-reads the icon.
#
# Usage:  scripts/postbuild-darwin.sh [path/to/Maakdown.app]
#         Defaults to build/bin/Maakdown.app if no argument is given.
#
# Requires: Xcode command-line tools (xcrun actool).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="${1:-$REPO_ROOT/build/bin/Maakdown.app}"
ICON_SRC="$REPO_ROOT/docs/design-system/maakdown.icon"
RESOURCES="$APP/Contents/Resources"
STAGING="$(mktemp -d)"

if [ ! -d "$ICON_SRC" ]; then
  echo "ERROR: Icon source not found at $ICON_SRC" >&2
  exit 1
fi

if [ ! -d "$RESOURCES" ]; then
  echo "ERROR: App bundle Resources not found at $RESOURCES" >&2
  exit 1
fi

# Compile the .icon into Assets.car + maakdown.icns via actool.
xcrun actool "$ICON_SRC" \
  --compile "$STAGING" \
  --app-icon maakdown \
  --platform macosx \
  --target-device mac \
  --minimum-deployment-target 10.14 \
  --output-partial-info-plist /dev/null \
  --include-all-app-icons >/dev/null

# Place the compiled artefacts into Contents/Resources/.
cp "$STAGING/Assets.car"     "$RESOURCES/Assets.car"
cp "$STAGING/maakdown.icns"  "$RESOURCES/maakdown.icns"

# Remove the Wails-generated legacy iconfile.icns (built from build/appicon.png)
# so it cannot compete with our properly themed icon.
rm -f "$RESOURCES/iconfile.icns"

# Clean up the staging directory.
rm -rf "$STAGING"

# Touch the app bundle so Finder re-reads the icon metadata.
touch "$APP"

echo "✓ Compiled maakdown.icon → Assets.car + maakdown.icns into $RESOURCES"

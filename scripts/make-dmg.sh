#!/usr/bin/env bash
set -euo pipefail

# Build a drag-to-Applications .dmg from a (signed) .app using only the built-in
# hdiutil — no external dependency. Sign the .app first; notarize + staple the
# resulting .dmg afterwards (see release-mac.sh for the full order).

app_path="${1:?Usage: make-dmg.sh <App.app> <out.dmg>}"
out="${2:?Usage: make-dmg.sh <App.app> <out.dmg>}"

[ -d "$app_path" ] || { echo "App bundle not found: $app_path" >&2; exit 1; }

app_name="$(basename "$app_path" .app)"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

cp -R "$app_path" "$stage/"
ln -s /Applications "$stage/Applications"

mkdir -p "$(dirname "$out")"
rm -f "$out"
hdiutil create \
  -volname "$app_name" \
  -srcfolder "$stage" \
  -ov -format UDZO \
  "$out" >/dev/null

echo "Created $out"

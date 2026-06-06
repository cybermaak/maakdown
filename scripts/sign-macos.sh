#!/usr/bin/env bash
set -euo pipefail

: "${MAAKDOWN_MACOS_CODESIGN_IDENTITY:?Set MAAKDOWN_MACOS_CODESIGN_IDENTITY}"
: "${MAAKDOWN_NOTARY_PROFILE:?Set MAAKDOWN_NOTARY_PROFILE}"

app_path="${1:-build/bin/Maakdown.app}"
entitlements="${MAAKDOWN_MACOS_ENTITLEMENTS:-build/darwin/entitlements.plist}"

codesign --force --deep --options runtime --timestamp \
  --entitlements "$entitlements" \
  --sign "$MAAKDOWN_MACOS_CODESIGN_IDENTITY" \
  "$app_path"
codesign --verify --deep --strict --verbose=2 "$app_path"

archive="${app_path%.app}.zip"
ditto -c -k --keepParent "$app_path" "$archive"
xcrun notarytool submit "$archive" --keychain-profile "$MAAKDOWN_NOTARY_PROFILE" --wait
xcrun stapler staple "$app_path"
spctl --assess --type execute --verbose=4 "$app_path"

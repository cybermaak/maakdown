#!/usr/bin/env bash
set -euo pipefail

# Code-sign Maakdown.app with the Developer ID Application identity under a
# hardened runtime. Sign-only: notarization and stapling live in
# scripts/notarize-macos.sh, and the end-to-end release flow in
# scripts/release-mac.sh.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then set -a; source "$ROOT/.env"; set +a; fi

: "${MAAKDOWN_MACOS_CODESIGN_IDENTITY:?Set MAAKDOWN_MACOS_CODESIGN_IDENTITY}"

app_path="${1:-build/bin/Maakdown.app}"
entitlements="${MAAKDOWN_MACOS_ENTITLEMENTS:-build/darwin/entitlements.plist}"

[ -d "$app_path" ] || { echo "App bundle not found: $app_path" >&2; exit 1; }
[ -f "$entitlements" ] || { echo "Entitlements not found: $entitlements" >&2; exit 1; }

codesign --force --deep --options runtime --timestamp \
  --entitlements "$entitlements" \
  --sign "$MAAKDOWN_MACOS_CODESIGN_IDENTITY" \
  "$app_path"

codesign --verify --deep --strict --verbose=2 "$app_path"

echo "Signed and verified: $app_path"

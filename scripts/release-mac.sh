#!/usr/bin/env bash
set -euo pipefail

# Local macOS release driver. Builds the arm64 app, signs it with Developer ID
# under a hardened runtime, wraps it in a .dmg, notarizes (which covers the app
# inside), staples the ticket to both the .dmg and the .app, verifies the
# result, packages a notarized .zip, and uploads both to the matching GitHub
# Release. Signing/notarization credentials come from .env and the keychain and
# never leave this machine.
#
# Usage:
#   scripts/release-mac.sh [--no-publish] [vX.Y.Z]
#     --no-publish   build/sign/notarize/verify locally; skip the GitHub upload
#     vX.Y.Z         release tag (default: exact git tag, else `git describe`)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

publish=1
tag=""
for arg in "$@"; do
  case "$arg" in
    --no-publish) publish=0 ;;
    v*)           tag="$arg" ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

# --- secrets / preflight -----------------------------------------------------
if [[ -f .env ]]; then set -a; source .env; set +a; fi
: "${MAAKDOWN_MACOS_CODESIGN_IDENTITY:?set MAAKDOWN_MACOS_CODESIGN_IDENTITY (in .env)}"
: "${MAAKDOWN_NOTARY_PROFILE:?set MAAKDOWN_NOTARY_PROFILE (in .env)}"

command -v wails >/dev/null 2>&1 || { echo "ERROR: wails not on PATH (go install github.com/wailsapp/wails/v2/cmd/wails@v2.11.0)" >&2; exit 1; }
xcode-select -p >/dev/null 2>&1 || { echo "ERROR: Xcode command-line tools missing (xcode-select --install)" >&2; exit 1; }
security find-identity -v -p codesigning | grep -q "Developer ID Application" \
  || { echo "ERROR: no 'Developer ID Application' identity in the keychain" >&2; exit 1; }
xcrun notarytool history --keychain-profile "$MAAKDOWN_NOTARY_PROFILE" >/dev/null 2>&1 \
  || { echo "ERROR: notary profile '$MAAKDOWN_NOTARY_PROFILE' not found. Create it once with: xcrun notarytool store-credentials" >&2; exit 1; }

if (( publish )); then
  command -v gh >/dev/null 2>&1 || { echo "ERROR: gh CLI not found (https://cli.github.com)" >&2; exit 1; }
  gh auth status >/dev/null 2>&1 || { echo "ERROR: gh is not logged in (gh auth login)" >&2; exit 1; }
fi

# Resolve the release version: explicit arg, else the exact tag on HEAD, else a
# git-describe fallback for dry runs.
if [[ -z "$tag" ]]; then
  tag="$(git describe --tags --exact-match 2>/dev/null \
      || git describe --tags --always 2>/dev/null \
      || echo dev)"
fi
version="$tag"
arch="arm64"
export VERSION="$version"

echo "==> Releasing $version (macos/$arch)$([[ $publish == 0 ]] && echo '  [no-publish]')"

# --- build -------------------------------------------------------------------
# `wails build` runs the frontend install + build via wails.json, so we don't
# build the frontend separately. The tag is injected into main.appVersion.
echo "==> Building Wails app (arm64, version=$version)"
wails build -clean -platform darwin/arm64 -ldflags "-X main.appVersion=${version}"
scripts/postbuild-darwin.sh

app="build/bin/Maakdown.app"
[ -d "$app" ] || { echo "ERROR: build produced no app at $app" >&2; exit 1; }

# --- sign --------------------------------------------------------------------
echo "==> Signing (Developer ID, hardened runtime)"
scripts/sign-macos.sh "$app"

# --- notarize + staple the APP first -----------------------------------------
# Staple the bundle itself before packaging, so the app stays notarized after a
# user drags it out of the .dmg to /Applications (offline first launch works).
# notarytool can't take a raw .app, so submit it through a transport zip.
mkdir -p dist
appzip="dist/.notarize-app-${version}.zip"
echo "==> Notarizing the app bundle (round 1/2)"
ditto -c -k --sequesterRsrc --keepParent "$app" "$appzip"
scripts/notarize-macos.sh "$appzip" "$app"
rm -f "$appzip"

# --- package: dmg + zip from the stapled app ---------------------------------
dmg="dist/Maakdown-${version}-macos-${arch}.dmg"
zip="dist/Maakdown-${version}-macos-${arch}.zip"

echo "==> Building DMG from the stapled app"
scripts/make-dmg.sh "$app" "$dmg"
echo "==> Notarizing + stapling the DMG (round 2/2)"
scripts/notarize-macos.sh "$dmg"

echo "==> Packaging the stapled .app as a .zip"
ditto -c -k --sequesterRsrc --keepParent "$app" "$zip"

# --- verify ------------------------------------------------------------------
echo "==> Verifying signature + notarization"
codesign --verify --deep --strict --verbose=2 "$app"
spctl --assess --type execute --verbose=4 "$app"
xcrun stapler validate "$app"
xcrun stapler validate "$dmg"

echo "==> Local artifacts:"
ls -la "$dmg" "$zip"

# --- publish -----------------------------------------------------------------
if (( publish )); then
  echo "==> Uploading to GitHub Release $tag"
  if ! gh release view "$tag" >/dev/null 2>&1; then
    echo "    Release $tag not found — creating it"
    gh release create "$tag" --title "$tag" --generate-notes
  fi
  gh release upload "$tag" "$dmg" "$zip" --clobber
  echo "==> Release assets:"
  gh release view "$tag" --json assets -q '.assets[].name'
else
  echo "==> --no-publish: skipped GitHub upload. Artifacts left in dist/."
fi

echo "==> Done."

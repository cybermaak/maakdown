#!/usr/bin/env bash
# Package the platform-native Wails build under build/bin/ into a distributable
# archive in dist/. Reused locally and by the release workflow. Run after
# `wails build`. Emits the archive path on stdout (and as `artifact=` to
# $GITHUB_OUTPUT when present).
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

artifact_root="build/bin"
[ -d "$artifact_root" ] || { echo "Missing Wails output: $artifact_root (run 'wails build' first)" >&2; exit 1; }

mkdir -p dist

version="${VERSION:-$(git describe --tags --always 2>/dev/null || echo dev)}"
artifact_version="$(printf '%s' "$version" | tr '/:[:space:]' '---')"

normalize_arch() {
  case "$(uname -m)" in
    arm64|aarch64) echo "arm64" ;;
    x86_64|amd64) echo "x64" ;;
    *) uname -m ;;
  esac
}
arch="$(normalize_arch)"

case "${RUNNER_OS:-$(uname -s)}" in
  macOS|Darwin)
    app="$(find "$artifact_root" -maxdepth 1 -type d -name '*.app' -print -quit)"
    [ -n "$app" ] || { echo "No .app bundle in $artifact_root" >&2; exit 1; }
    out="dist/Maakdown-${artifact_version}-macos-${arch}.zip"
    # ditto preserves the bundle structure and resource forks.
    ditto -c -k --sequesterRsrc --keepParent "$app" "$out"
    ;;
  Windows*|MINGW*|MSYS*)
    exe="$(find "$artifact_root" -maxdepth 1 -type f -name '*.exe' -print -quit)"
    [ -n "$exe" ] || { echo "No .exe in $artifact_root" >&2; exit 1; }
    out="dist/Maakdown-${artifact_version}-windows-${arch}.zip"
    powershell.exe -NoProfile -Command "Compress-Archive -Path '$exe' -DestinationPath '$out' -Force"
    ;;
  Linux)
    bin="$(find "$artifact_root" -maxdepth 1 -type f -perm -u+x -print -quit)"
    [ -n "$bin" ] || { echo "No executable in $artifact_root" >&2; exit 1; }
    out="dist/Maakdown-${artifact_version}-linux-${arch}.tar.gz"
    tar -czf "$out" -C "$artifact_root" "$(basename "$bin")"
    ;;
  *)
    echo "Unsupported platform: ${RUNNER_OS:-$(uname -s)}" >&2
    exit 1
    ;;
esac

echo "Packaged $out"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "artifact=$out" >> "$GITHUB_OUTPUT"
fi

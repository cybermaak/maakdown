#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_dir="${MAAKDOWN_SCREENSHOT_DIR:-$repo_root/output/native-screenshots}"
fixture="$repo_root/fixtures/native-rendering-smoke.md"
app="$repo_root/build/bin/Maakdown.app"
executable="$app/Contents/MacOS/Maakdown"

mkdir -p "$output_dir"
pkill -x Maakdown 2>/dev/null || true

for theme in light dark; do
  test_home="$(mktemp -d)"
  state="$test_home/Library/Application Support/Maakdown/state.json"
  node "$repo_root/scripts/write-native-visual-state.mjs" "$theme" "$state"

  HOME="$test_home" "$executable" "$fixture" \
    >"$output_dir/macos-$theme.log" 2>&1 &
  app_pid=$!
  trap 'kill "$app_pid" 2>/dev/null || true' EXIT

  sleep 10
  # GitHub-hosted macOS runners do not grant Accessibility permission to CI,
  # so capture the desktop containing the centered Maakdown window.
  screencapture -x "$output_dir/macos-$theme.png"

  kill "$app_pid" 2>/dev/null || true
  wait "$app_pid" 2>/dev/null || true
  trap - EXIT
  rm -rf "$test_home"
done

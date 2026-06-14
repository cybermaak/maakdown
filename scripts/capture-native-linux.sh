#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_dir="${MAAKDOWN_SCREENSHOT_DIR:-$repo_root/output/native-screenshots}"
fixture="$repo_root/fixtures/native-rendering-smoke.md"
app="$repo_root/build/bin/Maakdown"

mkdir -p "$output_dir"

for theme in light dark; do
  config_root="$(mktemp -d)"
  node "$repo_root/scripts/write-native-visual-state.mjs" \
    "$theme" "$config_root/Maakdown/state.json"

  XDG_CONFIG_HOME="$config_root" "$app" "$fixture" >"$output_dir/linux-$theme.log" 2>&1 &
  app_pid=$!
  trap 'kill "$app_pid" 2>/dev/null || true' EXIT

  # WebKitGTK enhancement work is asynchronous. The compact fixture and fixed
  # wait make the resulting artifact suitable for human spot checks.
  sleep 10
  import -window root "$output_dir/linux-$theme.png"

  kill "$app_pid" 2>/dev/null || true
  wait "$app_pid" 2>/dev/null || true
  trap - EXIT
  rm -rf "$config_root"
done


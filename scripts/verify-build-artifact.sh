#!/usr/bin/env bash
set -euo pipefail

artifact_root="build/bin"

if [ ! -d "$artifact_root" ]; then
  echo "Expected Wails output directory is missing: $artifact_root" >&2
  exit 1
fi

case "${RUNNER_OS:-$(uname -s)}" in
  macOS|Darwin)
    artifact="$(find "$artifact_root" -maxdepth 1 -type d -name '*.app' -print -quit)"
    ;;
  Windows*|MINGW*|MSYS*)
    artifact="$(find "$artifact_root" -maxdepth 1 -type f -name '*.exe' -print -quit)"
    ;;
  Linux)
    artifact="$(find "$artifact_root" -maxdepth 1 -type f -perm -u+x -print -quit)"
    ;;
  *)
    echo "Unsupported verification platform: ${RUNNER_OS:-$(uname -s)}" >&2
    exit 1
    ;;
esac

if [ -z "$artifact" ]; then
  echo "No native application artifact found under $artifact_root" >&2
  find "$artifact_root" -maxdepth 2 -print >&2
  exit 1
fi

echo "Verified native application artifact: $artifact"

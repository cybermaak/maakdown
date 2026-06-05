#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Frontend check =="
if [ -d "$ROOT/frontend/node_modules" ]; then
  (cd "$ROOT/frontend" && npm run check)
else
  echo "frontend/node_modules missing; run 'cd frontend && npm install' to enable npm run check"
fi

echo "== Go tests =="
if command -v go >/dev/null 2>&1; then
  (cd "$ROOT" && go test ./...)
else
  echo "go not found; skipping go test ./..."
fi

echo "== Wails build =="
WAILS_BIN="${WAILS_BIN:-}"
if [ -z "$WAILS_BIN" ] && command -v wails >/dev/null 2>&1; then
  WAILS_BIN="$(command -v wails)"
fi
if [ -z "$WAILS_BIN" ] && command -v go >/dev/null 2>&1; then
  GOPATH_VALUE="$(go env GOPATH)"
  if [ -x "$GOPATH_VALUE/bin/wails" ]; then
    WAILS_BIN="$GOPATH_VALUE/bin/wails"
  fi
fi

if [ -n "$WAILS_BIN" ]; then
  (cd "$ROOT" && "$WAILS_BIN" build)
else
  echo "wails not found; skipping wails build"
fi

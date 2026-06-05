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
if command -v wails >/dev/null 2>&1; then
  (cd "$ROOT" && wails build)
else
  echo "wails not found; skipping wails build"
fi

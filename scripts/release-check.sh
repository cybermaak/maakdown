#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

node tools/generate-reader-evaluation-fixture.mjs >/dev/null
scripts/verify.sh
(cd frontend && npm run benchmark)
(cd frontend && npx playwright install chromium >/dev/null && npm run uat)

echo "Release checks passed. Signing remains a credentialed platform-owner step."

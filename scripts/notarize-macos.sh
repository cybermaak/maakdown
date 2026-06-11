#!/usr/bin/env bash
set -euo pipefail

# Submit a container to Apple notarization via a stored keychain profile, wait
# for the verdict, then staple the ticket. The contents must already be
# Developer ID signed with a hardened runtime (see sign-macos.sh). On failure the
# notary log is printed to explain the rejection.
#
#   notarize-macos.sh <submit-file> [staple-target]
#     submit-file    the .dmg or .zip uploaded to notarytool
#     staple-target  what to staple (default: submit-file). Pass the .app when
#                    notarizing via a transport .zip — you staple the bundle, not
#                    the zip.
#
# The notary credentials live in the keychain profile named by
# MAAKDOWN_NOTARY_PROFILE (created once with `xcrun notarytool store-credentials`);
# nothing sensitive is read from .env.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then set -a; source "$ROOT/.env"; set +a; fi

: "${MAAKDOWN_NOTARY_PROFILE:?Set MAAKDOWN_NOTARY_PROFILE in .env}"

submit="${1:?Usage: notarize-macos.sh <submit-file> [staple-target]}"
staple_target="${2:-$submit}"
[ -e "$submit" ] || { echo "Submit file not found: $submit" >&2; exit 1; }
[ -e "$staple_target" ] || { echo "Staple target not found: $staple_target" >&2; exit 1; }

notary_creds=(--keychain-profile "$MAAKDOWN_NOTARY_PROFILE")

echo "Submitting $submit to notarytool…"
if ! submit_out="$(xcrun notarytool submit "$submit" "${notary_creds[@]}" --wait 2>&1)"; then
  echo "$submit_out"
  id="$(printf '%s\n' "$submit_out" | awk '/  id:/{print $2; exit}')"
  if [ -n "${id:-}" ]; then
    echo "--- notary log for $id ---"
    xcrun notarytool log "$id" "${notary_creds[@]}" || true
  fi
  exit 1
fi
printf '%s\n' "$submit_out"

xcrun stapler staple "$staple_target"
xcrun stapler validate "$staple_target"

echo "Notarized and stapled: $staple_target"

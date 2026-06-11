# Release, Signing & Publishing — Design

**Status:** macOS implemented; pending live verification before commit. Windows
signing staged for a future cert.

## Goal

A repeatable process to build, sign, and publish Maakdown release binaries that
runs **locally** (scripts, not CI-secret-based signing), because the maintainer
can only sign macOS binaries with a Developer ID certificate on their own Mac.

## Constraints & decisions

- **macOS build is arm64-only** (no universal binary).
- **Signing/notarization run only on the maintainer's Mac.** Credentials never
  enter CI.
- **Notarization uses a keychain profile** (`xcrun notarytool store-credentials`,
  e.g. `cybermaak-notary`, reusable across projects). Only the profile *name*
  lives in `.env`; the credentials stay in the keychain.
- **macOS ships both `.dmg` (drag-to-Applications) and `.zip`.**
- **Windows/Linux stay unsigned for now** — built in CI. Windows shows a
  SmartScreen warning until a certificate is available; the
  `scripts/sign-windows.ps1` path is staged for that day. Unsigned Linux is
  normal.

## Architecture

```
Tag push (vX.Y.Z)
  ├─ CI (release.yml): build UNSIGNED Windows + Linux → publish to the Release
  └─ Maintainer's Mac: scripts/release-mac.sh
       build (arm64, version-injected) → sign (Developer ID, hardened runtime)
       → make .dmg → notarize .dmg → staple .dmg + .app → verify → zip .app
       → gh release upload --clobber  (same Release; whoever runs first creates it)
```

macOS leaves CI's matrix entirely, so no unsigned mac build is ever published and
there is no publish race. Both sides converge on one GitHub Release per tag.

### Notarization order (two Apple round-trips)

The `.dmg` is drag-to-Applications, so the user copies the `.app` *out* of it;
the bundle itself must therefore carry a stapled ticket (the dmg's own staple
does not follow a copied-out app). So:

1. Sign the `.app`.
2. **Round 1** — submit the `.app` (via a transport `.zip`) to notarytool, then
   `stapler staple` the **`.app`**.
3. Build the `.dmg` from the now-stapled `.app`, and zip the stapled `.app`.
4. **Round 2** — submit the `.dmg`, then staple the `.dmg`.

Result: the `.app` (inside both the dmg and the zip) and the dmg all carry
stapled tickets, so first launch works offline whether run from the zip, the
mounted dmg, or after dragging to `/Applications`. (Verified: a downloaded dmg's
app, copied out and validated with the dmg unmounted, passes
`spctl --assess` = "Notarized Developer ID" and `stapler validate`.)

## Components (single-purpose scripts)

| Script | Job |
|---|---|
| `scripts/sign-macos.sh` | `codesign` the `.app` (hardened runtime + entitlements + timestamp), then `codesign --verify`. Sign-only. |
| `scripts/notarize-macos.sh` | Submit a `.dmg`/`.zip` to `notarytool` via `--keychain-profile` (`MAAKDOWN_NOTARY_PROFILE`), `--wait`, then staple a given target (default the submitted file). Prints the notary log on failure. |
| `scripts/make-dmg.sh` | Build a drag-to-Applications `.dmg` from a signed `.app` using built-in `hdiutil` (no external dependency). |
| `scripts/release-mac.sh` | Orchestrator: preflight → build → icon postbuild → sign → dmg → notarize → staple both → verify (`spctl`, `stapler validate`) → zip → `gh release upload`. `--no-publish` for a full local dry run; optional `vX.Y.Z` arg. |

## Credentials & secrets

`.env` (gitignored) holds only `MAAKDOWN_MACOS_CODESIGN_IDENTITY` and
`MAAKDOWN_NOTARY_PROFILE` (plus an optional entitlements override). The notary
profile keeps the App Store Connect API key (or Apple ID + app-specific
password) in the keychain. GitHub publishing derives `GH_TOKEN` from the existing
`gh auth token` at runtime — no PAT stored. `release-mac.sh` refuses to run if
the identity, notary profile, Xcode CLT, `wails`, or (when publishing) the `gh`
login are missing, before any expensive build.

## CI change

`release.yml`: drop the `macOS / macos-14` matrix entry so the tag job builds
Windows + Linux only; the publish job still globs `dist/*`. `workflow_dispatch`
remains for unsigned Win/Linux dry runs. macOS dry runs use
`release-mac.sh --no-publish`.

## Verification (acceptance)

The process is accepted only after a live end-to-end run: cut a throwaway tag,
run `release-mac.sh`, download the published `.dmg` back, and confirm
`spctl --assess --type execute` reports **"accepted source=Notarized Developer
ID"** and `stapler validate` passes on the downloaded app. This is the gate
before committing the implementation.

## Known empirical risk

The hardened-runtime entitlements currently ship `allow-jit` +
`disable-library-validation`. If the first notarized launch crashes,
`com.apple.security.cs.allow-unsigned-executable-memory` is the likely missing
entitlement — added to `build/darwin/entitlements.plist` and re-run. Documented
in `docs/RELEASING.md`.

## Docs

- `docs/RELEASING.md` — maintainer runbook (one-time setup, cut a release, dry
  run, verify a published build, troubleshooting, future Windows signing).
- `build/darwin/README.md`, `build/signing/README.md` — point at the runbook and
  the script split.

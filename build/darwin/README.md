# macOS Build Metadata

This directory contains signing-safe macOS templates.

Do not commit certificates, provisioning profiles, notarization credentials, keychain exports, signed `.app` bundles, `.dmg` files, or notarization logs.

Secret inputs (in `.env`, never committed):

- `MAAKDOWN_MACOS_CODESIGN_IDENTITY` — the Developer ID Application identity
- `MAAKDOWN_NOTARY_PROFILE` — keychain profile from `xcrun notarytool store-credentials`
- `MAAKDOWN_MACOS_ENTITLEMENTS` — optional override (defaults to `entitlements.plist`)

## Release Procedure

The full, signed + notarized macOS release runs from one local command —
**[`docs/RELEASING.md`](../../docs/RELEASING.md)** is the authoritative runbook:

```bash
scripts/release-mac.sh vX.Y.Z          # build → sign → dmg → notarize → staple → publish
scripts/release-mac.sh --no-publish     # same, but stop before the GitHub upload
```

It orchestrates these single-purpose scripts:

- `scripts/sign-macos.sh` — codesign the `.app` (hardened runtime + entitlements + timestamp), then verify.
- `scripts/make-dmg.sh` — wrap the signed `.app` in a drag-to-Applications `.dmg`.
- `scripts/notarize-macos.sh` — submit a `.dmg`/`.zip` to `notarytool`, wait, and staple.

The macOS build is arm64-only. Review `entitlements.plist` before changing it;
add capabilities only when a notarized launch proves they are required.

App Store distribution is not the v1 target. The Wails development build uses
private APIs and must never be submitted as a release artifact.

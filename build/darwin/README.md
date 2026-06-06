# macOS Build Metadata

This directory contains signing-safe macOS templates.

Do not commit certificates, provisioning profiles, notarization credentials, keychain exports, signed `.app` bundles, `.dmg` files, or notarization logs.

Expected secret inputs for a future release workflow:

- `MAAKDOWN_MACOS_CODESIGN_IDENTITY`
- `MAAKDOWN_MACOS_KEYCHAIN_PROFILE`
- `MAAKDOWN_APPLE_ID`
- `MAAKDOWN_APPLE_TEAM_ID`
- `MAAKDOWN_NOTARY_PROFILE`

## Release Procedure

1. Build the production bundle with `wails build -platform darwin/universal`.
2. Confirm the bundle identifier and version in `Info.plist`.
3. Review `entitlements.plist`; add capabilities only when runtime verification proves they are required.
4. Export the signing identity and notary profile through the environment or the user's keychain.
5. Run `scripts/sign-macos.sh build/bin/Maakdown.app`.
6. Preserve the notarized artifact, checksum, and symbol archive outside git.

The script applies the hardened runtime, verifies the signature, submits a zip
with `notarytool`, staples the ticket, and runs Gatekeeper assessment.

App Store distribution is not the v1 target. The Wails development build uses
private APIs and must never be submitted as a release artifact.

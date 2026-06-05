# macOS Build Metadata

This directory contains signing-safe macOS templates.

Do not commit certificates, provisioning profiles, notarization credentials, keychain exports, signed `.app` bundles, `.dmg` files, or notarization logs.

Expected secret inputs for a future release workflow:

- `MAAKDOWN_MACOS_CODESIGN_IDENTITY`
- `MAAKDOWN_MACOS_KEYCHAIN_PROFILE`
- `MAAKDOWN_APPLE_ID`
- `MAAKDOWN_APPLE_TEAM_ID`
- `MAAKDOWN_NOTARY_PROFILE`

The entitlements file should be reviewed before release. Wails/WebView apps may require JIT-related entitlements depending on final WebView behavior and hardened-runtime settings.

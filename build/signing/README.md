# Signing Notes

This directory is for non-secret signing documentation and templates only.

## Never Commit

- macOS certificates or keychain exports
- Windows `.pfx`/`.p12` files
- private keys
- notarization credentials
- provisioning profiles
- signed `.app`, `.dmg`, `.pkg`, `.exe`, `.msi`, or `.zip` artifacts
- notarization logs containing credentials or account identifiers

## macOS Release Inputs

Use environment variables or CI secrets:

- `MAAKDOWN_MACOS_CODESIGN_IDENTITY`
- `MAAKDOWN_MACOS_KEYCHAIN_PROFILE`
- `MAAKDOWN_APPLE_ID`
- `MAAKDOWN_APPLE_TEAM_ID`
- `MAAKDOWN_NOTARY_PROFILE`

## Windows Release Inputs

Use environment variables or CI secrets:

- `MAAKDOWN_WINDOWS_CERT_PATH`
- `MAAKDOWN_WINDOWS_CERT_PASSWORD`
- `MAAKDOWN_WINDOWS_TIMESTAMP_URL`

## Structure Decision

Signing metadata is separated by platform so future release automation can use:

- `build/darwin/` for macOS Info.plist and entitlements
- `build/windows/` for Windows app manifest and packaging metadata
- `build/signing/` for cross-platform signing runbooks and non-secret templates

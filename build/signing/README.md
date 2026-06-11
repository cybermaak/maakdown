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

The authoritative release runbook is **[`docs/RELEASING.md`](../../docs/RELEASING.md)**.
macOS is signed + notarized locally via `scripts/release-mac.sh`; Windows/Linux
build unsigned in CI.

## macOS Release Inputs

In `.env` (gitignored) — never in CI:

- `MAAKDOWN_MACOS_CODESIGN_IDENTITY` — Developer ID Application identity
- `MAAKDOWN_NOTARY_PROFILE` — keychain profile from `xcrun notarytool store-credentials`
- `MAAKDOWN_MACOS_ENTITLEMENTS` — optional entitlements override

GitHub publishing reuses the `gh` CLI login; no token is stored.

## Windows Release Inputs (future)

Not active until a certificate is available; builds are unsigned until then.

- `MAAKDOWN_WINDOWS_CERT_PATH`
- `MAAKDOWN_WINDOWS_CERT_PASSWORD`
- `MAAKDOWN_WINDOWS_TIMESTAMP_URL`

## Structure Decision

Signing metadata is separated by platform so future release automation can use:

- `build/darwin/` for macOS Info.plist and entitlements
- `build/windows/` for Windows app manifest and packaging metadata
- `build/signing/` for cross-platform signing runbooks and non-secret templates

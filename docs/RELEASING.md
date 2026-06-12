# Releasing Maakdown

A release is split by what can be signed:

| Platform | Built by | Signed? |
|---|---|---|
| **macOS** (arm64) | **You, locally** — `scripts/release-mac.sh` | Developer ID + notarized |
| **Windows** (x64) | CI (`.github/workflows/release.yml`) | Unsigned (SmartScreen warning) until a cert is available |
| **Linux** (x64) | CI | Unsigned (normal) |

Signing and notarization run **only on the maintainer's Mac**; the Developer ID
certificate and notarization credentials never leave the machine and never enter
CI. Both sides publish to the same GitHub Release for the tag.

---

## One-time setup

1. **Xcode command-line tools** — `xcode-select -p` returns a path (else
   `xcode-select --install`).
2. **Developer ID Application certificate** in the login keychain:
   ```bash
   security find-identity -v -p codesigning | grep "Developer ID Application"
   ```
   Record the full identity string.
3. **Notary keychain profile** — create once (reusable across projects). Use an
   App Store Connect API key (create at
   https://appstoreconnect.apple.com/access/integrations/api, role *Developer*;
   download the `AuthKey_XXXX.p8` once):
   ```bash
   xcrun notarytool store-credentials cybermaak-notary \
     --key /path/to/AuthKey_XXXXXXXXXX.p8 --key-id XXXXXXXXXX --issuer <issuer-uuid>
   ```
   or an Apple ID + app-specific password (https://appleid.apple.com):
   ```bash
   xcrun notarytool store-credentials cybermaak-notary \
     --apple-id "you@example.com" --team-id "TEAMID" --password "abcd-efgh-ijkl-mnop"
   ```
   The credentials stay in the keychain; only the profile *name* goes in `.env`.
4. **`gh` CLI logged in** with write access to the repo:
   ```bash
   gh auth status
   ```
5. **`.env`** — `cp .env.example .env` and fill in:
   ```bash
   MAAKDOWN_MACOS_CODESIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)"
   MAAKDOWN_NOTARY_PROFILE=cybermaak-notary
   ```
   `.env` is gitignored. GitHub publishing reuses your `gh` login — no token in `.env`.

---

## Cutting a release

1. **Verify** the tree is releasable:
   ```bash
   scripts/release-check.sh        # type/build/test + benchmark + UAT
   ```
2. **Tag and push** — this triggers CI to build the unsigned Windows + Linux
   artifacts and create the Release:
   ```bash
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```
3. **Build, sign, notarize, and publish macOS** locally:
   ```bash
   scripts/release-mac.sh vX.Y.Z
   ```
   This builds the arm64 app with the version injected, signs it with Developer
   ID under a hardened runtime, wraps it in a `.dmg`, notarizes (Apple notarizes
   the app inside the `.dmg`), staples the ticket to both the `.dmg` and the
   `.app`, verifies, packages a notarized `.zip`, and uploads both to the
   `vX.Y.Z` Release (creating it if CI hasn't yet). Run order with step 2 does
   not matter; whoever reaches the Release first creates it.

### Dry run (no publish)

Build, sign, notarize, and verify locally without touching GitHub:

```bash
scripts/release-mac.sh --no-publish vX.Y.Z
```

Artifacts land in `dist/`. Use any tag string for the filenames.

---

## Verifying a published build

Download the `.dmg` from the Release page and confirm Gatekeeper accepts it as
notarized:

```bash
# The mounted/installed app:
spctl --assess --type execute --verbose=4 /Applications/Maakdown.app
#   → accepted   source=Notarized Developer ID

xcrun stapler validate /Applications/Maakdown.app   # → The validate action worked!
codesign --verify --deep --strict --verbose=2 /Applications/Maakdown.app
```

The stapled ticket means Gatekeeper accepts the app **offline** — a fresh Mac
that has never seen the app opens it without the "unidentified developer" block.

---

## Troubleshooting

- **Notarization rejected** — `notarize-macos.sh` prints the notary log on
  failure. To re-fetch it:
  ```bash
  xcrun notarytool log <submission-id> --keychain-profile cybermaak-notary
  ```
  The most common cause is a bundle that isn't signed with a hardened runtime,
  or a missing entitlement (see below).
- **App crashes on launch after notarization** — the WebView/JS engine may need
  an extra hardened-runtime entitlement. Add
  `com.apple.security.cs.allow-unsigned-executable-memory` to
  `build/darwin/entitlements.plist` and re-run. (The current entitlements ship
  `allow-jit` + `disable-library-validation`, which is expected to suffice.)
- **"No Keychain password item found for profile"** even though you created it —
  newer `store-credentials` defaults to the data-protection ("Local Items")
  keychain, which can become unreadable across sessions. Re-store the profile
  explicitly into the file-based login keychain (reads then work with no extra
  flags):
  ```bash
  xcrun notarytool store-credentials cybermaak-notary \
    --key /path/to/AuthKey_XXXX.p8 --key-id XXXXXXXXXX --issuer <issuer-uuid> \
    --keychain ~/Library/Keychains/login.keychain-db
  ```
- **Multiple Developer ID identities** — pin the exact one in
  `MAAKDOWN_MACOS_CODESIGN_IDENTITY`.
- **`spctl` says "rejected"** — the ticket isn't stapled or notarization didn't
  finish; re-run `scripts/release-mac.sh` (it is idempotent for a given tag).

---

## Windows signing (future)

When a code-signing certificate is available, set `MAAKDOWN_WINDOWS_CERT_PATH`,
`MAAKDOWN_WINDOWS_CERT_PASSWORD`, and `MAAKDOWN_WINDOWS_TIMESTAMP_URL`, then sign
the CI-built `.exe` on a Windows machine with
`scripts/sign-windows.ps1 -ArtifactPath <artifact>` and re-upload to the
Release. Until then, Windows downloads are unsigned and show a SmartScreen
warning.

# Releasing Maakdown

This is the canonical release guide. Use `docs/release-checklist.md` as the
release gate and `docs/release-site-refresh.md` for the required public-site
refresh after a feature release is published.

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

## Release sequence

Use this order for every public feature release:

1. Confirm scope, version, previous release tag, and release blockers.
2. Run the release gate and verify the release commit on all supported
   platforms.
3. Draft release notes in the format below before creating the tag.
4. Push the release commit and version tag.
5. Monitor the Release workflow and native screenshot workflow.
6. Build, sign, notarize, and upload the macOS artifacts locally.
7. Apply the final release notes and verify all published assets.
8. Execute `docs/release-site-refresh.md`, push that presentation update, and
   verify GitHub Pages.
9. Record the release, validation links, and any accepted limitations in
   `DEV_CONTEXT.md` and the task trackers.

Do not combine a version tag with unverified product changes. Do not publish
generated binaries, signing logs, or credentials in git.

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

## 1. Prepare the release

Identify the release and comparison range:

```bash
version=vX.Y.Z
previous=vA.B.C
git status --short --branch
git log --oneline "${previous}..HEAD"
```

Before tagging:

- Confirm `main` contains the intended release commit and no unrelated local
  changes are included.
- Confirm `docs/task-tracker.md`,
  `docs/next-release-task-tracker.md`, and `DEV_CONTEXT.md` describe the actual
  release state and accepted limitations.
- Complete `docs/release-checklist.md`.
- Run the full local gate:

```bash
scripts/release-check.sh
```

Review the successful CI, UAT, native screenshot, benchmark, and release-smoke
evidence for the exact release commit. Inspect representative screenshots for
tables, diagrams, formulas, code, reader chrome, light/dark themes, and
multi-tab state.

---

## 2. Write release notes

Draft the notes before tagging so the final copy is ready even if CI creates the
GitHub Release first with generated placeholder notes.

Use the first public release as the structural reference and the latest release
for the expanded feature-release form. The required format is:

1. **Opening paragraph:** release name and one concise user-facing summary.
   Restate Maakdown's local-first position when relevant.
2. **Homepage:** one standalone homepage link.
3. **Downloads:** a three-row table in this order:
   macOS Apple silicon, Linux x64, Windows x64. Use exact filenames and state
   signing, notarization, runtime requirements, and SmartScreen limitations
   accurately.
4. **Highlights:** five to eight user-facing bullets grouped by outcomes, not
   internal phase or task numbers.
5. **Notable Changes Since `<previous tag>`:** short explanatory bullets for
   substantial behavior or architecture changes.
6. **Notes:** unsigned-platform limitations, compatibility warnings, or other
   release-specific caveats.
7. **Full Changelog:** a compare link from the previous public release to the
   new tag.

Use this template:

```markdown
Maakdown vX.Y.Z is the <Release Name> release: <one-sentence user-facing
summary>. It keeps the same local-first stance: no account, no telemetry.

🏠 **Homepage:** https://cybermaak.dev/maakdown/

## Downloads

| Platform | File | Notes |
|---|---|---|
| **macOS** (Apple silicon) | `Maakdown-vX.Y.Z-macos-arm64.dmg` (or `.zip`) | ✅ **Signed & notarized** — opens without Gatekeeper warnings, even offline |
| **Linux** (x64) | `Maakdown-vX.Y.Z-linux-x64.tar.gz` | Unsigned. Requires WebKit2GTK |
| **Windows** (x64) | `Maakdown-vX.Y.Z-windows-x64.zip` | Unsigned. Windows may show a SmartScreen warning |

## Highlights

- <User-facing capability or improvement>

## Notable Changes Since vA.B.C

- <Important behavior or architecture change in plain language>

## Notes

- <Signing, compatibility, or known limitation>

**Full Changelog:** https://github.com/cybermaak/maakdown/compare/vA.B.C...vX.Y.Z
```

Release-note rules:

- Verify every claim against the release commit and published artifacts.
- Do not mention unreleased work, internal tracker identifiers, or a feature
  that was removed before release.
- Keep platform signing language aligned with the actual files.
- Use exact versioned filenames.
- Prefer concise outcome-oriented prose over a raw commit list.
- Treat generated GitHub notes as a placeholder, not the final release notes.

Store a temporary notes file under ignored `tmp/`, then apply it after the
Release exists:

```bash
gh release edit "$version" \
  --repo cybermaak/maakdown \
  --title "Maakdown $version" \
  --notes-file "tmp/release-notes-${version}.md"
```

Read the release back with `gh release view` and verify its title, body, URL,
and assets.

---

## 3. Tag and publish artifacts

Push the verified release commit before the tag, then create an annotated tag
at that exact commit:

```bash
git push origin main
git tag -a "$version" -m "Maakdown $version"
git push origin "$version"
```

The tag triggers `.github/workflows/release.yml`, which builds and uploads the
unsigned Windows and Linux artifacts and creates or updates the GitHub Release.

Build, sign, notarize, and publish macOS locally:

```bash
scripts/release-mac.sh "$version"
```

This builds the arm64 app with the version injected, signs it with Developer ID
under a hardened runtime, notarizes and staples the app and DMG, verifies the
result, packages a notarized ZIP, and uploads both macOS files to the same
GitHub Release.

### Dry run (no publish)

Build, sign, notarize, and verify locally without touching GitHub:

```bash
scripts/release-mac.sh --no-publish vX.Y.Z
```

Artifacts land in `dist/`. Use any tag string for the filenames.

---

## 4. Verify the published release

Confirm the tag and release target the intended commit:

```bash
git rev-parse "$version^{commit}"
gh release view "$version" --repo cybermaak/maakdown \
  --json name,tagName,url,body,assets
```

The final asset set must include:

- `Maakdown-vX.Y.Z-macos-arm64.dmg`
- `Maakdown-vX.Y.Z-macos-arm64.zip`
- `Maakdown-vX.Y.Z-linux-x64.tar.gz`
- `Maakdown-vX.Y.Z-windows-x64.zip`

Confirm the Release workflow, CI, UAT, and native rendering screenshot runs for
the release commit are successful. Download and inspect the final artifacts,
not only intermediate workflow artifacts.

For macOS, download the published `.dmg` and confirm Gatekeeper accepts the
installed app as notarized:

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

## 5. Refresh README and landing site

After the artifacts and release notes are final, execute
`docs/release-site-refresh.md` in full. This is required for public feature
releases and includes:

- regenerating README screenshots and the animated demo from the release source
- adopting reviewed native screenshots for release-specific app states
- updating README and `site/index.html` version, copy, captions, and metadata
- regenerating `site/social-preview.png`
- verifying the static site at desktop and narrow widths
- committing and pushing the presentation update
- monitoring `.github/workflows/pages.yml`
- inspecting `https://cybermaak.dev/maakdown/` after deployment

The Pages refresh is part of release completion, not an optional marketing
follow-up. A documentation-only or emergency rebuild may skip new media when
the user-facing app surface is unchanged; record that exception in
`DEV_CONTEXT.md`.

---

## 6. Close the release

Record:

- release tag, commit, and URL
- published artifact names and checksums
- CI, UAT, native screenshot, Release, and Pages run URLs
- macOS signing/notarization verification
- accepted Windows/Linux signing or runtime limitations
- completion of the release-site refresh

Update `DEV_CONTEXT.md`, `docs/task-tracker.md`, and any active release tracker.
Do not mark the release complete while required runs are failing or the public
release page/site contains stale content.

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

# Release Checklist

This checklist is the P7 release gate. Signing commands require credentials that
remain outside the repository.

## Build and artifact pipeline

- **Build (per platform):** `wails build` produces the native app under
  `build/bin/`. Cross-platform builds run in CI (one runner per OS); a single
  machine cannot build all three.
- **Package:** `scripts/package-artifact.sh` zips/tars `build/bin/` into `dist/`
  (`Maakdown-<version>-macos-<arch>.zip`, `…-windows-….zip`,
  `…-linux-….tar.gz`). Used locally and by CI.
- **Publish (CI):** the `Release` workflow (`.github/workflows/release.yml`)
  triggers on a `v*` tag, builds macOS/Windows/Linux, packages each, and
  attaches the archives to a GitHub Release. `workflow_dispatch` does a dry run
  (workflow artifacts only, no Release).
- **Verify only (CI):** the `Cross-platform release smoke` workflow
  (`workflow_dispatch`) builds and uploads short-lived artifacts without
  publishing a Release.
- Release artifacts are **unsigned**; signing/notarization is the credentialed
  step below and is applied by the release operator.

To cut a release: tag the commit (`git tag vX.Y.Z && git push origin vX.Y.Z`)
and the workflow publishes the GitHub Release. Validate workflow changes on the
`ci/sandbox` ref before relying on them.

## Preflight

- Confirm `docs/task-tracker.md` has no release blockers.
- Confirm `DEV_CONTEXT.md` records current decisions and verification commands.
- Run `scripts/release-check.sh`.
- Review `output/performance/reader-benchmark.json`.
- Confirm the large fixture keeps mounted document blocks bounded.
- Run Wails production builds on each target operating system.
- Record platform smoke-test results and unresolved blockers.

## macOS

- Confirm signing identity is available outside git.
- Build with hardened runtime settings.
- Sign app bundle.
- Notarize with stored notary profile.
- Staple notarization ticket.
- Verify Gatekeeper assessment.
- Launch the stapled app on a clean macOS account.

## Windows

- Confirm certificate path/password are provided through secrets.
- Build executable/installer.
- Sign with timestamp server.
- Verify signature.
- Launch the signed installer and application on a clean Windows VM.

## Linux

- Build on the oldest supported distribution image.
- Confirm WebKitGTK runtime dependencies are documented by the package.
- Open all named performance fixtures.
- Verify external links and loopback-served images.
- Launch Maakdown once and confirm
  `~/.local/share/applications/com.maak.maakdown.desktop` exists, or use
  `$XDG_DATA_HOME/applications/` when `XDG_DATA_HOME` is configured.
- Confirm the desktop entry contains the installed executable path and
  `MimeType=text/markdown;`, then verify Maakdown appears in the file manager's
  **Open With** list without changing the current default.
- In Maakdown Settings, choose **Set as default for Markdown**, then verify:
  `xdg-mime query default text/markdown` prints
  `com.maak.maakdown.desktop`.
- Double-click a Markdown file with Maakdown closed, then another while it is
  running; confirm both open as tabs in the single application window.
- Exercise native drag/drop and system print/PDF once in a logged-in Linux
  desktop session; hosted Xvfb captures do not verify those interactions.

## Postflight

- Store release artifacts outside the repo or in an approved release system.
- Do not commit generated binaries or signing logs.
- Run the `Cross-platform release smoke` workflow for the release commit and
  attach its macOS, Windows, and Linux result URLs to the release record.

# Release Checklist

This checklist is the P7 release gate. Signing commands require credentials that
remain outside the repository.

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

## Postflight

- Store release artifacts outside the repo or in an approved release system.
- Do not commit generated binaries or signing logs.
- Run the `Cross-platform release smoke` workflow for the release commit and
  attach its macOS, Windows, and Linux result URLs to the release record.

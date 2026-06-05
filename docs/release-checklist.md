# Release Checklist

This checklist is a placeholder for P7 release hardening.

## Preflight

- Confirm `docs/task-tracker.md` has no release blockers.
- Confirm `DEV_CONTEXT.md` records current decisions and verification commands.
- Run frontend checks and build.
- Run Go tests.
- Run Wails build for target platform.
- Run security fixtures.
- Run performance fixtures.

## macOS

- Confirm signing identity is available outside git.
- Build with hardened runtime settings.
- Sign app bundle.
- Notarize with stored notary profile.
- Staple notarization ticket.
- Verify Gatekeeper assessment.

## Windows

- Confirm certificate path/password are provided through secrets.
- Build executable/installer.
- Sign with timestamp server.
- Verify signature.

## Postflight

- Store release artifacts outside the repo or in an approved release system.
- Do not commit generated binaries or signing logs.

# Build Assets

Wails and platform packaging assets live here.

- `darwin/`: macOS plist/entitlements/signing-safe metadata.
- `windows/`: Windows app manifest and signing-safe metadata.
- `signing/`: cross-platform signing notes and non-secret templates.
- `bin/`: generated build outputs, ignored by git.

Do not commit generated signed artifacts or signing secrets.

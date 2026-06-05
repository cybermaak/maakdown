# Windows Build Metadata

This directory contains signing-safe Windows packaging templates.

Do not commit `.pfx`, `.p12`, private keys, signed installers, timestamp credentials, or generated release binaries.

Expected secret inputs for a future release workflow:

- `MAAKDOWN_WINDOWS_CERT_PATH`
- `MAAKDOWN_WINDOWS_CERT_PASSWORD`
- `MAAKDOWN_WINDOWS_TIMESTAMP_URL`

The app manifest keeps the app at normal user privileges (`asInvoker`) and opts into DPI awareness for desktop rendering.

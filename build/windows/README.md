# Windows Build Metadata

This directory contains signing-safe Windows packaging templates.

Do not commit `.pfx`, `.p12`, private keys, signed installers, timestamp credentials, or generated release binaries.

Expected secret inputs for a future release workflow:

- `MAAKDOWN_WINDOWS_CERT_PATH`
- `MAAKDOWN_WINDOWS_CERT_PASSWORD`
- `MAAKDOWN_WINDOWS_TIMESTAMP_URL`

The app manifest keeps the app at normal user privileges (`asInvoker`) and opts into DPI awareness for desktop rendering.

`markdown.ico` is the derived Markdown document icon used for Windows file
associations. The application embeds this ICO and writes it to
`%APPDATA%\Maakdown\markdown.ico` before registering the `Maakdown.md`
ProgId `DefaultIcon`, so installers do not need to copy a loose icon file next
to the executable. The source PNG is `docs/design-system/markdown-file-icon.png`.

## Release Procedure

1. Build on Windows with `wails build -platform windows/amd64`.
2. Package the executable with the approved installer tool.
3. Set certificate path, password, and RFC 3161 timestamp URL through secrets.
4. Run `scripts/sign-windows.ps1 -ArtifactPath <artifact>`.
5. Verify the signature on a clean Windows system and run the SmartScreen smoke test.
6. Publish checksums and retain symbols outside git.

Sign both the application executable and installer when they are separate
artifacts. Timestamping is required so the signature survives certificate
expiration.

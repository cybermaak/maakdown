# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Important

1. Follow `AGENTS.md` first. This file adds Claude-specific context and command hints.
2. The `docs/` directory contains the project requirements, implementation plan, review consensus, and task tracker.
3. `DEV_CONTEXT.md` tracks current implementation decisions and may supersede older plan details when it records an intentional deviation.
4. Keep signing secrets out of git. Only templates, entitlements, manifests, and signing documentation belong in the repository.

## Commands

```bash
# Frontend dependency install
cd frontend
npm install

# Frontend type/check pass
npm run check

# Frontend production build
npm run build

# Backend tests, once Go is installed
go test ./...

# Wails dev/build, once Go and Wails are installed
wails dev
wails build
```

Current local blocker observed during scaffold: `go` and `wails` were not on `PATH`. Frontend tooling through Node/npm is available.

## Architecture Summary

Maakdown is a Wails desktop Markdown viewer:

- Go backend: file open/read, parent-directory watcher, tokenized loopback asset server, external link routing, config, vault index.
- Svelte/TypeScript frontend: document shell, stores, IPC wrappers, virtualized reader UI.
- Framework-agnostic `frontend/src/core/`: Markdown pipeline, document model, virtualized navigation, highlighters, Mermaid, KaTeX, sanitization, assets, theme, workers.

Core constraints:

- No Wails v3 in v1.
- No Shiki Oniguruma/WASM in the v1 product path.
- No raw `file://` image loading.
- No image byte/base64 transfer over Wails IPC for normal document rendering.
- No native hash scrolling in document content; use the virtualizer-aware navigation model.
- No generated `wailsjs/` imports outside `frontend/src/ipc/`.

## Verification Guidance

Use the cheapest useful verification:

- Tree/docs changes: `find`, `rg`, `git status`
- Frontend code: `npm run check`, then `npm run build`
- Go code: `go test ./...`
- App packaging: `wails build`

When Go/Wails are missing, record that blocker in `DEV_CONTEXT.md` and verify what can be verified locally.

## UI Verification

This app is a desktop WebView UI. For future UI changes:

1. Prefer automated tests and frontend build/type checks first.
2. Use Playwright for browser-level checks of frontend behavior when the view can run outside Wails.
3. Use Wails/manual app screenshots only when WebView shell behavior or platform integration is the thing being verified.
4. Keep screenshot use sparse; prefer textual DOM/accessibility snapshots where possible.

## Signing Notes

macOS and Windows signing should be designed as first-class release concerns:

- Keep `build/darwin/` for macOS plist/entitlements templates.
- Keep `build/windows/` for manifests and Windows packaging metadata.
- Keep `build/signing/` for signing documentation and non-secret templates.
- Store certificate identities, keychain/profile names, Windows certificate paths, timestamp URLs, and notarization credentials as environment variables or CI secrets.
- Do not commit `.p12`, `.pfx`, `.key`, `.pem`, provisioning profiles, signed binaries, installers, or notarization logs.

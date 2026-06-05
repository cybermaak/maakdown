# DEV_CONTEXT

## Project Summary

Maakdown is a cross-platform desktop Markdown viewer for technical documents and personal notes. The approved v1 stack is Wails v2.11.x, Go, Svelte 5.x, Vite 8.x, and TypeScript.

The app is a viewer, not an editor. It renders CommonMark/GFM, code, KaTeX math, Mermaid diagrams, frontmatter, callouts, local images, anchors/footnotes, and later notes-style wikilinks.

## Current Phase

**Phase:** P1-P3 implementation  
**Active focus:** safe base renderer, navigation model, trusted local assets, and file watcher.

## Major Files And Directories

- `docs/markdown-viewer-design-spec.md`: approved product and technical spec.
- `docs/markdown-viewer-implementation-plan.md`: approved implementation plan.
- `docs/review-consensus.md`: Claude/Gemini/Codex review consensus.
- `docs/task-tracker.md`: project/progress tracker.
- `AGENTS.md`: repo-level agent operating rules.
- `CLAUDE.md`: Claude-specific working context.
- `internal/`: Go backend service packages.
- `frontend/`: Svelte/Vite frontend.
- `build/darwin/`, `build/windows/`, `build/signing/`: signing and packaging templates/documentation; secrets excluded.
- `.github/workflows/ci.yml`: initial CI workflow for frontend and Go package checks.

## Decisions

- Pin Wails v2.11.x for v1; do not use Wails v3.
- Pin Svelte 5.x and Vite 8.x.
- Use highlight.js as the default highlighter.
- Keep Shiki optional and use its JavaScript RegExp engine only.
- Use a tokenized loopback Go asset server for local Markdown images; do not send normal image payloads over Wails IPC.
- Treat generated Wails bindings as generated; frontend code calls through `frontend/src/ipc/`.
- Use virtualizer-aware navigation for TOC, anchors, footnotes, and scroll-spy.

## Planned Tasks

See `docs/task-tracker.md`.

## Completed Tasks

- 2026-06-05: Created approved v0.3 spec and implementation plan in `docs/`.
- 2026-06-05: Re-reviewed revised docs with Claude and Gemini; final consensus was approve.
- 2026-06-05: Created P0 scaffold, repo guidance, project tracker, signing-safe folders, frontend shell, and Go service stubs.
- 2026-06-05: Initialized git repository.
- 2026-06-05: Installed frontend dependencies and verified `npm run check` plus `npm run build`.
- 2026-06-05: Created initial scaffold commit.
- 2026-06-05: Installed Go 1.26.4 and Wails CLI v2.11.0 locally.
- 2026-06-05: Generated Wails bindings and verified P0 with `scripts/verify.sh`.

## Verification Commands

```bash
node --version
npm --version
go version
$(go env GOPATH)/bin/wails version
cd frontend && npm install
cd frontend && npm run check
cd frontend && npm run build
go test ./...
scripts/verify.sh
```

## Current Verification Blockers

- The Wails CLI is installed at `$(go env GOPATH)/bin/wails`; it may not be on shell `PATH`. `scripts/verify.sh` resolves this automatically.

## Signing Context

The user plans to sign macOS and Windows builds using their own certificates. The repo should include signing-safe templates and documentation, but no certificates, private keys, provisioning profiles, notarization credentials, or signed release artifacts.

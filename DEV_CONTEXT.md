# DEV_CONTEXT

## Project Summary

Maakdown is a cross-platform desktop Markdown viewer for technical documents and personal notes. The approved v1 stack is Wails v2.11.x, Go, Svelte 5.x, Vite 8.x, and TypeScript.

The app is a viewer, not an editor. It renders CommonMark/GFM, code, KaTeX math, Mermaid diagrams, frontmatter, callouts, local images, anchors/footnotes, and later notes-style wikilinks.

## Current Phase

**Phase:** P4 next
**Active focus:** rich rendering enhancements, starting with lazy code highlighting and theme propagation.

## Major Files And Directories

- `docs/markdown-viewer-design-spec.md`: approved product and technical spec.
- `docs/markdown-viewer-implementation-plan.md`: approved implementation plan.
- `docs/review-consensus.md`: Claude/Gemini/Codex review consensus.
- `docs/task-tracker.md`: project/progress tracker.
- `AGENTS.md`: repo-level agent operating rules.
- `CLAUDE.md`: Claude-specific working context.
- `internal/`: Go backend service packages.
- `internal/assetservice/`: trusted-root local image resolver and tokenized loopback asset server.
- `internal/watcher/`: parent-directory filesystem watcher with safe-save debounce.
- `frontend/`: Svelte/Vite frontend.
- `frontend/src/core/pipeline/`: unified Markdown parser, sanitizer integration, frontmatter/callout/index extraction, and parser tests.
- `frontend/src/core/navigation/`: anchor/link/scroll-spy helpers and navigation tests.
- `frontend/src/components/`: reader surface, table of contents, and metadata panel.
- `fixtures/`: deterministic Markdown evaluation documents and local fixture assets.
- `tools/generate-reader-evaluation-fixture.mjs`: regenerates the large reader evaluation dossier.
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
- Resolve Markdown images against a trusted root chosen by configured vault root, then git root, then document parent.
- Preserve reload position using the nearest active heading until the virtualizer-specific block restore lands.

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
- 2026-06-05: Implemented P1 safe base renderer with unified/GFM/frontmatter/math/callout parsing, sanitizer schema, document view, and metadata panel.
- 2026-06-05: Implemented P2 navigation model with heading/anchor indexes, TOC, internal link delegation, and scroll-spy helpers.
- 2026-06-05: Implemented P3 trusted local assets and watcher with loopback asset URLs, SVG safety policy, parent-directory safe-save watching, and reload restore.
- 2026-06-05: Added a deterministic 7,727-line reader evaluation fixture, local architecture asset, generator, and development-only browser QA loader.

## Verification Commands

```bash
node --version
npm --version
go version
$(go env GOPATH)/bin/wails version
cd frontend && npm install
cd frontend && npm run check
cd frontend && npm run build
cd frontend && npm run test
go test ./...
scripts/verify.sh
```

## Current Verification Blockers

- None.

## Verification Notes

- `scripts/verify.sh` currently passes frontend tests, Svelte checks, frontend build, Go tests, and Wails build.
- Vite reports the main JavaScript chunk is above 500 kB after the parser stack was added. This is non-blocking for P1-P3 and should be addressed during the worker/lazy-enhancement and P4/P5 performance work.
- The large reader fixture currently mounts 1,870 document blocks and 571 TOC buttons. Three browser QA loads reached the document heading in 1,073 ms, 694 ms, and 743 ms.
- The fixture run confirmed open P4/P5 work: Mermaid is still raw source, code is not highlighted, math styling/output is incomplete, and the DOM is not virtualized.
- The fixture also exposed a P2 navigation defect: a late TOC target can land on an earlier scenario, and the active TOC entry is not kept visible.

## Signing Context

The user plans to sign macOS and Windows builds using their own certificates. The repo should include signing-safe templates and documentation, but no certificates, private keys, provisioning profiles, notarization credentials, or signed release artifacts.

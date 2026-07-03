# Markdown Viewer Review Consensus

**Date:** 2026-06-05  
**Reviewed artifacts:**

- `docs/markdown-viewer-design-spec.md`
- `docs/markdown-viewer-implementation-plan.md`

## Reviewers

- Codex
- Claude CLI
- Gemini via `agy`

## Final Consensus

**Approve.**

The revised artifacts are ready to proceed into implementation planning/scaffolding. The second review round returned `approve-with-changes`; the requested changes were applied. The final consensus check returned approval from both Claude and Gemini.

## Resolved Review Issues

- Virtualized anchors, TOC, footnotes, and scroll-spy now use an explicit `anchorIndex` and virtualizer-aware navigation model.
- Dynamic-height anchor scrolling now specifies a stabilization loop rather than a one-shot estimated offset.
- Parser worker boundaries are explicit: Wails bindings are not called from workers, vault indexes are transferred only when changed, and sanitized block HTML is returned from the worker.
- Local images no longer transfer byte/base64 payloads over Wails IPC. The plan uses a loopback-only, tokenized Go asset server with trusted-root enforcement.
- Trusted-root precedence is now configured vault/folder, then Git worktree root, then document parent directory.
- File watching now covers parent-directory safe-save/rename behavior with debounce and position restore.
- Platform choice is concrete: Wails v2.12.x, Svelte 5.x, Vite 8.x, no Wails v3 in v1.
- Shiki's Oniguruma/WASM path is excluded from v1; optional Shiki evaluation uses the JavaScript RegExp engine only.
- Performance targets are tied to named fixtures and split by platform.

## Technical Choice For Platform Risk

No dedicated platform spike is required before P0. The project should proceed with the pinned v1 stack and constraints:

- Wails v2.12.x, not Wails v3 alpha.
- Svelte 5.x and Vite 8.x for the frontend.
- Do not use Wails v2 dynamic `AssetsHandler` for Markdown document assets.
- Use the tokenized loopback asset server for local images.
- Use Shiki with its JavaScript RegExp engine as the default highlighter.
- Keep highlight.js as a command-palette-selectable fallback.

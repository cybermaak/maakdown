# Maakdown

Maakdown is a cross-platform desktop Markdown viewer for technical documents and personal notes.

The approved product/architecture docs live in `docs/`:

- `docs/markdown-viewer-design-spec.md`
- `docs/markdown-viewer-implementation-plan.md`
- `docs/task-tracker.md`
- `docs/review-consensus.md`

## Stack

- Wails v2.11.x
- Go backend
- Svelte 5.x + TypeScript + Vite 8.x frontend
- unified/remark/rehype Markdown pipeline
- KaTeX, highlight.js, optional Shiki JS RegExp engine, Mermaid

## Current State

This repository is currently scaffolded from the implementation plan. Most subsystems are structural stubs and should be implemented according to `docs/task-tracker.md`.

## Signing

The project reserves signing-related structure under `build/darwin/`, `build/windows/`, and `build/signing/`. Certificates, private keys, provisioning profiles, notarization credentials, and Windows signing credentials must never be committed.

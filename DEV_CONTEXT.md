# DEV_CONTEXT

## Project Summary

Maakdown is a cross-platform desktop Markdown viewer for technical documents and personal notes. The approved v1 stack is Wails v2.11.x, Go, Svelte 5.x, Vite 8.x, and TypeScript.

The app is a viewer, not an editor. It renders CommonMark/GFM, code, KaTeX math, Mermaid diagrams, frontmatter, callouts, local images, anchors/footnotes, and later notes-style wikilinks.

## Current Phase

**Phase:** P10 and P11 in progress; P7.5 remains externally blocked
**Active focus:** complete navigation history, copy and diagram inspection,
resizable responsive panels, guarded print cancellation, and remaining
accessibility announcements.

## Major Files And Directories

- `docs/markdown-viewer-design-spec.md`: approved product and technical spec.
- `docs/markdown-viewer-implementation-plan.md`: approved implementation plan.
- `docs/review-consensus.md`: Claude/Gemini/Codex review consensus.
- `docs/task-tracker.md`: project/progress tracker.
- `docs/design-system/`: reviewed mock, design-system references, adoption
  rules, screenshots, token exports, component contracts, and review notes.
- `AGENTS.md`: repo-level agent operating rules.
- `CLAUDE.md`: Claude-specific working context.
- `internal/`: Go backend service packages.
- `internal/assetservice/`: trusted-root local image resolver and tokenized loopback asset server.
- `internal/watcher/`: parent-directory filesystem watcher with safe-save debounce.
- `internal/vault/`: trusted-root Markdown note index for wikilink resolution.
- `frontend/`: Svelte/Vite frontend.
- `frontend/src/core/pipeline/`: unified Markdown parser, sanitizer integration, frontmatter/callout/index extraction, and parser tests.
- `frontend/src/core/navigation/`: anchor/link/scroll-spy helpers and navigation tests.
- `frontend/src/core/enhancement/`: progressive code and Mermaid enhancement scheduling.
- `frontend/src/core/virtualizer/`: dynamic-height block virtualizer.
- `frontend/src/core/workers/`: parser worker and browser-facing worker client.
- `frontend/src/core/workspace/`: tab lifecycle, canonical identity, recents,
  durable session projection, and workspace tests.
- `frontend/src/design-system/`: production Svelte primitives and deterministic gallery.
- `frontend/src/components/`: reader surface, table of contents, and metadata panel.
- `fixtures/`: deterministic Markdown evaluation documents and local fixture assets.
- `tools/generate-reader-evaluation-fixture.mjs`: regenerates the large reader evaluation dossier.
- `frontend/scripts/benchmark-reader.mjs`: Chromium benchmark for parser,
  virtualizer, navigation, and rich enhancements.
- `build/darwin/`, `build/windows/`, `build/signing/`: signing and packaging templates/documentation; secrets excluded.
- `.github/workflows/ci.yml`: frontend, Go, Wails, and reader benchmark checks.
- `.github/workflows/release-smoke.yml`: manual unsigned packaging matrix for
  macOS, Windows, and Linux.

## Decisions

- Pin Wails v2.11.x for v1; do not use Wails v3.
- Pin Svelte 5.x and Vite 8.x.
- Use highlight.js as the default highlighter.
- Keep Shiki optional and use its JavaScript RegExp engine only.
- Load parser and enhancement-heavy dependencies outside the initial application
  chunk through the parser worker and dynamic imports.
- Use a tokenized loopback Go asset server for local Markdown images; do not send normal image payloads over Wails IPC.
- Treat generated Wails bindings as generated; frontend code calls through `frontend/src/ipc/`.
- Use virtualizer-aware navigation for TOC, anchors, footnotes, and scroll-spy.
- Resolve Markdown images against a trusted root chosen by configured vault root, then git root, then document parent.
- Preserve reload position using the nearest active heading until the virtualizer-specific block restore lands.
- Virtualize parsed block records with measured heights, overscan, and multi-pass
  anchor correction.
- Configure Mermaid with strict security and render failures as inert reader
  error blocks.
- Build the vault index in Go and render only indexed wikilinks as navigable.
- Use the reviewed Maakdown design system as the visual source of truth from P8
  onward: warm paper/ink themes, semantic tokens, restrained blue interaction
  accent, hairline borders, Inter, JetBrains Mono, and minimal motion.
- Implement design-system primitives natively in Svelte; the exported React
  prototype is reference-only.
- Use a pinned local `@lucide/svelte` package; do not load production icons or
  UI dependencies from a CDN.
- Use a two-row toolbar/tab composition, visible watch states, semantic
  metadata badges/tags, unified command palette, and approved empty state.
- Treat the square `M` mark as provisional and replaceable.
- Load licensed, weight-specific Inter and JetBrains Mono assets locally through
  pinned Fontsource packages; do not use the duplicated prototype font exports.
- Store versioned settings/session state under the OS application-data directory
  using an fsynced temporary file followed by atomic rename.
- Use canonical filesystem paths as tab identities and watcher registration keys.
- Keep inactive tab models in memory but mount and enhance only the active tab.
- Use highlight.js as the production default without exposing engine selection
  in normal chrome; Shiki remains a development/evaluation setting.
- Theme rendered Markdown through a dedicated semantic reader contract. It owns
  prose, headings, links, syntax, selection, and Mermaid palettes independently
  from application chrome and supports future user-selectable themes.
- Compute search totals over the full document model while marking only mounted blocks.
- Route human-readable dates, sizes, counts, and durations through one formatting layer.
- Treat print expansion as cancellable, memory-sensitive work with guaranteed cleanup.
- Keep tested multi-path watchers for all open documents; the supplemental
  review's active-only watcher staging suggestion is superseded by completed P9.

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
- 2026-06-05: Implemented P4 progressive highlight.js/Shiki highlighting,
  Mermaid rendering, KaTeX styling, theme propagation, and enhancement timing.
- 2026-06-05: Implemented P5 dynamic-height block virtualization, measurement
  caching, bounded rendering, scroll-spy integration, and stabilized anchors.
- 2026-06-05: Corrected parser heading-to-block indexing for documents with
  prose before headings.
- 2026-06-05: Implemented P6 vault indexing and resolved/unresolved wikilinks.
- 2026-06-05: Implemented P7 fixture corpus, Playwright performance harness,
  signing-safe scripts/runbooks, release checks, and cross-platform smoke CI.
- 2026-06-05: Reopened the 10,726-line evaluation dossier through the Wails
  development bridge and visually verified Mermaid, KaTeX, highlight.js, Shiki,
  themes, metadata, TOC state, and late-anchor navigation.
- 2026-06-06: Reviewed the exported UX mock and design system, preserved the
  relevant handoff artifacts under `docs/design-system/`, updated the product
  and implementation specs to v0.5, and inserted P8 as the immediate design
  foundation phase before P9-P11 feature work.
- 2026-06-06: Completed P8 with semantic tokens, local Inter/JetBrains Mono,
  `@lucide/svelte`, production controls, migrated reader styling, a deterministic
  component gallery, and CI visual-smoke screenshots.
- 2026-06-06: Completed P9 with tabbed workspace state, canonical-path
  deduplication, close/reopen/cycle behavior, multi-document watchers, atomic
  session/config persistence, session restoration, recents, native drops and
  menus, keyboard commands, active titles, and active-tab-only rendering.
- 2026-06-06: Accepted the supplemental Maakdown Design & Product Review,
  preserved it under `docs/design-system/reviews/`, and updated specification
  v0.6, the implementation plan, and P10/P11 tracker work for toolbar cleanup,
  formatting, errors, command-palette sequencing, truthful search counts,
  guarded print expansion, accessibility, and multi-tab performance gates.
- 2026-06-06: Began P10/P11 with the semantic reader theme, full-model
  virtualized search, command palette, native print/PDF expansion, persistent
  typography/measure/focus controls, metadata formatting, responsive collapse,
  reduced-motion/high-contrast rules, and native menu parity.

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
cd frontend && npm run benchmark
go test ./...
scripts/verify.sh
scripts/release-check.sh
```

## Current Verification Blockers

- P7.5 requires Windows and Linux runners plus the user's external macOS and
  Windows signing credentials. The workflow and scripts are implemented, but
  those external checks cannot be completed in this local macOS session.

## Verification Notes

- The current P10/P11 slice passes zero-warning Svelte checks, 17 frontend
  tests, the frontend production build, and all Go tests.
- `scripts/verify.sh` previously passed 15 frontend tests, Svelte checks, frontend build, Go
  tests, and a production Wails build.
- The initial application chunk is approximately 213 kB. Parser, Mermaid, Shiki,
  and language payloads remain in worker or lazy chunks; Vite still warns about
  some optional chunks above 500 kB.
- The macOS Chromium baseline is 641 ms for the small fixture, 226 ms for the
  medium fixture, and 1,318 ms for the 10,726-line fixture.
- The P9 large fixture kept 40 blocks mounted in the benchmark and 12 blocks near
  the final visual navigation target.
- Final-anchor error measured 0.34 px after the P9 workspace migration.

## Signing Context

The user plans to sign macOS and Windows builds using their own certificates. The repo should include signing-safe templates and documentation, but no certificates, private keys, provisioning profiles, notarization credentials, or signed release artifacts.

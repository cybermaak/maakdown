# Stability And Maintainability Proposal

**Date:** 2026-07-02
**Status:** Proposal
**Scope:** Code-design improvements for stability and maintainability, based on recent bug-fix history, current reader architecture, and the approved docs in `docs/`.

## Executive Summary

Maakdown has strong verification coverage, and most recent fixes were narrow and well-tested. The pattern behind those fixes is still clear: unrelated bug classes repeatedly land in the same few integration-heavy files, especially `frontend/src/App.svelte`, `frontend/src/components/DocumentView.svelte`, `frontend/src/components/BlockView.svelte`, `frontend/src/core/pipeline/parseDocument.ts`, and `frontend/src/core/mermaid/mermaidManager.ts`.

The recommended direction is not a rewrite. Keep Wails v2, Svelte 5, the parser worker, the tokenized asset server, and the current product shape. The proposal is to extract explicit contracts around the unstable boundaries:

- Reader lifecycle and virtualized modes.
- Block rendering, enhancement, and DOM decoration.
- Parser metadata transfer from Markdown AST to document model.
- Platform and webview capability differences.
- Bug-class regression gates that track root causes, not just features.

The goal is to make future fixes smaller, less delicate, and easier to verify before native manual acceptance.

## Inputs Reviewed

- `AGENTS.md`
- `DEV_CONTEXT.md`
- `docs/task-tracker.md`
- `docs/markdown-viewer-design-spec.md`
- `docs/markdown-viewer-implementation-plan.md`
- Recent bug-fix commits found with `git log --grep`
- Current code in reader, parser, table, Mermaid, asset, workspace, and IPC paths
- Current uncommitted parser/source-label changes were read as context only; this proposal does not modify them.

## Bug-Fix Evidence

| Commit | Area | Root Cause Signal | Design Lesson |
|---|---|---|---|
| `ce199db` | Reader close lifecycle | Queued scroll events could fire while the surface detached. | Reader lifecycle needs explicit mounted/detached guards and testable state transitions. |
| `cd42512` | Virtualized images | Image resolution ran on document load, not block remount. | Mounted-range side effects need idempotent per-document services, not one-off component effects. |
| `951e93a` | Scroll stability | Svelte proxy identity churn, virtualizer rebuilds, and native scroll anchoring combined into oscillation. | Virtualizer rebuild criteria, measured-height ownership, and browser anchoring policy should be formal invariants. |
| `fe8c551` | Print preparation | Measurement updates collapsed the full-document print range back to visible blocks. | Reader modes such as normal and print need a single state machine with allowed transitions. |
| `903b79e`, `07ca710` | Mermaid on WebView2/RDP | Platform rendering rules, cache keys, font readiness, device scale, and post-mount SVG stabilization were spread across enhancement and block rendering. | Platform capabilities and rendered-SVG repair should be centralized behind named policies. |
| `853a2f1` | SVG asset security | String scanning treated safe namespace URIs as remote references. | Security policy should operate on classified SVG attributes/references where practical, with fixture tests for allowed and blocked cases. |
| `e00460b` | Linux file association | Desktop-entry validation passed, but GIO rejected the handler shape. | Native integration code needs platform acceptance tests that model the real consumer, not only syntax validity. |
| `b0a4a58` | Windows drag/drop | Wails resolves Windows drop paths through JS `OnFileDrop`, while WebKit-backed platforms need webview drops disabled. | Native event differences should live in a platform capability adapter, not scattered comments and conditionals. |
| `6a0a848`, `5788706` | Source/list/table number chrome | Visual line/row labels, parser source metadata, selection copy, and list geometry needed several linked fixes. | Source metadata and reader-only visual chrome need a documented model-to-DOM contract. |

## Current Design Pressure Points

### 1. `App.svelte` Is The Control Plane

`frontend/src/App.svelte` is about 900 lines and currently coordinates workspace state, document open/reload, session persistence, native events, drag/drop overlay state, search, history, print, selection copying, command dispatch, context menus, theme CSS variables, and initial restore. It already uses good pure helpers, but too much orchestration remains in one Svelte file.

This increases the chance that a fix for one workflow changes reactive subscriptions or event ordering for another workflow.

### 2. `DocumentView.svelte` Owns Too Many Reader Lifecycles

`DocumentView` handles virtualizer creation, scroll restoration, measured heights, viewport updates, image resolution, asset URL cache, print range expansion, enhancement completion tracking, table session state, diagram inspection, and link navigation.

The recent scroll, print, image-remount, and detached-surface fixes all changed this file. That is a strong signal that lifecycle ownership should be separated from rendering.

### 3. `BlockView.svelte` Mixes Rendering With DOM Mutation

`BlockView` routes block kinds, schedules enhancement, observes resize, marks search results, mutates code block display classes, applies list source-line labels, stabilizes Mermaid SVGs after mount, and delegates table rendering.

These operations are valid, but the contract is implicit. Each operation mutates the same rendered HTML subtree, so ordering and idempotency matter.

### 4. Parser Metadata Has Two Paths

The parser currently builds side-band `sourcePositions` and also annotates HAST nodes with `dataSource*` attributes. That is understandable because raw HTML can change the HAST shape, but it makes the source-line contract harder to reason about.

The document model should be the canonical owner of source metadata. DOM attributes should be treated as a transport/detail for rendered decoration, not as the primary source of truth.

### 5. Platform Behavior Is Encoded In Local Fixes

Mermaid, drag/drop, desktop file association, and native screenshots all have platform-specific behavior. Some of it is in Go, some in `@ipc`, some in components, and some in scripts.

That is normal for a desktop app, but the capability decisions need a single vocabulary. Otherwise each future platform fix will rediscover the same categories: OS, webview family, Wails behavior, device scale, font readiness, and native consumer quirks.

## Proposed Architecture Principles

1. Model data is canonical; DOM attributes are derived.
2. Reader modes are explicit: normal, restoring, printing, and detached.
3. DOM decorations are idempotent and isolated by concern.
4. Platform behavior is selected through capabilities, not ad hoc conditionals.
5. Bug fixes add regression gates at the same abstraction level as the root cause.
6. Refactors should be phased and behavior-preserving; do not bundle product redesign with stabilization.

## Proposed Workstreams

### A. Reader Runtime Controller

Create a small reader-runtime layer under `frontend/src/core/reader/`, for example:

- `readerController.ts`
- `readerVirtualization.ts`
- `readerImages.ts`
- `readerPrint.ts`

The controller should own:

- Current document identity and model revision.
- Virtualizer lifecycle and rebuild criteria.
- Mounted range updates.
- Mode transitions, especially normal to print and print to normal.
- Asset URL cache and failed-asset memoization.
- Table interaction state reset on model change.

`DocumentView.svelte` should become the view adapter: bind the surface, render the current range, and forward events to the controller.

Initial invariants to test:

- A scroll-position commit must not rebuild the virtualizer.
- Range updates are ignored while print mode owns the full-document range.
- Remounted images reuse cached asset URLs and failed assets are not retried on every range change.
- A detached surface drops queued scroll events without touching model state.
- Changing document path clears per-document caches and table state.

### B. Block Renderer And Decoration Adapters

Keep `BlockView.svelte` as the block router, but move mutable operations into named adapters:

- `searchDecoration.ts`
- `codeDisplayDecoration.ts`
- `sourceLineDecoration.ts`
- `mermaidMountPolicy.ts`

Each adapter should expose a small idempotent function that accepts a host element and plain options. Tests should run those functions against fixture DOM trees.

Examples:

- `applySearchMarks(host, query, options)` removes old marks and applies new marks without touching excluded nodes.
- `applyCodeDisplay(host, blockText, settings)` toggles line numbers/wrapping and can be tested without Svelte.
- `applyListSourceLineLabels(host, sourceGroups, settings)` uses model metadata first and DOM attributes only as fallback.
- `stabilizeMermaidAfterMount(host, capabilities)` handles platform-specific SVG repair after fonts/layout settle.

This reduces the chance that a new block feature changes search, copy, measurement, or Mermaid ordering by accident.

### C. Canonical Source Metadata Contract

Add an explicit source metadata type to the document model:

```ts
export interface SourceSpan {
  start: number;
  end: number;
  lines?: number[];
  itemGroups?: number[][];
}
```

Then evolve `Block` toward:

```ts
source?: SourceSpan;
```

`sourceStart`, `sourceEnd`, `sourceLines`, and `sourceLineGroups` can remain during migration, but new code should read from the canonical `source` field.

Implementation direction:

- Convert Markdown AST positions into `SourceSpan` as early as possible.
- Preserve source spans through raw anchors, task lists, GFM tables, footnotes, and frontmatter offsets.
- Use HAST `dataSource*` properties only as a transport fallback when a transform changes top-level nodes.
- Keep the sanitizer attribute allow-list tied to a single exported source-metadata constant.
- Add parser tests for raw HTML before lists, nested lists, task lists, frontmatter offsets, GFM tables, footnotes, and user anchors.

The long-term target is that source-line rendering never has to infer truth from rendered HTML when the document model already knows it.

### D. Platform Capability Adapter

Create a shared frontend capability module, for example `frontend/src/core/platform/capabilities.ts`, with a single resolved object:

```ts
export interface PlatformCapabilities {
  os: 'macos' | 'windows' | 'linux' | 'unknown';
  webview: 'wkwebview' | 'webview2' | 'webkitgtk' | 'browser';
  usesJsFileDropPathResolver: boolean;
  shouldDisableExternalWebviewDrop: boolean;
  mermaidHtmlLabels: boolean;
  mermaidNeedsSvgStabilization: boolean;
  mermaidUsesDeviceScaleSizing: boolean;
}
```

Use it from:

- `frontend/src/ipc/index.ts` for drop-path behavior.
- `frontend/src/App.svelte` or extracted native-event service for drag/drop overlay assumptions.
- `frontend/src/core/mermaid/mermaidManager.ts` for labels, sizing, and stabilization.
- Native smoke scripts and UAT helpers where platform assumptions are encoded.

For Go-side OS integration, mirror the same idea with small platform policy helpers and table tests.

This makes future native bugs easier to fix because the first question becomes: which capability is wrong or missing?

### E. Bug-Class Regression Matrix

Add a small maintained matrix, either in `docs/uat-traceability.md` or a new `docs/regression-matrix.md`, that maps bug classes to verification gates.

Suggested classes:

- Reader lifecycle and detached events.
- Virtualized range stability.
- Print mode full-document expansion.
- Local asset resolution and blocked asset retries.
- Parser source metadata alignment.
- Reader-only visual chrome excluded from copy.
- Mermaid rendering by platform/webview family.
- Native file open, drag/drop, and file association.

Each row should name:

- The root-cause class.
- The fixture or test that would fail if it regresses.
- The cheapest local verification command.
- Whether native manual or native automated verification is still required.

This keeps future bug fixes from becoming isolated one-off tests.

## Phased Plan

### Phase 1: Characterize And Extract Without Behavior Change

Deliverables:

- Add the bug-class regression matrix.
- Add source metadata contract documentation near the parser docs.
- Extract pure DOM decoration utilities from `BlockView`.
- Add unit tests for the extracted decoration utilities.

Verification:

- `cd frontend && npm test`
- `cd frontend && npm run check`
- Focused UAT for reader tools.

### Phase 2: Reader Runtime Controller

Deliverables:

- Introduce `frontend/src/core/reader/` controller modules.
- Move virtualizer rebuild criteria, mounted-range updates, asset resolution, and print range ownership out of `DocumentView`.
- Keep public `DocumentView` behavior unchanged.

Verification:

- Unit tests for controller transitions.
- Existing scroll-stability UAT.
- Existing print UAT.
- Reader/workspace benchmarks.

### Phase 3: Canonical Source Metadata

Deliverables:

- Add `SourceSpan`.
- Migrate source-line consumers to the canonical field.
- Keep compatibility aliases until all call sites move.
- Strengthen parser tests around raw anchors, nested/task lists, frontmatter, and GFM tables.

Verification:

- Parser tests.
- Focused UAT for document source labels.
- Copy sanitization tests.

### Phase 4: Platform Capability Adapter

Deliverables:

- Add frontend platform capabilities.
- Move Windows/WebView2 Mermaid checks and drop-path assumptions behind capabilities.
- Add table tests for Go-side desktop-entry/file-association policy where practical.

Verification:

- Frontend unit tests for capability selection.
- Go tests for file association policies.
- Focused UAT on drag/drop and Mermaid where browser coverage is sufficient.

### Phase 5: Native Acceptance Harness

Deliverables:

- Revisit deferred P11.15 as a native-shell verification harness.
- Start non-blocking, then promote reliable checks.
- Target Linux WebKitGTK search/focus/drag/drop/print gaps first because they are still tracked blockers.

Verification:

- Native smoke artifacts.
- Manual fallback documented when the platform blocks automation.

## Component Extraction Targets

| Current File | Proposed Extracts | Reason |
|---|---|---|
| `frontend/src/App.svelte` | `documentController.ts`, `nativeEvents.ts`, `printWorkflow.ts`, `selectionClipboard.ts`, `commandDispatcher.ts` | Reduce reactive coupling between workspace, native events, print, commands, and context menus. |
| `frontend/src/components/DocumentView.svelte` | `readerController.ts`, `readerImages.ts`, `readerPrint.ts`, `readerVirtualization.ts` | Make reader modes and virtualized side effects explicit and testable. |
| `frontend/src/components/BlockView.svelte` | `searchDecoration.ts`, `codeDisplayDecoration.ts`, `sourceLineDecoration.ts`, `mermaidMountPolicy.ts` | Isolate idempotent DOM mutations and make ordering intentional. |
| `frontend/src/components/TableBlock.svelte` | `TableFilterPopover.svelte`, `TableHeaderCell.svelte`, possibly `tableFilterCopy.ts` | Keep projection logic pure and reduce UI component size. |
| `frontend/src/core/pipeline/parseDocument.ts` | `sourceMetadata.ts`, `blockAssembly.ts`, `wikilinks.ts`, `callouts.ts` | Separate parser features from model assembly and metadata contract code. |
| `frontend/src/core/mermaid/mermaidManager.ts` | `mermaidPlatformPolicy.ts`, `svgBounds.ts`, `svgStabilization.ts` | Keep rendering, platform selection, and SVG repair separately testable. |

## Acceptance Criteria

The proposal is successful if future fixes can meet these criteria:

- The touched production files are close to the root cause and do not require unrelated shell changes.
- A bug fix includes a test at the same level as the bug: pure unit, component/UAT, Go policy test, or native acceptance.
- Reader mode transitions are visible in tests, especially print and detached state.
- Parser metadata has one documented canonical representation.
- Platform-specific behavior is selected through capability functions.
- `npm run check`, relevant unit tests, focused UAT, and benchmark gates remain green after each implementation phase.

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Over-abstraction makes the code harder to follow. | Extract only from files already implicated by repeated fixes; keep modules small and named after actual workflows. |
| Svelte reactive behavior changes during extraction. | Start with pure utilities and controller tests before moving view ownership. Use existing scroll and print UAT as gates. |
| Parser metadata migration breaks source labels. | Add compatibility aliases and broaden parser fixtures before switching consumers. |
| Native harnesses are flaky or unavailable on Linux desktops. | Keep native harness work non-blocking at first; preserve manual acceptance notes when desktop security blocks automation. |
| Platform capability objects drift from real Wails behavior. | Add tests for capability selection and keep native bug fixes required to update the capability contract. |

## Recommended First Commit

Start with Phase 1 because it has the lowest blast radius and creates guardrails for later work:

1. Add a regression matrix doc.
2. Extract `sourceLineDecoration.ts` and `searchDecoration.ts` from `BlockView`.
3. Add DOM fixture tests for idempotency and copy-exclusion assumptions.
4. Leave visual behavior unchanged.

This gives immediate maintainability value and lowers risk before moving the larger reader runtime pieces.

# Code Design Proposal: Stability and Maintainability

**Date:** 2026-07-02
**Status:** Proposal (not yet approved)
**Author:** Claude Code review pass over bug-fix history and current code
**Related:** `docs/stability-maintainability-proposal.md` was produced independently by a
parallel session on the same day and overlaps this document. The two should be
reconciled into one accepted plan before implementation starts.

## Summary

Maakdown's bug-fix history is unusually well documented (commit messages,
`DEV_CONTEXT.md`, regression tests landed with fixes). Reading the ~20 product
bug fixes since P5 shows they are not random: they concentrate in five
recurring root-cause classes, and most of them landed as *guards added to
existing code* rather than changes to the design that produced the bug. Each
guard is correct, but the accumulation is the maintainability risk: the next
change in those files must understand six interacting flags and sentinels that
exist only to suppress past bugs.

This proposal names the five bug classes, ties each to the concrete design
weakness that produced it, and proposes bounded, behavior-preserving
refactors. No rewrite, no framework change, no deviation from the approved v1
constraints (Wails v2.12, no Shiki WASM, tokenized asset server, virtualizer
navigation).

## Evidence: where the fixes landed

Fix-commit concentration by file (product fixes only, scaffold-to-date):

| File | Fix commits touching it | Representative fixes |
|---|---|---|
| `frontend/src/components/DocumentView.svelte` | 5+ | `ce199db` detached-surface scroll, `cd42512` image remount, `951e93a` scroll oscillation, `fe8c551` print range collapse |
| `frontend/src/components/BlockView.svelte` | 5+ | `7dac623` light-code flash, `07ca710` Mermaid remount stabilization, `6a0a848`/`5788706`/`c2748b7` list source-label series |
| `frontend/src/App.svelte` | 6+ | `9e2e356`/`0f1d2a1`/`b0a4a58` drag-and-drop series, `951e93a` `$state.raw`, `f7a0f3a` theme toggle |
| `frontend/src/core/mermaid/mermaidManager.ts` | 2 large | `903b79e`, `07ca710` (together ~300 lines of Windows-specific SVG repair) |
| `internal/assetservice/service.go` | 1 | `853a2f1` SVG validator false positive |
| Go platform integration (`fileassoc_*`, `main.go`) | 2 | `e00460b` GIO TryExec, `b0a4a58` Windows drop path |

Three separate fix *series* — drag-and-drop (3 commits), Windows Mermaid
(2 commits + RDP follow-up), and list source labels (3 commits in one week,
including `c2748b7` committed today) — each took multiple attempts because the
first fix addressed a symptom while the underlying contract stayed implicit.

## The five bug classes

### 1. Implicit reader lifecycle and modes

**Fixes in this class:** `ce199db`, `951e93a`, `fe8c551`, `cd42512`.

`DocumentView.svelte` has no explicit notion of what state the reader is in.
Instead it carries cooperating sentinels: `restoredPath` + `restoredModel`
(am I restoring?), `printRange` + `printMode` + `enhancedForPrint` (am I
printing?), `surface.isConnected` (am I detached?), `measurementFrame`
(is a measure pending?), `assetUrlCache` + `dataset.assetError` (which assets
already failed?). Every fix in this class added one more sentinel:

- `ce199db` added the `isConnected` bail in `handleScroll` ([DocumentView.svelte:157](frontend/src/components/DocumentView.svelte:157)).
- `fe8c551` made `updateRange()` a no-op while `printRange` is set ([DocumentView.svelte:297](frontend/src/components/DocumentView.svelte:297)).
- `951e93a` added the `restoredModel` identity check so the rebuild effect
  bails on no-op runs ([DocumentView.svelte:56](frontend/src/components/DocumentView.svelte:56)).
- `cd42512` added the asset URL cache and the `assetError` marker.

Each of these is a transition guard of a state machine that exists only in
the maintainers' heads. The 40-line comment blocks in the file are the spec;
the code enforces it incidentally.

**Proposal — extract a reader session controller.** Move lifecycle ownership
into a plain-TypeScript module, e.g. `frontend/src/core/reader/readerSession.ts`,
with an explicit mode:

```ts
type ReaderMode = 'restoring' | 'reading' | 'printing' | 'detached';
```

The controller owns: virtualizer instance and rebuild criteria (document
identity change only), the mounted range, print expansion/restore, the asset
URL cache, and per-document interaction state reset. `DocumentView.svelte`
shrinks to a view adapter: bind the surface, render `session.range`, forward
scroll/measure/click events. Because the controller is framework-free, the
invariants that currently only UAT-11 and UAT-06 can catch become cheap unit
tests:

- a scroll commit never rebuilds the virtualizer;
- range updates are rejected in `printing` mode;
- events on a `detached` session are dropped;
- a document-identity change (and nothing else) clears caches and table state.

### 2. Unowned DOM decoration on rendered HTML

**Fixes in this class:** `6a0a848`, `5788706`, `c2748b7`, parts of `7dac623`,
plus the copy-sanitization work in P19.11.

`BlockView.svelte` runs four DOM mutators (`markSearchResults`,
`applyCodeDisplay`, `applyListSourceLines`, `stabilizeMountedMermaid`) inside
one `queueMicrotask` effect re-fired by eight reactive dependencies
([BlockView.svelte:83-101](frontend/src/components/BlockView.svelte:83)). All four
mutate the same `{@html}` subtree; ordering and idempotency are implicit. The
list source-label series is the canary: three fixes in a week because labels
were derived by *matching DOM back to model by index*
(`block.sourceLineGroups?.[index]` at [BlockView.svelte:205](frontend/src/components/BlockView.svelte:205)),
and raw HTML anchors or invisible nodes silently shifted the index. The copy
sanitizer in `App.svelte` (`sanitizedSelectionText`) then has to know every
decoration class name to strip visual chrome back out of selections — a
second implicit contract kept in sync by hand.

**Proposal — a small decoration registry with pure, idempotent decorators.**
Extract each mutator to `frontend/src/core/decorations/` as a function of
`(host: HTMLElement, input: ModelMetadata, settings)`, each required to:

1. be idempotent (safe to re-run; removes its own previous output first);
2. take its truth from block/model metadata, using DOM `data-*` attributes
   only as transport when the parser attached them;
3. declare the CSS classes it adds in one exported constant.

One ordered array in `BlockView` applies them. The copy sanitizer and the
sanitizer schema's attribute allow-list both import the exported class/attr
constants instead of duplicating string lists. Each decorator gets DOM
fixture tests (jsdom) for idempotency and for the exact regression cases
already fixed: raw anchors before lists, task lists, nested lists.

### 3. Unstable block identity feeding caches and state

**Fixes in this class:** the cross-document Mermaid cache collision fixed in
`903b79e` (by adding `contentFingerprint` to cache keys), the heading-to-block
indexing correction (2026-06-05), and indirectly the source-label series.

Block ids are positional (`block-${index+1}` in
[parseDocument.ts:249](frontend/src/core/pipeline/parseDocument.ts:249)). Two
documents produce identical ids, and any inserted paragraph shifts every id
after it. Everything keyed by block id inherits that instability: the
enhancement cache (now defended by fingerprints), table interaction state
(reset on model change as a defensive measure), heading/anchor maps built by
a parallel index walk (`headingIndex`, `sourceIndex` counters that must stay
in lockstep with `buildBlocks` skipping rules — the exact lockstep that broke
in the heading-indexing bug and again in the source-position series).

**Proposal — one identity contract, assembled in one place.**

- Give blocks a derived stable key: `contentFingerprint` (already exists in
  `enhancementManager.ts`) over `kind + text`, disambiguated by occurrence
  count. Keep positional `block-N` as the DOM anchor id if needed, but key
  caches and per-document session state by `documentPath + stableKey`.
- Collapse the three parallel walks in `parseDocument.ts` (`sourcePositions`
  side-array + `dataSource*` HAST annotations + `buildBlocks` counters) into a
  single block-assembly pass that carries one `SourceSpan` object per block.
  The dual metadata path (side-band array *and* DOM attributes, reconciled at
  [parseDocument.ts:247](frontend/src/core/pipeline/parseDocument.ts:247)) exists
  because `rehypeRaw` can reshape top-level nodes; making the DOM-attribute
  path the *only* transport (attached in remark, read back in one place after
  sanitize) removes the index-lockstep failure mode entirely.

### 4. Platform divergence encoded as scattered conditionals

**Fixes in this class:** `903b79e`, `07ca710` (Mermaid/WebView2/RDP),
`9e2e356`/`0f1d2a1`/`b0a4a58` (drag-and-drop), `e00460b` (GIO), `3465e27`
(Windows runner timing).

The knowledge "Windows WebView2 resolves drop paths via the JS handler while
WebKit platforms must disable webview drops" is currently distributed across
`main.go`, `frontend/src/ipc/index.ts`, and comment blocks in `App.svelte`.
Mermaid's platform policy is a UA sniff inside the manager
([mermaidManager.ts:312](frontend/src/core/mermaid/mermaidManager.ts:312)) plus
per-diagram-type branches. The drag-overlay logic needs a depth counter *and*
a 250 ms safety timeout because whether a JS `drop` event ever fires depends
on the platform. Each series took multiple commits because the first fix
didn't know the full capability matrix.

**Proposal — one capability module per side of the IPC boundary.**

- Frontend: `frontend/src/core/platform/capabilities.ts` exporting a single
  resolved object (`os`, `webview`, `dropPathsViaJsHandler`,
  `mermaidHtmlLabels`, `mermaidNeedsPostMountStabilization`, …). Consumers
  branch on named capabilities, never on `navigator.userAgent`. Unit tests
  pin the matrix per platform.
- Go: a mirrored `internal/platform` policy struct consumed by drop
  configuration and file-association code, with table tests (the pattern
  `fileassoc_linux_test.go` already started after `e00460b`).
- **Quarantine the Mermaid SVG surgery.** `stabilizeClassRanks` /
  `replaceClassOuterPath` rewrite Mermaid's internal SVG structure
  ([mermaidManager.ts:170-272](frontend/src/core/mermaid/mermaidManager.ts:170))
  and will silently break on a Mermaid upgrade. Move them to a clearly named
  `mermaidWindowsRepairs.ts` with snapshot tests against fixture SVGs from the
  *pinned* Mermaid version, and a comment gate: upgrading Mermaid requires
  re-running the native Windows fixture (`fixtures/mermaid-cases.md`).

### 5. Reactivity and config-semantics traps

**Fixes in this class:** `951e93a` layer 1 (`$state.raw`), `f7a0f3a`
(theme toggled against configured `system` instead of resolved mode),
the double-click theme bug before it.

These were one-line fixes with large investigation cost. The design smells
behind them still exist in `App.svelte` (918 lines, 31 commits touching it):
the whole workspace is one `$state.raw` object replaced by `commit()`;
`livePositions` lives outside reactive state as an escape hatch; config
updates are hand-rolled `{ ...$appConfig, field }` spreads in seven separate
functions, several of which duplicate the `if (!fixture) void setConfig(next)`
persistence rule.

**Proposal — extract the workspace controller, keep App.svelte as wiring.**
Move `openPath` / `reloadDocument` / `relocateMissingTab` / history /
persistence into `frontend/src/core/workspace/workspaceController.ts`
(the pure helpers in `workspace.ts` already exist — this moves the
*orchestration* that calls them plus the IPC calls behind an injected port,
so the controller is testable against the UAT mock). Give config mutation one
funnel (`updateConfig`) so the resolved-vs-configured distinction and the
fixture-persistence rule live in exactly one place. Document the
`$state.raw` + `commit()` identity contract where `workspace` is declared —
it is currently explained only at the declaration site comment, and any
future `$state` addition to tab models will reintroduce the oscillation class.

## One process change: a bug-class regression ledger

Every fix in this history landed a test, which is excellent. What is missing
is the *class-level* map: UAT-11 guards scroll oscillation, but nothing says
"this is the virtualizer-stability class; here are its invariants and the
cheapest gate." Add `docs/regression-ledger.md` with one row per class above:
root-cause class → invariant → guarding test/fixture → cheapest local
command → whether native acceptance is still required. New fixes must either
extend an existing class row or add one. This converts the DEV_CONTEXT
narrative (append-only, chronological) into a checkable contract and gives
future sessions a place to look *before* re-deriving the failure mode.

## Phasing

Ordered by blast-radius, each phase behavior-preserving and gated by the
existing verification stack (`npm run check`, `npm test`, focused UAT, full
`npm run uat`, benchmarks, `go test ./...`):

1. **Ledger + decorators (low risk).** Write the regression ledger. Extract
   the four DOM decorators with idempotency fixture tests. Export shared
   class-name/attribute constants; point the copy sanitizer and sanitize
   schema at them. Gate: focused UAT-03/05/12.
2. **Parser single-pass source metadata.** Introduce `SourceSpan`, collapse
   the parallel walks, keep the existing `Block` fields as derived aliases
   until consumers migrate. Gate: `parseDocument.test.ts` (extended with the
   raw-anchor/list cases from `c2748b7`), UAT-05, benchmarks (source-position
   overhead has a tracked baseline in `docs/performance-audit-next-release.md`).
3. **Reader session controller.** Extract modes/virtualizer/print/assets from
   `DocumentView`. Gate: new controller unit tests + UAT-04/06/11 + reader
   benchmark (activation latency and mounted-block counts must not regress).
4. **Capability modules + Mermaid quarantine.** Frontend and Go capability
   objects; move UA sniffs and drop-path branches behind them; isolate the
   Windows SVG repairs with snapshot tests. Gate: unit tests per platform
   matrix, `go test ./...`, native rendering smoke lane for Windows Mermaid.
5. **Workspace controller extraction.** Last because `App.svelte` touches
   everything; by this point phases 1–4 have shrunk its collaborators. Gate:
   full UAT + workspace benchmark.
6. **Block identity migration (optional, largest).** Stable cache/session
   keys per class 3. Only worth doing when a concrete feature (e.g. preserved
   table state across reloads, incremental re-parse) needs it; the fingerprint
   defense in the enhancement cache is adequate today.

## Non-goals

- No Wails v3, no Shiki WASM, no parser replacement, no virtualizer rewrite.
- No change to the tokenized asset server design. The SVG validator's
  substring blocklist ([service.go:271](internal/assetservice/service.go:271))
  is crude but sits *behind* the frontend sanitizer and trusted-root checks;
  replacing it with token-level XML classification is worthwhile only if a
  second false positive shows up. Note it in the ledger rather than fixing
  speculatively.
- No new UI behavior in any phase. Refactors that need a product decision
  stop and go back to the tracker.

## Risks

| Risk | Mitigation |
|---|---|
| Extraction changes Svelte effect timing (the exact class-1 failure mode). | Controllers are plain TS extracted with their guards intact; UAT-11/06 gate every phase; keep the `$state.raw` contract documented and untouched until phase 5. |
| Decoration ordering silently mattered. | Registry preserves the current order (search → code display → source lines → Mermaid stabilize); fixture tests assert combined output on a block using all four. |
| Parser single-pass migration breaks label alignment again. | The `c2748b7` regression tests plus the large-fixture Playwright check (Delivery-checklist line labels) run before/after; aliases keep old fields live until every consumer moves. |
| Two competing proposal docs diverge. | Reconcile this file with `docs/stability-maintainability-proposal.md` into one accepted plan; record the decision in `DEV_CONTEXT.md` and the tracker before phase 1 starts. |

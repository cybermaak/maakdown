# DEV_CONTEXT

## Project Summary

Maakdown is a cross-platform desktop Markdown viewer for technical documents and personal notes. The approved v1 stack is Wails v2.12.x, Go, Svelte 5.x, Vite 8.x, and TypeScript.

The app is a viewer, not an editor. It renders CommonMark/GFM, code, KaTeX math, Mermaid diagrams, frontmatter, callouts, local images, anchors/footnotes, and later notes-style wikilinks.

## Current Phase

**Phase:** P11.11 is active; P13-P22 implementation and macOS acceptance are
complete for the next release; P0-P10 and P12 are complete
**Active focus:** remaining native editorial acceptance and cross-platform
release validation. P13-P18 delivered the
"Precision Reading & Performance"
release scope: macOS benchmark baselines, source-position metadata,
document/code line numbers, code wrap controls, model-driven minimap marks,
viewport/search marks, reader statistics, pinned/missing recents, print
metadata controls, high-contrast reader tokens, reader-only table projection,
constrained table layout, headered-table sort/filter tools, UAT traceability,
and macOS release acceptance. P19 completed the first reader feedback polish
pass: sectioned Display settings, source-line gutter alignment, minimap legend,
column-targeted table filter ergonomics, and Mermaid source inspection. P19.7
then incorporated the annotated table-filter spec and mock refinements:
prose-width code blocks, shaded table headers, type-aware per-column filters,
shared block chrome for code/Mermaid bodies, and highlighted Mermaid source.
P19.8 refined the Settings popover density and moved inline Mermaid diagrams to
the prose measure while preserving the large inspection modal. P19.9 refined
the table filter popover, list source-line gutters, table row numbers, Settings
surface, and command palette result metadata. P19.10 removed focus mode from
the product scope and fixed list line-number placement so labels sit beside
actual list rows instead of stacking in the block gutter. P19.11 tightened the
source/table number ergonomics: list labels now share the normal gutter margin,
reader copy strips visual number chrome, and table row numbers use a smaller
column. P20 replaced physical source-line display numbering with semantic
reader-content line numbers driven by a parser-emitted Line Map, trusted
post-sanitize anchors, per-block reader gutter labels, reader-line stats, and a
`Go to line...` command. P20.7 made Shiki JS-regex the default code highlighter,
kept Highlight.js as a persisted command-palette-selectable fallback, and
removed highlighter switching from the Settings popover.
P21 consolidated ad hoc UI controls into the production Svelte design system
after scanning `/Users/maak/Downloads/Maakdown Design System`; reference tokens
matched the preserved repo exports, so the pass added/refined missing
primitives and migrated feature surfaces without a global theme rewrite.
P22 added a narrow dock of frequently used global reader controls to the tab
bar: reader measure and document line-number visibility are now available
beside the tabs, while the tab list itself owns horizontal overflow at narrow
widths.
Cross-OS CI/UAT and native screenshot validation passed for P18 on `main`
(`aa8dccf`) on 2026-07-02; P19 Windows/Linux validation plus
release-smoke/manual release checks still gate the release. The remaining
tracked P11.11 editorial acceptance gaps are Linux WebKitGTK
search/focus/drag/drop/print coverage.

## Major Files And Directories

- `docs/markdown-viewer-design-spec.md`: approved product and technical spec.
- `docs/markdown-viewer-implementation-plan.md`: approved implementation plan.
- `docs/review-consensus.md`: Claude/Gemini/Codex review consensus.
- `docs/task-tracker.md`: project/progress tracker.
- `docs/next-release-plan.md`: next feature release plan and implementation
  guidance.
- `docs/next-release-task-tracker.md`: detailed P13-P19 task tracker with
  per-task macOS/Windows/Linux validation gates.
- `docs/stability-maintainability-proposal.md`: 2026-07-02 proposal based on
  bug-fix commit history and current code review, recommending phased
  hardening around reader lifecycles, block decorations, parser metadata,
  platform capabilities, and regression gates.
- `docs/performance-audit-next-release.md`: P13 macOS performance baseline,
  parser source-position overhead, memory probes, and next-release thresholds.
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
- `frontend/src/core/minimap/`: model-driven minimap mark projection for
  headings, search hits, code, diagrams, and tables.
- `frontend/src/core/tables/`: sanitized table projection, bounded column
  sizing, type-aware per-column filtering, stable sorting, and suppression logic for
  unsuitable table interactions.
- `frontend/src/design-system/`: production Svelte primitives, command/menu/form
  controls, floating shells, and deterministic gallery.
- `frontend/src/components/`: reader surface, masthead, hover minimap, workspace
  chrome, dialogs, settings, and native-window controls.
- `frontend/src/components/TabStrip.svelte`: document tabs plus the docked
  global reading controls for measure and document line numbers.
- `fixtures/`: deterministic Markdown evaluation documents and local fixture assets.
- `fixtures/table-tools.md`: manual and UAT-backed table interaction fixture for
  sorting, filtering, wrapping, and unsupported-table suppression checks.
- `frontend/e2e/`: Playwright UI-driven UAT journeys and the mock-IPC seeding support.
- `frontend/e2e/uat-12-table-tools.spec.ts`: table width, wrapping,
  per-column filter, sort, suppression, and virtualizer-remount state UAT.
- `frontend/src/ipc/uat-mock.ts`: deterministic Wails IPC mock used only in `vite --mode uat`.
- `frontend/playwright.uat.config.ts`: headless-Chromium UAT runner config.
- `docs/uat-test-plan.md` / `docs/uat-traceability.md`: UAT plan and requirements matrix.
- `tools/generate-reader-evaluation-fixture.mjs`: regenerates the large reader evaluation dossier.
- `frontend/scripts/benchmark-reader.mjs`: Chromium benchmark for parser,
  virtualizer, navigation, and rich enhancements.
- `frontend/scripts/fixture-app-server.mjs`: shared benchmark-mode production
  build and static fixture host for reader/workspace benchmarks, visual smoke
  checks, and UAT.
- `build/darwin/`, `build/windows/`, `build/signing/`: signing and packaging templates/documentation; secrets excluded.
- `scripts/postbuild-darwin.sh`: compiles `docs/design-system/maakdown.icon` via
  `actool` into `Assets.car` + `maakdown.icns`, replaces the Wails-generated
  `iconfile.icns`, and touches the bundle for Finder.
- `.github/workflows/ci.yml`: frontend/Go verification, reader benchmarks,
  cross-OS Chromium UAT, and cross-OS screenshot artifacts.
- `.github/workflows/native-rendering-smoke.yml`: non-blocking light/dark
  screenshot capture from packaged WKWebView, WebView2, and WebKitGTK apps on
  every push; artifacts expire after seven days.
- `.github/workflows/release-smoke.yml`: manually dispatched unsigned build,
  test, artifact-validation, and short-lived artifact-upload matrix for macOS,
  Windows, and Linux.

## Decisions

- Pin Wails v2.12.x for v1; do not use Wails v3.
- Pin Svelte 5.x and Vite 8.x.
- Use Shiki with its JavaScript RegExp engine as the default highlighter.
- Keep highlight.js as a command-palette-selectable fallback.
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
- Keep Mermaid's diagram-specific label modes intact. On Windows/WebView2,
  wait for document fonts before layout, add a small SVG viewBox gutter for
  edge-label rounding, and render exceptionally wide flowcharts at a readable
  intrinsic width inside their own horizontal scroller. macOS and Linux retain
  Mermaid's existing responsive sizing.
- Key progressive-enhancement cache entries by content as well as block
  identity so two documents with the same generated block id cannot reuse each
  other's rendered Mermaid SVG.
- Build the vault index in Go and render only indexed wikilinks as navigable.
- Use the reviewed Maakdown design system as the visual source of truth from P8
  onward: warm paper/ink themes, semantic tokens, restrained blue interaction
  accent, hairline borders, Inter, JetBrains Mono, and minimal motion.
- Implement design-system primitives natively in Svelte; the exported React
  prototype is reference-only.
- UI feature work must compose `frontend/src/design-system` primitives first.
  If a reusable control is missing, add the primitive, export it, render its
  states in `DesignSystemGallery.svelte`, document it under
  `docs/design-system/`, and only then use it in feature code.
- Exceptions to primitive extraction are limited to OS-native chrome and drag
  regions, sanitized browser-rendered Markdown, one-off layout containers,
  virtualizer/measurement wrappers, or highly specialized feature surfaces where
  extraction would make the code less clear; non-obvious exceptions should be
  documented.
- The downloaded design-system reference at
  `/Users/maak/Downloads/Maakdown Design System` was scanned on 2026-07-05.
  Its color/spacing/typography tokens matched the preserved repo reference
  exports, so the accepted direction was selective primitive adoption rather
  than a global token rewrite.
- The 2026-07 design-system consolidation added native Svelte `Toggle`,
  `Checkbox`, `Chip`, `Field`, `SettingRow`, `Stepper`, `CommandSurface`,
  `CommandItem`, and `Menu` primitives, expanded `Popover` with richer shell
  options, and expanded `Dialog` for large canvas dialogs and custom header
  actions.
- The docked reading controls in the tab bar intentionally update the existing
  global `AppConfig` settings only; there are no per-document reader-control
  overrides in this iteration.
- Narrow workspace widths preserve docked control labels and icon affordances;
  the tab list, not the dock, owns horizontal overflow and scrolls like a code
  editor tab strip.
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
- Use Shiki with its JavaScript RegExp engine as the default highlighter and
  expose Highlight.js/Shiki selection through the command palette for persisted
  user evaluation.
- Theme rendered Markdown through a dedicated semantic reader contract. It owns
  prose, headings, links, syntax, selection, and Mermaid palettes independently
  from application chrome and supports future user-selectable themes.
- Compute search totals over the full document model while marking only mounted blocks.
- Route human-readable dates, sizes, counts, and durations through one formatting layer.
- Treat print expansion as cancellable, memory-sensitive work with guaranteed cleanup.
- Represent navigation visits as per-tab path/anchor/offset entries and transfer
  history to the destination tab when following cross-file links.
- Use the explicit `@ipc` adapter alias so UAT swaps only the native boundary
  without relying on fragile relative-import matching.
- Keep WebView2 external drops enabled on Windows because Wails resolves
  filesystem paths from the JavaScript drop event there. Keep WebKit-backed
  webview drops disabled so dropped Markdown files cannot navigate the webview
  to a plain text view. The frontend subscribes to Wails' JS `OnFileDrop`
  handler and the app-level `files-dropped` event with a duplicate guard so a
  single native drop opens once.
- Keep cross-platform release smoke manually dispatched. Verify workflow
  changes on the disposable remote `ci/sandbox` ref before promoting them to
  `main`, and separate workflow defects from product test failures.
- Keep tested multi-path watchers for all open documents; the supplemental
  review's active-only watcher staging suggestion is superseded by completed P9.
- Suppress the native webview context menu app-wide and render one custom,
  OS-consistent menu per surface; keep the native editing menu inside text
  fields so OS text services (spelling, proofread, Look Up) stay available.
- Run a frameless window with one custom title bar across all platforms; the
  workspace toolbar is the drag handle and hosts trailing window controls.
  Controls/drag are gated on the Wails desktop runtime so browser/UAT bundles
  are unaffected.
- Group toolbar controls as leading navigation and trailing view actions rather
  than one trailing cluster, per Apple HIG, Windows Fluent, and GNOME HIG.
- Build the Shiki theme from the live semantic reader tokens so both
  highlighters share one palette.
- Use Apple's `.icon` format (Icon Composer) for the macOS app icon; compile it
  with `xcrun actool` in `scripts/postbuild-darwin.sh` to produce `Assets.car`
  (themed) and `maakdown.icns` (legacy fallback).  `Info.plist` carries both
  `CFBundleIconFile` and `CFBundleIconName` pointing to `maakdown`.  The
  Wails-generated `iconfile.icns` is removed so it cannot compete.
- The icon masters live only inside the `.icon` bundle at
  `docs/design-system/maakdown.icon/Assets/maakdown_{light,dark}.png` (single
  source, same files `icon.json` references). Derive `build/appicon.png`
  (Windows/Linux) and the light title-bar mark from the light master, and the
  dark title-bar mark from the dark master. The toolbar brand switches via
  `config.theme === 'dark' ? appIconDark : appIconLight`.
- The Windows Markdown file association uses a standalone derived document icon,
  not the main app icon and not an app-icon overlay. Source artwork is
  `docs/design-system/markdown-file-icon.png`; the committed ICO is
  `build/windows/markdown.ico`, embedded into the Windows build and written at
  startup to `%APPDATA%\Maakdown\markdown.ico` for the ProgId `DefaultIcon`.
- For the next release, every task must pass macOS validation before work moves
  to the next task. Windows and Linux validation may trail implementation, but
  both are release-blocking.
- Source line numbers use unified parser source positions captured as scalar
  block line metadata. The app intentionally avoids expensive source-map
  reconstruction.
- Code block line numbers use a generated CSS gutter from the raw code line
  count so highlight.js and Shiki markup remain intact and copied code excludes
  visual line numbers.
- Minimap marks are projected from the parsed document model and search model,
  not from DOM scanning.
- Document statistics are projected from the parsed model rather than the DOM:
  prose word count excludes code/Mermaid blocks, while headings, code blocks,
  diagrams, images, tables, tasks, source lines, and reading minutes come from a
  shared formatter.
- Recent documents now preserve pinned state and missing-file metadata across
  versioned config/session persistence. Pinned recents sort first, and cleanup
  actions are intentionally limited to missing or unpinned entries.
- Print metadata is a persisted reader setting. It affects the print snapshot
  masthead only; the normal reader surface remains unchanged.
- `readerTheme` is a persisted reader appearance axis separate from app chrome.
  The initial presets are `editorial` and `high-contrast`; both are implemented
  through semantic reader tokens so future user-selectable themes can be added
  without rewriting component CSS.
- Local packaged macOS build validation is no longer blocked. `scripts/release-check.sh`
  found Wails v2.12.0 through GOPATH and passed the macOS `darwin/arm64` build,
  frontend tests/check/build, Go tests, benchmarks, and full UAT on 2026-07-01.
- Table reader tools project from already sanitized table block HTML in
  `frontend/src/core/tables/tableProjection.ts`; the original Markdown document
  model and source file remain unchanged.
- Table width constraint is a persisted reader setting and defaults off for new
  or migrated v3 state so existing wide-table behavior is preserved. When
  enabled, it respects the active reader measure.
- Table column sizing supports `balanced` and `equal`. `balanced` is the
  default and computes widths from bounded header/body text samples rather than
  DOM measurements or manual resizing.
- Headered tables below the row/column/cell/text limits expose per-column
  filter popovers and header-button sorting. Headerless, spanning, empty, or
  over-limit tables render as plain tables without sort/filter controls.
- Table interaction state is per active `DocumentView` session state keyed by
  block id, so it survives virtualizer remounts but is not written to Markdown
  and is reset when the document model changes.
- Cross-OS CI/UAT verification passed for P18 on `main` (`aa8dccf`) in run
  `28557373069` on 2026-07-02. Native WKWebView/WebView2/WebKitGTK screenshot
  capture also passed in run `28557373060`.
- P19 treats the feature mock as a UX reference, not a wholesale React
  implementation source. Settings now move toward sectioned Display controls,
  and table filtering improves through quiet header controls and active chips
  without adding spreadsheet-style editing or persistent table state.
- Table filters are per-column and type-aware. Number/date columns use
  inclusive ranges, compact enum columns use checklists, and general text
  columns use contains search. Pending edits are committed with Apply; Escape
  or click-away cancels the pending filter. Filters combine across columns with
  AND, while selected enum values combine with OR.
- Table blocks align to the same source-line gutter origin as prose by
  accounting for the line-number gutter width when document line numbers are
  enabled. Code blocks and inline Mermaid diagram blocks intentionally follow
  the active prose measure. Mermaid SVGs are left-aligned inside their diagram
  surface rather than centered. The Mermaid inspection modal remains the wide
  canvas for detailed review.
- Fenced code, Mermaid source, and rendered Mermaid diagram bodies share one
  block-body border/radius rule in `frontend/src/styles/global.css`. Future
  block chrome changes should update that shared selector instead of duplicating
  per-block borders.
- Reader Settings uses compact paired fields where appropriate: native selects
  for three-option controls, segmented controls for two-choice modes, and
  switch-style checkbox inputs for booleans. Settings is dismissed by a
  transparent app-level click layer outside the popover. The popover no longer
  shows a separate title and uses the same `--panel-bg` surface as the command
  palette.
- Table row numbers are a persisted v5 config setting named `tableRowNumbers`.
  They are reader-only, default off, and render as a leading visible-order
  column after filtering/sorting rather than source row identity. The row
  number column is intentionally narrow, targeting roughly 4% of table width.
- List source-line gutter labels come from top-level Markdown list-item source
  spans captured during parser metadata collection. `Block.sourceLineGroups`
  keeps item-level source line groups so the reader can place labels beside the
  actual `<li>` rows instead of stacking several labels at the top of the list
  block.
- Source-line labels and table row numbers are visual reader chrome, not
  document content. The app strips `.source-line`, `.list-source-line`,
  `.table-row-number`, and `.table-row-number-heading` from selected reader
  text for native copy and the custom context-menu Copy command.
- Command palette results are grouped into Commands, Open tabs, Recent files,
  and Headings. Items carry subtitles, leading icons, optional file paths, and
  shortcut chips so similarly named results are distinguishable.
- Minimap marks are block-index projections: viewport pill, heading ticks,
  structural rich-block ticks for code/diagrams/tables, and search-hit ticks.
  The expanded outline should explain those marks compactly so the collapsed
  rail is inspectable without persistent chrome.
- Mermaid source inspection is an in-place reader toggle using `block.text`;
  it runs through the configured highlighter, does not edit source Markdown,
  and print mode should continue to render diagrams rather than source.

## Planned Tasks

See `docs/task-tracker.md` and `docs/next-release-task-tracker.md`.
Stability and maintainability hardening is proposed in
`docs/stability-maintainability-proposal.md`; implementation tracks remain
proposal-only until accepted as active work.

## Completed Tasks

- 2026-07-05: Completed P22 docked reading controls. Added tab-bar access to
  the global reader measure segmented control and document line-number toggle
  using design-system primitives, kept persistence on the existing
  `updateConfig` path, moved tab overflow into the tab list, fixed a stale
  narrow breakpoint that collapsed the main column, and tightened UAT selectors
  now that the dock shares names with Settings controls. Verification passed:
  `cd frontend && npm run check`, `cd frontend && npm run test` (57 tests),
  `cd frontend && npm run build`, `cd frontend && npm run visual-smoke`,
  focused UAT-05/07/12, full `cd frontend && npm run uat` (37 tests), and a
  seeded narrow Playwright render check showing tab overflow, no clipped dock
  controls, `--reading-measure: 1040px`, and visible reader-line labels.
- 2026-07-05: Completed P21 design-system consolidation. Scanned
  `/Users/maak/Downloads/Maakdown Design System`, confirmed its exported
  tokens matched the preserved repo reference tokens, added missing/refined
  Svelte primitives, expanded `Popover`/`Dialog`, migrated Settings, table
  sort/filter controls, Mermaid inspection, command palette, context menu,
  recents, About, and print status to compose design-system controls, cleaned
  obsolete local control CSS, updated design-system governance docs and
  `AGENTS.md`, and adjusted UAT-01 to assert the current Shiki/Highlight.js
  enhancement marker rather than Highlight.js-only token classes. Verification
  passed: `cd frontend && npm run check`, `cd frontend && npm run test` (57
  tests), `cd frontend && npm run build`, `cd frontend && npm run visual-smoke`
  after installing the missing Playwright Chromium cache, focused UAT-05/07/08/12
  (16 tests), full `cd frontend && npm run uat` (36 tests), and
  `scripts/verify.sh` (frontend test/check/build, Go tests, Wails
  `darwin/arm64` build).
- 2026-07-02: Reviewed recent bug-fix commits and current reader/parser/native
  integration code for stability and maintainability patterns. Added
  `docs/stability-maintainability-proposal.md` with phased recommendations for
  reader lifecycle extraction, block decoration adapters, canonical source
  metadata, platform capability adapters, and bug-class regression gates.
  Docs-only verification used `find`, `rg`, scoped/staged
  `git diff --check`, and `git status`; existing uncommitted
  frontend/generated-binding changes were left untouched.
- 2026-07-01: Completed P13-P15 next-release implementation on macOS. Added
  P13 benchmark/memory/source-position instrumentation and
  `docs/performance-audit-next-release.md`; added P14 source line metadata,
  document line-number gutter, code line-number gutter, code wrap defaults and
  per-block toggle; added P15 model-driven minimap marks, viewport indicator,
  search-hit marks, and no-results/wrap search feedback. Validation passed:
  `go test ./...`, `npm run check`, `npm test`, `npm run build`,
  `npm run benchmark`, `npm run benchmark:workspace`, focused UAT, and full
  `npm run uat`. The packaged macOS Wails build later passed through
  `scripts/release-check.sh`.
- 2026-07-01: Completed P16-P17 next-release implementation and macOS
  acceptance. Added model-driven document statistics, masthead stats display,
  persisted print metadata, pinned/missing recent documents, recent cleanup
  actions, calmer typed recovery copy, improved print CSS, high-contrast reader
  theme tokens, reader token contract documentation, and updated UAT
  plan/traceability. Validation passed: `go test ./internal/config`,
  `go test ./...`, `npm run check`, `npm test`, `npm run build`,
  `npm run benchmark`, `npm run benchmark:workspace`, `npm run uat`, and
  `scripts/release-check.sh`. Windows and Linux validation remain
  release-blocking.
- 2026-07-02: Completed P18 table reading tools on macOS. Added sanitized table
  projection, persisted table measure/column-sizing settings, constrained
  auto-wrapping table rendering, headered-table filter and stable sort controls,
  suppression for headerless/spanning/empty/over-limit tables, per-document
  session state across virtualizer remounts, table UAT coverage, and tracker
  updates. Validation passed: `go test ./internal/config`, `go test ./...`,
  `npm test`, `npm run check`, `npm run build`, focused UAT-12,
  `npm run uat` (31 tests), `npm run benchmark`,
  `npm run benchmark:workspace`, and `scripts/release-check.sh`. Cross-OS
  CI/UAT and native screenshot validation passed after push in runs
  `28557373069` and `28557373060`.
- 2026-07-02: Completed P19 reader feedback polish on macOS. Reworked Reader
  Settings into sectioned Display controls with visible helper copy, fixed
  checkbox row alignment, clarified Balanced versus Equal table sizing, aligned
  wide code/Mermaid/table blocks to the source gutter, made the source gutter
  rule continuous-looking, added a minimap legend, upgraded table filtering to
  header-opened column filters with chips/row counts/empty-state recovery, and
  added an in-place Mermaid source toggle. Validation passed:
  `npm run check`, `npm test`, `npm run build`, focused UAT-03/UAT-05/UAT-12
  (9 tests), and full `npm run uat` (33 tests).
- 2026-07-02: Added `fixtures/table-tools.md` as the canonical manual table
  tools fixture and wired UAT-12 to reuse it for the interactive/headerless
  cases while still generating the over-limit table in-test. Matched fenced
  code block body borders and bottom radius to the Mermaid source block chrome.
  Validation passed: `npm run check`, focused UAT-12
  (`npm run uat -- uat-12-table-tools.spec.ts`), `npm run build`,
  `git diff --check` for the changed files, and a seeded Playwright visual
  check confirming both code and Mermaid source bodies use 1px side/bottom
  borders with 6px bottom radii.
- 2026-07-02: Completed the annotated table-filter and block-chrome refinement
  pass for P19.7. Reviewed rendered PDFs for `Maakdown - Feature Mocks` and
  `Maakdown - Table Sort & Filter Spec`; replaced the table global filter with
  per-column type-aware filters, Apply/cancel popovers, shaded table headers,
  active chips, and row counts; constrained code blocks to the prose measure;
  unified fenced code, Mermaid source, and Mermaid diagram body chrome; and
  added Highlight.js Mermaid source highlighting. Validation passed:
  `npm test -- --run src/core/tables/tableProjection.test.ts`,
  `npm run check`, `npm test`,
  `npm test -- --run src/core/highlight/highlighter.test.ts src/core/tables/tableProjection.test.ts`,
  `npm run uat -- uat-05-reader-tools.spec.ts uat-12-table-tools.spec.ts`,
  `npm run build`, and `git diff --check`. The in-app Browser was available,
  but seeded visual proof needed pre-navigation mock-IPC state injection that
  the Browser API did not expose, so standalone Playwright produced
  `/tmp/maakdown-refinement-blocks.png` and
  `/tmp/maakdown-refinement-table-filter.png`.
- 2026-07-02: Completed P19.8 settings density and Mermaid measure polish.
  Mermaid diagram blocks now follow the active prose measure while the inspect
  modal remains large. Settings now dismisses on outside click and uses compact
  paired controls, dropdowns for three-option settings, segmented toggles for
  two-choice settings, and switch-style boolean controls. Validation passed:
  `npm run check`, focused UAT-05, and a seeded Playwright visual check with
  screenshots at `/tmp/maakdown-settings-refactor.png`,
  `/tmp/maakdown-mermaid-text-width.png`, and
  `/tmp/maakdown-mermaid-modal.png`; measured code/Mermaid inline widths were
  both 860px, the modal width was 1102px, outside-click dismissal succeeded,
  and no console errors were captured.
- 2026-07-02: Completed P19.9 filter, line-gutter, table-row, and command
  palette refinements. Fixed table text filter input containment; added
  per-list-item source-line labels for Markdown list blocks; added persisted
  reader-only table row numbers; removed the Settings "Display" title and
  matched its root background token to the command palette; and enriched command palette
  rows with sections, subtitles, icons, paths, and shortcut chips. Validation
  passed: `go test ./internal/config`,
  `npm test -- --run src/core/pipeline/parseDocument.test.ts src/core/tables/tableProjection.test.ts`,
  `npm run check`, focused UAT-05/UAT-12, and seeded Playwright visual checks.
  Visual evidence was written to `/tmp/maakdown-filter-popup-fixed.png`,
  `/tmp/maakdown-list-line-numbers.png`,
  `/tmp/maakdown-table-row-numbers.png`,
  `/tmp/maakdown-settings-refined.png`,
  `/tmp/maakdown-settings-panel-bg-fixed.png`, and
  `/tmp/maakdown-command-palette-groups.png`.
- 2026-07-02: Completed P19.10 scope cleanup and line-number regression fix.
  Removed focus mode from the toolbar, command palette, keyboard shortcut,
  frontend/backend config shape, CSS, specs, UAT plan, and traceability docs.
  Replaced stacked list block labels with `Block.sourceLineGroups` and
  item-positioned `.list-source-line` labels so bullet/ordered-list rows get
  line labels without overlapping. Validation passed: `go test ./internal/config`,
  `go test ./...`, `npm test -- --run src/core/pipeline/parseDocument.test.ts`,
  `npm test`, `npm run check`, focused UAT-05, `npm run build`, and seeded
  Playwright visual proof. Visual evidence was written to
  `/tmp/maakdown-line-number-list-fixed.png`.
- 2026-07-02: Completed P19.11 source/table number ergonomics. Fixed list
  source-line label alignment to the normal gutter coordinate, added selected
  reader text sanitization for native copy and context-menu Copy, and reduced
  table row-number real estate to a narrow 4% column with smaller type/padding.
  Validation passed: `npm run check`,
  `npm test -- --run src/core/pipeline/parseDocument.test.ts`, focused
  UAT-05/UAT-12, and seeded Playwright visual proof. Visual evidence was
  written to `/tmp/maakdown-line-number-copy-table-fixed.png`.
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
  typography/measure controls, metadata formatting, responsive collapse,
  reduced-motion/high-contrast rules, and native menu parity.
- 2026-06-06: Implemented the UI-driven UAT suite (P7.6). Added a `vite --mode
  uat` entry mode that aliases the Wails IPC boundary to a deterministic
  `frontend/src/ipc/uat-mock.ts` (state on `window.__uat`, durable config and
  session in `localStorage` so a reload models a restart). Authored Playwright
  journeys UAT-01 (read), UAT-02 (theme), and UAT-04 (workspace lifecycle), with
  a shared support fixture that fails on unexpected page/console errors; kept
  UAT-03/05/06/07 as Planned rows in `docs/uat-traceability.md`. Added
  `npm run uat`/`uat:headed`/`uat:report`, a push-to-main CI job, and a
  release-check gate. The suite caught a real defect while building UAT-04:
  `DocumentView.handleScroll` dereferenced a null model when a scrolled tab was
  closed; it now bails on a detached surface.
- 2026-06-06: Fixed the light-theme fenced-code flash by making the unenhanced
  and highlight.js states share the light semantic code palette. Added a
  persisted highlighter selector, per-tab anchor history, copy tools, Mermaid
  inspection, reload status, reader error presentations, resizable panels,
  responsive drawers, and wider editorial code/table/diagram treatments.
- 2026-06-06: Completed the remaining local P10/P11 work: cross-file
  path/anchor/offset history, keyboard command-palette focus management,
  cancellable full-document print enhancement, tab/dialog semantics, task
  checkbox labels, async print announcements, and a standing multi-large-tab
  benchmark. Expanded UAT-01 through UAT-07 to 14 headless tests covering
  search, reader tools, print/cancel, and accessibility.
- 2026-06-07: Created the GitHub repository and completed the first
  `ci/sandbox` cross-platform release-smoke run. Run 27083374632 passed on its
  first attempt: frontend checks, Go tests, native Wails builds, artifact
  validation, and unsigned artifact uploads succeeded on macOS, Linux, and
  Windows.
- 2026-06-07: Made reader/workspace benchmarks, visual-smoke verification, and
  UAT run against dedicated production bundles served by a deterministic local
  fixture host. This removes Vite development dependency optimization and its
  cold-cache dynamic parser import race from Ubuntu CI while retaining worker,
  virtualizer, enhancement, theme, navigation, and mocked native coverage.
- 2026-06-07: Window-chrome and theming refinements (five separate commits):
  (1) per-tab close affordance with the redundant add-tab button removed;
  (2) Shiki highlighting rebuilt from the semantic reader palette so it matches
  highlight.js; (3) toolbar split into a leading navigation group and a trailing
  view group per HIG/Fluent/GNOME guidance
  (`docs/design-system/toolbar-placement.md`); (4) a consistent custom context
  menu across reader/tabs/outline/toolbar that suppresses the native webview
  menu (no Inspect Element) while leaving the native editing menu in text fields,
  with UAT-08 coverage; (5) a frameless window with one custom title bar (drag
  region plus minimise/maximise/close), new Go window methods and IPC wrappers,
  desktop-runtime gated (`docs/design-system/custom-titlebar.md`). Cross-platform
  title-bar visual acceptance on Windows/Linux remains a platform-owner step.
- 2026-06-07: Title-bar/context-menu follow-ups (five separate commits):
  (1) the title bar and metadata panel suppress the native menu without a
  redundant custom menu — the custom menu is limited to reader, tabs, and
  outline; (2) OS-dependent window controls — macOS shows left-aligned
  traffic lights (close/minimise/zoom, glyphs on hover) while Windows/Linux keep
  the trailing cluster, via `isMacPlatform()`; (3) the toolbar title is a
  non-selectable label; (4) the frameless drag region uses the default cursor
  instead of a text I-beam; (5) right-clicking a text selection no longer clears
  the highlight (the menu skips focus while a selection exists, with a
  window-level Escape fallback).
- 2026-06-07: Added `CFBundleIdentifier` (com.maak.maakdown) and `APPL` package
  type to `build/darwin/Info.plist`; the bundle had none, so macOS never
  registered the app (also required for signing/notarization).
- 2026-06-07: Implemented design-handoff Panels option A ("Masthead + minimap",
  from claude.ai/design, two separate commits). (1) Metadata masthead: the right
  metadata rail is replaced by a quiet frontmatter band atop the reading column
  (path, status badge, tags, remaining key/values); it scrolls with the document
  and scroll-spy discounts its height; the metadata toggle shows/hides it.
  (2) Outline minimap: the left TOC rail is replaced by an edge tick strip that
  hover-expands to a floating outline; the closed panel is `inert`. The reader is
  now a single column with both panels summoned on demand. Build artifacts
  (`package.json.md5`, generated `wailsjs/*.ts`) are gitignored.
- 2026-06-07: The collapsed minimap rail is now a fixed-size decorative glyph
  rather than one tick per heading; a per-heading rail overflowed into the title
  bar on long documents. The functional, scrollable outline remains in the
  hover-revealed panel. Local work continues on `main` (merged
  `chrome-context-theming`).
- 2026-06-07: Fixed local SVG images showing broken under `wails dev`.
  `ValidateSVG` blocked any file containing `http://`/`https://`, which matched
  every SVG's mandatory `xmlns="http://www.w3.org/2000/svg"` namespace, so
  `ResolveAsset` errored and the reader showed a broken image. (Browser/fixture
  rendering served the file through the vite middleware with no validation, so
  it looked fine there.) The validator now strips namespace declarations before
  scanning, so legitimate SVGs pass while genuine remote references are still
  blocked. Added Go coverage for the namespace and remote-reference cases.
- 2026-06-07: Fixed local images breaking after scrolling out of view and back:
  image resolution now re-runs on virtualized range changes and reuses a
  per-document URL cache, so remounted blocks re-attach their asset.
- 2026-06-07: Trimmed the toolbar — removed the outline-toggle and
  metadata-toggle buttons (the minimap/masthead are subtle enough) and the
  redundant "New tab" button (Open always opens a new tab). The show/hide wiring
  stays reachable via the `toggle-outline`/`toggle-metadata` command ids for
  future advanced settings.
- 2026-06-07: Reduced open-path work behind the "open a second file after a large
  one stalls" report. The vault index is now cached per root and invalidated on
  watcher changes (was a full tree walk on every open); the minimap outline
  renders its items only while hovered. Frontend open measured ~0.6s with zero
  long tasks, so the residual native beachball is most likely the frameless
  window's macOS file dialog and needs on-device confirmation (P11.14).
- 2026-06-07: Open-path stall resolved (user-confirmed on-device); the vault walk
  measured ~11ms so the cache was a minor win. An autonomous native
  UI-verification harness (CDP-driven real build, no UI automation) is deferred
  as P11.15.
- 2026-06-07: Repo cleanup — deleted orphaned `TocSidebar.svelte` and
  `MetadataPanel.svelte` (superseded by Minimap/Masthead, no importers); now
  commit all generated `frontend/wailsjs/` bindings (dropped the `**/*.ts`
  ignore) so they stay consistent and the frontend builds in CI without a
  Go/Wails toolchain.
- 2026-06-07: Added a release artifact pipeline. `scripts/package-artifact.sh`
  packages `build/bin/` into `dist/` per platform (macOS zip, Windows zip, Linux
  tar.gz); the tag-triggered `Release` workflow builds all three OSes, packages
  them, and publishes them to a GitHub Release (artifacts unsigned; signing stays
  a separate credentialed step). `release-smoke.yml` remains the manual
  build-verify-only path. Documented in `docs/release-checklist.md` (P7.8).
- 2026-06-07: Document identity now lives only in the tab strip (like VS Code /
  browsers). Removed the toolbar's doc title + watch badge; the `Tab` shows file
  icon + title + a watching dot (success tone, decorative/aria-hidden since
  watching is ambient) and the existing changed dot. The toolbar keeps a static
  app brand (real `app-icon.png` + "Maakdown" wordmark) — app identity, not the
  active document.
- 2026-06-08: Implemented the full app icon pipeline.  macOS uses the `.icon`
  bundle compiled by `actool` into `Assets.car` + `maakdown.icns` via
  `scripts/postbuild-darwin.sh`; `Info.plist` uses `CFBundleIconFile` and
  `CFBundleIconName` pointing to `maakdown`.  Windows/Linux uses the light PNG
  via `build/appicon.png`.  The toolbar brand mark switches between
  `app-icon-light.png` and `app-icon-dark.png` based on the active theme, with
  a theme-aware `--brand-mark-shadow` drop-shadow token that follows the icon's
  alpha contour.  Documented the full update procedure in `AGENTS.md`.
- 2026-06-08: Fixed the theme toggle needing two clicks.
- 2026-06-09: Fixed CI after the outline became a hover-reveal minimap: the
  reader benchmark now hovers the minimap before navigation and treats the deep
  heading offset as best-effort. Added cross-OS screenshot artifacts on Ubuntu,
  macOS, and Windows; functional UAT later expanded to all three runners.
- 2026-06-09: Fixed the theme toggle requiring two clicks. It now toggles
  against the resolved light/dark mode, so one click always changes the visible
  theme even when the configured mode began as `system`.
- 2026-06-09: Completed the P8/P9 audit by adding the missing reusable Svelte
  `Callout`, `CodeBlockChrome`, `Popover`, `Tab`, `TocItem`, `Toolbar`, and
  `Wikilink` primitives; migrated the live UI to those contracts; expanded the
  design-system gallery; added in-place missing-file relocation; and strengthened
  workspace unit/UAT coverage.

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
cd frontend && npm run benchmark:workspace
cd frontend && npm run uat
go test ./...
scripts/verify.sh
scripts/release-check.sh
```

## Current Verification Blockers

- P11.11 still needs the remaining Linux WebKitGTK editorial paths:
  search keyboard coverage, native drag/drop, and system print/PDF.
  Cross-OS CI currently runs the frontend in Chromium, so it does not validate
  native webview rendering, window chrome, drag/drop, or system print behavior.
- macOS signing and notarization are operational. Windows release signing
  remains blocked on the user's external certificate; Linux remains unsigned
  by design.

## Verification Notes

- Current frontend verification includes 57 unit tests, zero-warning Svelte
  checks, the production build, visual smoke, and 37 production-bundled UAT
  tests with an axe serious/critical accessibility gate.
- CI run 27470447128 passed all 25 UAT tests and screenshot capture on macOS,
  Ubuntu, and Windows. These jobs use Playwright Chromium on every runner and
  therefore prove portable frontend behavior, not native webview parity.
- The production-bundle reader benchmark passes repeatedly in headless Chromium;
  the current 10,726-line fixture opens to readable text in about 1.3 seconds,
  keeps one reader and a bounded DOM mounted, renders both highlighters and
  Mermaid without errors, and reaches the final heading within 226 px.
- The standing workspace benchmark keeps one reader and 22 blocks mounted
  across three large tabs; measured activation latency was 24-37 ms.
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

The user signs macOS releases with their own Developer ID credentials and plans
to sign Windows releases with their own certificate. The repo includes
signing-safe templates and documentation but no certificates, private keys,
provisioning profiles, notarization credentials, or signed release artifacts.
- 2026-06-09: Investigated the Windows UAT failures (UAT-03 search, UAT-06
  print). Both use the large evaluation fixture; the worker parse exceeded
  expectReaderReady's default 5s on the slower Windows runner (app chrome was
  up, reader not yet mounted). Bumped that wait to 30s and made the functional
  UAT suite run on macOS/Windows/Linux.
- 2026-06-09: Fixed file drag-and-drop. The app used the Go-side OnFileDrop, so
  Wails' JS drop handlers (which preventDefault and suppress webview
  navigation) were never registered: Linux WebKitGTK opened the dropped file
  in the webview, and macOS flickered/ignored the drop. Set
  `DisableWebViewDrop: true` (native still delivers paths via OnFileDrop) and
  added frontend dragenter/over/leave/drop handlers that preventDefault file
  drags and use a depth counter so the drop overlay no longer flickers.
- 2026-06-09: Drop overlay no longer sticks. With DisableWebViewDrop the JS
  'drop' event does not fire, so the overlay is now cleared when the native
  files-dropped event arrives, plus a 250ms post-dragover safety timeout that
  covers cancelled drags.
- 2026-06-09: Added a spinner to the "Opening document..." placeholder. A real
  percentage is not feasible (the file read is one atomic Go call; parsing is a
  single worker pass with no incremental progress), so the indeterminate
  spinner (reduced-motion aware) signals activity while a long file parses.
- 2026-06-09: Implemented macOS Markdown file association (P12.1, spec
  2026-06-09). Info.plist declares a Viewer/Alternate claim for
  net.daringfireball.markdown (capable opener, no default takeover);
  Mac.OnFileOpen + SingleInstanceLock + argv feed QueueOpenFile, with
  cold-start buffering drained by the frontend after session restore;
  LaunchServices cgo backs a user-initiated "Set as default for Markdown"
  row in Reader Settings (hidden where unsupported; stub on other OSes).
  Verified on-device: LS rank Alternate/role Viewer, cold + running-instance
  opens land as tabs (session-state check), user's default untouched. UAT-09
  covers the row, hidden state, live open, and cold-start drain (suite 23/23).
  Windows/Linux follow-ups are specced in the same design doc (P12.2/P12.3).
- 2026-06-09: UI polish and cleanup: fixed Mermaid diagram background/borders to match code blocks, resolved text selection issues in the settings panel (`-webkit-user-select: none`), updated toolbar icons (`Settings2` and `Command`) with reordering, renamed "Reader appearance" to "Settings", fixed diagram modal dismissal when clicking zoom controls, and fixed callout CSS specificity to correctly apply theme-aware accent colors.
- 2026-06-09: Added an About dialog (Dialog primitive): theme-aware app icon,
  name, build version, MIT license, and a GitHub link through openExternal.
  Version comes from `main.appVersion` ("dev" locally, tag-injected via
  -ldflags in release.yml) exposed as App.Version()/appVersion(). Entry
  points: File menu "About Maakdown", command palette, and a link at the
  bottom of Settings. UAT-10 covers palette open, version/license, repo link,
  and close.
- 2026-06-10: Local macOS release/signing process. `scripts/release-mac.sh`
  builds arm64 (version via -ldflags), signs Developer ID + hardened runtime,
  then a two-round-trip notarization: notarize+staple the .app first (so it
  stays notarized after being dragged out of the .dmg), then build/notarize/
  staple the .dmg, and zip the stapled app. Helpers: sign-macos.sh (sign-only),
  notarize-macos.sh (submit+staple via MAAKDOWN_NOTARY_PROFILE keychain
  profile), make-dmg.sh (hdiutil drag-to-Applications dmg). Publishes both
  artifacts to the tag's GitHub Release via gh. `release.yml` drops macOS from
  the matrix (Win/Linux unsigned in CI; mac signed locally). Verified
  end-to-end: published, downloaded back, app copied out of the dmg passes
  spctl "Notarized Developer ID" + stapler validate. Runbook: docs/RELEASING.md.
- 2026-06-11: Cut v0.1.0 (signed/notarized macOS dmg+zip via release-mac.sh, CI
  Win/Linux; curated release notes flag Windows as WIP/unstable, also noted in
  README + landing page). Added the animated README/landing demo:
  frontend/scripts/capture-readme-demo.mjs records a Playwright-driven flow
  (scroll → minimap jump → command palette → dark theme + Mermaid) and
  assembles docs/assets/maakdown_demo.webp via ffmpeg frames + img2webp.
- 2026-06-11: Fixed post-outline-navigation scroll oscillation (subtle macOS,
  erratic Windows). Three layers: (1) workspace is now $state.raw — deep-proxy
  identity churn re-fired DocumentView's restore effect on every scroll commit;
  (2) the rebuild/restore effect bails unless documentPath/model actually
  changed (it rebuilt the virtualizer, losing measured heights, on each run);
  (3) .document-scroll sets overflow-anchor: none — measured heights exclude
  margins, so mount/unmount swaps nudged layout height and native scroll
  anchoring fed scrollTop back into the range boundary, a bistable 30-40Hz
  flap. Also: failed image resolutions are marked (assetError) so they aren't
  re-fetched on every range change. UAT-11 regression test (proven failing
  pre-fix); demo webp re-recorded without the glitch.
- 2026-06-12: Established a native Windows/WebView2 Mermaid baseline with
  `fixtures/mermaid-cases.md` and isolated one-diagram documents. The baseline
  confirmed a 1.5 device scale factor, a genuinely wide flowchart viewBox
  rather than a CSS viewport error, and a cross-document enhancement-cache
  collision when generated block ids matched. The candidate fix preserves
  Mermaid's class/ER HTML labels, waits for fonts, adds a Windows-only viewBox
  gutter, gives very wide flowcharts an internal scroller at readable scale,
  and fingerprints cache content. Native captures show class/ER structure
  restored and the wide flowchart readable; physical-machine acceptance is
  still pending.
- 2026-06-13: Cross-platform CI exposed a print preparation race in UAT-06:
  measurements from the fully mounted print DOM scheduled a virtualizer range
  update that collapsed the document back to ten visible blocks before the
  system print call. `DocumentView` now suspends normal range recalculation
  while a print range is active. The existing complete-document print UAT is
  the regression test.
- 2026-06-13: CI run 27470447128 passed frontend/backend verification, UAT on
  macOS, Ubuntu, and Windows, and screenshot capture on all three runners.
  Reviewed the macOS and Ubuntu light reader, dark Mermaid, code/math, and
  command-palette artifacts side by side: layout, local fonts/icons, themes,
  KaTeX, highlighting, and Mermaid output showed no regression. The screenshot
  workflow uses headless Chromium on every runner, so this is cross-OS asset/CSS
  coverage rather than native WebKit/WebKitGTK rendering coverage.
- 2026-06-13: Completed P7.9 native rendering smoke coverage. A compact fixture and
  platform capture scripts launch the packaged app with isolated light/dark
  settings and upload two screenshots per OS. This lane is intentionally
  non-blocking and does not alter the functional UAT suite or its ten-minute
  release target. Sandbox run 27490613627 passed WKWebView, WebView2, and
  WebKitGTK capture in about two minutes per OS; all six artifacts were manually
  inspected for native chrome, theme propagation, code, KaTeX, and Mermaid.
- 2026-06-13: RDP-specific Mermaid investigation confirmed that a WebView2
  created in the physical 150% DPI session remains correct after RDP connects,
  while a WebView2 created in the 100% DPI RDP session renders wide flowcharts
  at the old hard-coded 65% scale and paints class/ER `foreignObject` labels at
  a severely reduced scale. Windows now uses SVG labels, wide flowchart sizing
  derives from `devicePixelRatio`, and state/class/ER diagrams are reframed from
  their mounted bounds after fonts settle. The class pass also restores rank
  spacing and removes an empty trailing compartment. GPU disablement, WebView
  zoom, offscreen render zoom, rasterization, and compositor layer promotion
  were discarded. `fixtures/mermaid-cases.md` was accepted in both RDP-created
  and physical Windows sessions; frontend checks, tests, build, and Go tests
  passed. macOS and Linux retain the existing HTML-label path.
- 2026-06-14: Implemented Linux Markdown association. Maakdown now installs an
  idempotent user-level `com.maak.maakdown.desktop` entry at startup without
  changing the default, refreshes the desktop database when available, queries
  the current handler through `xdg-mime`, and changes it only after the explicit
  Settings action. CI run 27527661318 passed Linux-tagged Go tests, frontend
  verification, and Ubuntu UAT; native run 27527648278 built and captured the
  packaged WebKitGTK app. Real file-manager/default acceptance followed on
  2026-06-17; drag/drop and system print remain part of P11.11 native editorial
  acceptance.
- 2026-06-17: Completed the logged-in Linux Markdown-association acceptance
  pass on Debian/GNOME Wayland with WebKitGTK 4.1. The initial desktop entry
  included a quoted `TryExec`, which passed `desktop-file-validate` but caused
  GIO to reject `com.maak.maakdown.desktop` as a handler. Removed `TryExec` and
  added regression coverage. Verified the rebuilt app registers
  `~/.local/share/applications/com.maak.maakdown.desktop`, appears in GIO as a
  registered/recommended `text/markdown` handler, can be set as the default by
  GIO/`xdg-mime`, and opens Markdown files through `gio open` and `xdg-open` as
  tabs in the single running window. GNOME blocked non-interactive screenshots;
  native drag/drop and system print remain under P11.11 editorial acceptance.
- 2026-06-17: Ran an ad hoc P11.11 Linux native editorial verification on the
  same logged-in Debian/GNOME Wayland session. Using isolated `XDG_CONFIG_HOME`
  and `XDG_DATA_HOME` profiles, verified the WebKitGTK 4.1 build starts with
  no document and persists an empty session, opens native Markdown fixtures as
  tabs through cold launch and second-instance launches, loads
  `native-rendering-smoke.md`, `mermaid-cases.md`, `large-10k-lines.md`, and
  the fixture `README.md` with local assets, and preserves light/dark persisted
  theme profiles. `grim` failed because GNOME does not expose the wlroots
  screenshot protocol, GNOME Shell's screenshot D-Bus API returned
  AccessDenied, and `wtype` failed because Mutter does not expose the virtual
  keyboard protocol. Therefore Linux search keyboard paths, native
  drag/drop, and system print/PDF remain manual or future-harness checks under
  P11.11 rather than completed automated coverage.
- 2026-06-18: Updated the pinned Wails v2 baseline from v2.11.x to v2.12.x.
  `go.mod` now uses `github.com/wailsapp/wails/v2 v2.12.0`, and generated
  runtime bindings include the v2.12 notification API surface. Wails v3 remains
  out of scope for v1.
- 2026-06-20: Ran a direct Windows native UI automation acceptance pass against
  the production `build/bin/Maakdown.exe` built from `e684b02`. The pass used
  an isolated `APPDATA`/`LOCALAPPDATA` profile and screenshots under
  `%TEMP%\maakdown-native-acceptance-*\evidence`. Verified clean empty state,
  native second-instance tab opens for `medium-technical-doc.md`,
  `mermaid-cases.md`, and `large-10k-lines.md`, search with highlighted
  offscreen-capable matches, narrow-window rendering,
  light/dark theme toggles, custom Windows title-bar controls, Mermaid
  rendering in WebView2, and WebView2 print preview/cancel. A follow-up pass
  after the drag/drop fix verified Explorer-to-app drag/drop by opening
  `fixtures/README.md` as the active tab in an isolated production-exe profile.
- 2026-06-20: Fixed Windows native drag/drop after the production WebView2 app
  showed the overlay but did not open dropped files. Root cause: Windows Wails
  resolves dropped filesystem paths from the frontend `OnFileDrop` JavaScript
  handler, while Maakdown had disabled external WebView drops globally and only
  listened for the app-level Go `files-dropped` event. Windows now leaves
  external WebView drops enabled; the frontend registers Wails' JS drop handler
  and deduplicates it against the Go event. Verified with a rebuilt
  `build/bin/Maakdown.exe` using an isolated profile: dragging
  `fixtures/README.md` from Explorer opened `README.md - Maakdown`, persisted
  it as the active tab, and rendered the README content. Screenshot evidence:
  `%TEMP%\maakdown-dnd-fixed.png`.
- 2026-06-15: Completed Windows Markdown association (P12.3). Startup now
  idempotently registers a per-user `Maakdown.md` ProgId, five Open With
  extensions, and `Software\Maakdown\Capabilities`/`RegisteredApplications`
  without changing the current default. The Settings row uses Windows-specific
  "Choose default app..." copy, opens the per-user Default Apps page, and
  rechecks when focus returns. Real-session verification confirmed canonical
  `REG_NONE` OpenWith values, the quoted executable command, unchanged `.md`
  UserChoice, and argv opening `mermaid-cases.md` in the built app. Go tests,
  frontend checks/build, focused UAT-09 (5 scenarios), and Windows Wails build
  passed.
- 2026-06-20: Added a distinct Windows Markdown file icon. Windows does not
  synthesize an app-overlay document icon for ProgIds, so Maakdown now embeds a
  standalone document ICO and writes it to `%APPDATA%\Maakdown\markdown.ico`
  before registering `Maakdown.md\DefaultIcon`. Verified by fresh-launching the
  rebuilt Windows app and querying HKCU: `DefaultIcon` was
  `"%APPDATA%\Maakdown\markdown.ico",0` and the icon file existed. `go test
  ./...`, `npm run check`, and `wails build -platform windows/amd64` passed.
- 2026-06-27: Updated the Windows Markdown file icon artwork to keep only the
  standalone document icon, with no app badge overlay. Refreshed the current
  user's `%APPDATA%\Maakdown\markdown.ico`, re-applied
  `HKCU\Software\Classes\Maakdown.md\DefaultIcon`, and requested a shell
  association/icon refresh. Focused Windows icon tests passed:
  `go test -run "TestWindowsIconResource|TestEnsureWindowsMarkdownIcon" .`.
- 2026-07-02: Stabilized document source labels around raw anchors and lists
  (P19.12). The parser now attaches sanitized `data-source-start`,
  `data-source-end`, and `data-source-lines` metadata to top-level rendered
  Markdown elements, plus per-item metadata on list items. `BlockView` prefers
  the rendered element/list-item metadata over the previous block-index
  fallback, so raw HTML anchors and invisible nodes cannot collapse an ordered
  or task list to one source label or shift following heading labels. Verified
  parser regression coverage, focused UAT-05, and an ad hoc large-fixture
  Playwright check on `fixtures/large-10k-lines.md`: Delivery checklist labels
  were `335-340`, Delivery heading was `333`, and Quantitative model was `342`.
  Screenshot evidence: `/tmp/maakdown-large-delivery-line-labels-fixed.png`.
- 2026-07-02: Started P20 reader line numbering redesign after additional
  large-fixture screenshots showed that one-off source-position fixes are still
  producing blank-line gaps and stacked labels. Added
  `docs/reader-line-numbering-spec.md` as a review draft. The key product
  decision is to treat the feature as reader-content line numbers rather than
  physical source-file line numbers: source-only blank lines, invisible anchors,
  and structural spacing do not count; headings, paragraphs, list items, and
  explicit hard breaks count; framed objects such as code, Mermaid, tables, and
  images use one outer document line while their local numbering remains
  separate. Implementation is intentionally deferred until the spec is reviewed.
- 2026-07-03: Revised `docs/reader-line-numbering-spec.md` to v0.2 after
  external research and review of `docs/reader-line-numbering-spec-review.md`.
  The revised decision is a semantic reader Line Map: source-position APIs are
  useful only for source correlation, browser rect APIs only for placement, and
  CSS counters only for simple element numbering. Maakdown will build logical
  reader line numbers in the parser worker from the post-sanitize rendered tree,
  emit stable anchors for lists and hard-break segments, keep code/table/Mermaid
  local numbering separate, derive line stats/digit width from the Line Map
  total, rerun placement after progressive enhancement, and add `Go to line...`
  to P20 scope. At that point no implementation had started, and the v0.2 spec
  was pending explicit user approval before commit.
- 2026-07-03: Incorporated second-pass implementation clarifications into the
  P20 line-numbering spec. Reader-line labels should be owned by each mounted
  `BlockView` in wrappers outside enhancement-owned content, while CSS aligns
  them to one visual gutter column; a detached document-wide overlay is
  explicitly disallowed. Reader-line anchors are trusted only when injected
  after sanitization and must not be sanitize-allow-listed, preventing forged
  raw HTML attributes from influencing numbering. Hard-break support now prefers
  empty parser-injected marker anchors after `<br>` instead of inline tree
  splitting, and the test plan now includes forged anchors, inline formatted
  hard breaks, unmounted go-to-line targets, and shared copy-exclusion
  decoration constants. These spec changes remained uncommitted until the user
  explicitly asked to commit the specs.
- 2026-07-03: Implemented the P20 semantic reader Line Map after explicit user
  approval. The parser worker now emits `Block.readerLines` and
  `DocumentModel.readerLineCount` from the post-sanitize rendered tree, injects
  trusted `data-reader-line-anchor` attributes only after sanitization, strips
  forged author anchors, counts list items and hard-break segments as reader
  lines, and treats code, Mermaid, and tables as one outer document line with
  local numbering left separate. `BlockView` renders `.reader-line` labels in
  the mounted wrapper, `DocumentView` derives gutter digit width from
  `readerLineCount` and can scroll to a reader line, the masthead reports
  reader-line stats, copy handling shares reader decoration exclusion constants,
  and the command palette includes `Go to line...`. The benchmark harness now
  closes Settings before deep-anchor navigation and reports `readerLineCount`.
  Verification passed: `npm test -- --run
  src/core/pipeline/parseDocument.test.ts src/core/stats/documentStats.test.ts`,
  full `npm test`, `npm run check`, `npm run build`, focused UAT-05, and
  `npm run benchmark` with `large-10k-lines.md` reporting 2,606 blocks, 3,626
  reader lines, bounded mounted blocks, and deep anchor offset `0`.
- 2026-07-03: Fixed wrapped code-block numbering after user feedback. Code
  line numbers now render as logical source-line rows inside `BlockView`: each
  source line owns one number cell and one code cell, so a wrapped line expands
  its row while continuation visual rows stay unnumbered. Highlight.js and
  Shiki markup are preserved by splitting text nodes at newline boundaries and
  cloning token spans per line. Code line-number cells are part of the shared
  copy-exclusion chrome, and context-menu code copy now uses the same sanitized
  DOM text path. Verification passed: focused UAT-05 wrapped-code regression,
  `npm run check`, full `npm test`, and `npm run build`.
- 2026-07-03: Made Shiki JS-regex the default highlighter and moved the
  highlighter engine switch out of Settings into explicit command palette
  actions (`Use Shiki highlighter`, `Use Highlight.js highlighter`). Backend
  config defaults now use Shiki but still accept persisted Highlight.js values
  so the command-palette fallback remains reversible. The benchmark assumes
  Shiki is default rather than toggling it in Settings, and UAT-05 verifies the
  Settings control is hidden while the palette switches engines both ways.
  Verification passed: `go test ./internal/config`, `go test ./...`,
  `npm run check`, full `npm test`, focused UAT-05, `npm run build`, and
  `npm run benchmark`.

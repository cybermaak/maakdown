# Markdown Viewer - Implementation Plan

**Status:** Draft  
**Version:** 0.6
**Date:** 2026-06-06
**Companion:** `docs/markdown-viewer-design-spec.md`

## 1. Pinned Technical Choices

| Concern | Choice |
|---|---|
| Desktop shell | Wails v2.11.x stable line |
| Backend | Go |
| Frontend | Svelte 5.x + TypeScript + Vite 8.x |
| Markdown pipeline | unified/remark/rehype |
| Math | KaTeX |
| Default highlighter | highlight.js |
| Optional highlighter evaluation | Shiki with JavaScript RegExp engine, selectable in Reader Settings |
| Diagrams | Mermaid, lazy-loaded |
| Local assets | Go `AssetService` + loopback-only HTTP asset server with tokenized URLs |
| Dynamic Wails asset handler | Not used for Markdown document assets in v1 |
| Wails v3 | Not used until it reaches stable and is scheduled as a migration |
| Design language | Maakdown design system under `docs/design-system/` |
| UI icons | pinned `@lucide/svelte`; no runtime CDN |
| UI fonts | self-hosted licensed Inter and JetBrains Mono with verified weight files |

This plan deliberately removes the prior "evaluate Wails v3 later" ambiguity. P0 starts on Wails v2.11.x, Svelte 5.x, and Vite 8.x, then records exact versions in `go.mod`, `wails.json`, and `frontend/package.json`.

## 2. Repository Layout

```text
maakdown/
├── docs/
│   ├── markdown-viewer-design-spec.md
│   └── markdown-viewer-implementation-plan.md
├── wails.json
├── go.mod
├── main.go
├── app.go
├── internal/
│   ├── appsvc/
│   ├── fileservice/
│   ├── assetservice/
│   ├── linkservice/
│   ├── vault/
│   ├── config/
│   └── watcher/
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── wailsjs/
    └── src/
        ├── main.ts
        ├── App.svelte
        ├── ipc/
        ├── stores/
        ├── components/
        ├── styles/
        └── core/
            ├── pipeline/
            ├── model/
            ├── navigation/
            ├── virtualizer/
            ├── highlight/
            ├── mermaid/
            ├── math/
            ├── sanitize/
            ├── assets/
            ├── formatting/
            ├── errors/
            ├── theme/
            ├── workers/
            ├── design-system/
            ├── workspace/
            ├── search/
            ├── commands/
            └── print/
```

## 3. Backend Constructs

### `App`

Wails lifecycle owner. Constructs services once, binds service facades, and releases watchers/object caches on shutdown.

### `FileService`

- `OpenDocument() -> OpenDocumentResult`
- `OpenDocumentAt(path string) -> OpenDocumentResult`
- `ReadDocument(path string) -> DocumentBytes`

`OpenDocumentResult` includes canonical file path, contents, document directory, detected trusted root, file mtime, and optional vault context.

### `WatcherService`

Maintains path-scoped watchers for all open documents. Public operations are:

- `WatchDocument(path string)`
- `UnwatchDocument(path string)`
- `UnwatchAll()`

Each registration watches the parent directory of its canonical file path. It handles:

- write events
- remove/create
- atomic rename safe-save
- event burst debounce
- rearming after rename

It emits `file-changed` with the canonical path only after coalescing and verifying the target is readable. Parent directories shared by multiple documents may share one underlying `fsnotify` watcher, but registrations and events remain file-specific.

### `AssetService` and loopback asset server

Owns safe local asset loading.

Methods:

- `ResolveAsset(documentPath, rawRelativePath) -> AssetRef`
- `RevokeAsset(assetRef)` optional cache hint

`AssetRef` is an opaque id plus a tokenized loopback URL, not a filesystem path. The backend serves bytes through a minimal HTTP server bound to `127.0.0.1` on a random port. The URL includes an unguessable per-session token and an opaque asset id.

HTTP server rules:

- accept `GET` and `HEAD` only
- reject missing/invalid token
- serve only ids created by `ResolveAsset`
- set exact MIME type and `X-Content-Type-Options: nosniff`
- no directory listing, redirects, filesystem paths, CORS wildcard, or request body
- use normal browser image loading/caching instead of Wails JSON-IPC payload transfer

Security requirements:

- canonicalize with `filepath.Clean`
- resolve symlinks before root comparison
- reject paths outside trusted root
- MIME sniff and extension allowlist
- max file size
- stricter SVG sanitizer or SVG block

The frontend assigns the tokenized URL lazily when image blocks enter or near the viewport.

### `LinkService`

`OpenExternal(url string)` accepts only approved schemes and delegates to the OS browser. The frontend intercepts external links before the WebView navigates.

### `VaultResolver`

Builds and maintains a vault note index. It is optional until P4.

The worker cannot call Wails bindings, so the resolver contract is snapshot-based:

- main thread loads or refreshes `VaultIndex`
- parser worker receives the index snapshot when the worker starts or when the index changes
- unresolved wikilinks are returned as unresolved link records

The worker stores the latest `VaultIndex` in worker-global memory. Individual `parseDocument` calls pass only a vault index version id, not the full index.

### `SettingsService`

Persists settings and workspace session state as versioned JSON in the operating system application-data directory.

Stored settings include theme, frontmatter display mode, highlighter engine, typography, panel dimensions, trusted-folder preferences, and performance/debug settings.

The production settings surface exposes theme, frontmatter mode, typography,
panel behavior, and other reader preferences. The Shiki engine selector remains
behind a development/evaluation flag and is not normal reader chrome.

Stored session state includes ordered tab paths, active tab, per-document reading positions, and recent files. Writes use a temporary file, sync/close, and atomic rename. Invalid or unsupported data falls back to defaults without preventing startup.

### `DesktopService`

Owns native desktop integration:

- registers file-drop handling and emits canonical dropped paths
- updates the active window title
- invokes system printing
- exposes application-data paths needed by settings persistence
- bridges native menu callbacks into the shared frontend command registry

## 4. Design System Foundation

P8 lands before workspace features and creates the production visual API.

### Source material

- `docs/design-system/README.md` contains adoption rules and caveats.
- `docs/design-system/reference/tokens/` contains the exported token baseline.
- `docs/design-system/reference/mock/` contains composition and interaction references.
- `docs/design-system/reference/screenshots/` contains visual acceptance references.

The exported React code is not copied into the Svelte runtime. It is used to
derive component contracts, dimensions, states, and interaction intent.

### Token architecture

Production styles are split into:

- raw light/dark palette
- semantic colors
- typography and font faces
- spacing and layout rails
- radius, borders, elevation, and motion
- reader appearance aliases
- component-level tokens only when a shared semantic token is insufficient

Feature CSS consumes semantic variables. Token names are stable APIs and changes
require light/dark visual regression updates.

### Fonts and icons

- Use pinned Fontsource packages for genuine, licensed, weight-specific Inter
  400/500/600/700 and JetBrains Mono 400/500 assets.
- Bundle and load the required subsets locally with `font-display: swap`;
  production must not depend on a font CDN.
- Record package source, license, version, and subset coverage.
- Install and pin `@lucide/svelte`; do not use CDN scripts or manually copied SVG
  paths.

### Svelte primitives

Implement typed, accessible Svelte primitives for:

- `Button`, `IconButton`, and `SegmentedControl`
- `Badge`, `Tag`, and `StatusIndicator`
- `TocItem`, `Callout`, `CodeBlockChrome`, and `Wikilink`
- `Dialog`, `Popover`, `Toolbar`, and `Tab`

Primitives own dimensions, interaction states, focus treatment, icons, and
token usage. Feature components compose them instead of reproducing their CSS.

### Foundation acceptance harness

Create a development-only design-system gallery that renders every primitive
and state in light and dark themes. Playwright captures fixed desktop and narrow
viewport screenshots and checks for overflow, missing fonts/icons, inaccessible
names, and token/state regressions.

## 5. Frontend Core Constructs

### `core/pipeline`

- `buildProcessor(options)` assembles the sanitized Markdown pipeline.
- `parseDocument(request)` runs in parser worker and returns `ParsedDocument`.
- It does not call Wails bindings.
- It does not highlight code or render Mermaid.
- It runs `rehype-sanitize` inside the worker.
- It emits already-sanitized block HTML strings and metadata, not a full HAST graph.
- The main thread treats returned block HTML as renderable output from the trusted parser worker, but any later enhancement HTML must also be sanitized or generated by trusted renderers with constrained schemas.

### `core/model`

Types:

- `DocumentModel`
- `Block`
- `Heading`
- `AnchorTarget`
- `FootnoteTarget`
- `AssetReference`
- `EnhancementState`
- `WorkspaceState`
- `DocumentTab`
- `PersistedSession`
- `RecentDocument`
- `NavigationHistoryEntry`
- `DocumentSearchState`
- `SearchResult`

`buildDocumentModel(parsed)` creates:

- ordered blocks
- `anchorIndex`
- heading outline
- footnote/backlink map
- asset reference map
- list of languages used by visible code blocks

Workspace model requirements:

- `WorkspaceState` owns ordered tabs, active tab id, recently closed tabs, recents, and restoration state.
- `DocumentTab` owns canonical path, display name, load/error state, parsed model, reader position, navigation history, search state, and file-change status.
- `PersistedSession` stores paths and serializable reader state only; parsed models and enhancement caches are not persisted.
- `RecentDocument` records canonical path, display name, and last-opened timestamp.
- `NavigationHistoryEntry` identifies a path, optional anchor/block, and relative offset.
- `SearchResult` identifies a block id, block-local text offsets, and preview text.

The canonical path is the document identity. Opening an existing identity activates its tab rather than creating another model or watcher.

### `core/navigation`

Owns virtualized document navigation:

- `scrollToAnchor(anchorId)`
- `scrollToBlock(blockId, align)`
- `getActiveHeading(visibleRange)`
- `restorePosition(previousPosition, newModel)`

No component should use native hash scrolling directly.

Navigation history is per tab. File and anchor transitions push entries unless they are caused by back/forward replay or passive scroll-spy updates. History traversal may activate another tab or open the target path if it is no longer open.

### `core/workspace`

Owns tab and session orchestration:

- open, activate, close, and reopen tabs
- deduplicate canonical paths
- select the nearest tab after close
- maintain per-tab reader and search state
- serialize and restore session state
- coordinate watcher registration and cleanup
- ensure only the active tab is mounted and enhanced

Tabs restored from missing files remain recoverable error tabs. A relocate action replaces the missing path after the user selects the moved document.

### `core/search`

Builds a lightweight search projection from each block's plain text.

- Matching supports case-sensitive and whole-word options.
- The result count is computed over every block in the active document model;
  virtualization affects marks and navigation, not count accuracy.
- Results preserve document order and use block-local offsets.
- Next/previous wraps within the active document.
- Selecting a result routes through virtualized block navigation and anchor stabilization.
- Mounted result blocks receive temporary `<mark>` output without changing parser-produced sanitized HTML.
- Search state is retained independently per tab.

### `core/formatting`

Owns locale-aware presentation for dates and local date-times, file and asset
sizes, counts and result summaries, and durations/performance values.
Formatting functions accept explicit locale and time-zone options for
deterministic tests. UI components do not call raw `Date.toString()` or
duplicate formatting rules.

### `core/errors`

Maps backend, parser, and watcher failures to a typed reader error taxonomy:
missing file, permission denied, oversized file or asset, unsupported type,
parse failure, watcher lost, blocked asset, and unresolved wikilink. Each type
defines severity, user-facing message, recovery commands, presentation scope,
and optional diagnostic detail.

### `core/commands`

Defines one registry for native menus, keyboard shortcuts, toolbar actions, and the command palette.

Each command provides id, label, optional shortcut, enabled predicate, keywords, and execute callback. Initial commands cover open, close/reopen tab, next/previous tab, reload, find, command palette, navigation back/forward, print, focus mode, panel visibility, theme, and reader appearance.

### `core/virtualizer`

Block-level virtualizer with dynamic height measurement.

Requirements:

- materialize target block before anchor scroll
- preserve height estimates for unmounted blocks
- use multi-pass anchor stabilization: estimate, scroll, measure, correct, and stop after tolerance or retry cap
- expose visible range for scroll-spy
- keep mounted block count bounded
- support reload position restoration

### `core/highlight`

Interface:

```ts
interface Highlighter {
  init(languages: string[], theme: string): Promise<void>;
  highlight(blockId: string, code: string, lang: string): Promise<string>;
  setTheme(theme: string): Promise<void>;
  dispose(): Promise<void>;
}
```

Implementations:

- `HighlightJsHighlighter`: v1 default, viewport-only.
- `ShikiJsRegexHighlighter`: optional evaluation implementation using Shiki JavaScript RegExp engine. No Oniguruma/WASM path in v1.
- `InstrumentedHighlighter`: records latency and approximate process/RSS deltas.

Scheduling:

- parser worker is separate from highlighter work
- visible code blocks are prioritized
- offscreen highlight requests are cancellable
- raw code remains readable if highlighting is delayed
- highlighter selection is persisted in Reader Settings; compact toolbar chrome
  still treats highlighting as an implementation detail

### `core/mermaid`

`MermaidManager` lazy-loads Mermaid after the first visible Mermaid block. It keeps a small visible-render cache and rerenders visible diagrams on theme switch.

### `core/assets`

Rewrites image nodes to a placeholder with `data-asset-ref`. `BlockView` resolves and assigns the tokenized loopback URL when the block nears the viewport. Eviction may call `RevokeAsset` as a cache hint but does not need Blob URL cleanup.

### `core/theme`

Theme change:

1. update CSS variables
2. call `highlighter.setTheme`
3. rerender visible Mermaid diagrams
4. do not reparse Markdown

### `core/print`

Coordinates complete-document print preparation:

1. capture active tab position and interactive virtualizer state
2. mount a print-only complete document representation
3. show cancellable preparation progress and force printable enhancement work
4. complete asset, code, KaTeX, and Mermaid rendering or safe fallback output
5. invoke the backend system-print command
6. remove print representation and restore the interactive view and position
   from a `finally`-style cleanup path on success, cancellation, or error

Print styles hide all application chrome and format links, tables, code, callouts, diagrams, images, and page breaks for paper/PDF output.

## 6. UI Constructs

- `AppShell`: shell layout.
- `TabStrip`: ordered tabs, active state, file status, close controls, and horizontal overflow.
- `Toolbar`: stable navigation, document-identity, and reader-control zones with
  icon commands for open, navigation, reload, palette/find, focus, and panel visibility.
- `CommandPalette`: searchable commands, open tabs, recent files, headings, and settings.
- `SearchBar`: current-document query, options, result count, and previous/next controls.
- `TocSidebar`: uses `navigation.scrollToAnchor`.
- `DocumentView`: owns virtualizer and visible range.
- `BlockView`: renders sanitized block HTML and starts asset/highlight/diagram enhancement.
- `MetadataPanel`: frontmatter.
- `SettingsSurface`: theme, metadata mode, typography, panel, and
  development/evaluation settings reached through the palette.
- `RecentDocuments`: empty-state recent files and missing-file cleanup.
- `DiagramDialog`: zoomable Mermaid inspection with modal focus management.
- `ReaderAppearancePopover`: font, size, line height, and measure controls.
- `StatusBar`: path, reload state, enhancement progress, blocked asset count.

Svelte components are presentation and orchestration only. Parsing, sanitizing, resolving, highlighting, and diagram rendering stay in `core/`.

The shell uses a native-editorial visual system. Panels are resizable and collapsible; metadata collapses before the TOC at narrow widths, after which side panels become drawers. Focus mode hides tabs and secondary chrome without destroying their state.

The approved composition uses two top rows: the toolbar and a 38px tab strip.
The toolbar carries outline visibility, active document identity, watch status,
command entry, find, reading display, theme, metadata, and focus actions. The
metadata inspector uses badges for semantic status and chips for tags. The
empty state uses the provisional `M` mark, file drop, open action, recents, and
missing-file state.

The toolbar never shows the active highlighter engine in production. The
sidebar renders identity first, then a labelled `Outline` group. Reader CSS
caps prose at the selected measure while allowing diagrams, wide tables, and
code blocks to opt into a wider measure. Heading links are ink-colored and
expose copy-link affordances only on hover or keyboard focus.

## 7. Data Flow

Open:

1. `Toolbar.open` calls `ipc.openDocument`.
2. Backend returns contents, canonical path, document dir, trusted root, and optional vault id.
3. Main thread sends `VaultIndex` to the parser worker only if the index changed.
4. Parser worker receives source + path metadata + vault index version id.
5. Worker returns parsed block records, headings, anchors, footnotes, frontmatter, asset references, and unresolved wikilinks.
6. `buildDocumentModel` creates navigation indexes.
7. `DocumentView` renders visible base text through the virtualizer.
8. Visible blocks request assets/highlighting/Mermaid as needed.

Open into workspace:

1. file picker, file drop, recent item, local Markdown link, or wikilink produces a path
2. backend canonicalizes and opens the document
3. workspace activates an existing canonical-path tab or inserts a new tab
4. new tabs register a path watcher and update recents
5. the previous active tab records its reader position and unmounts
6. the new active tab mounts its document view and restores its position
7. local Markdown links and wikilinks keep the source tab available by opening or activating the target tab
8. unresolved wikilinks remain inline and do not enter the tab lifecycle
9. folder drops emit an unsupported-drop status; vault/folder opening remains out of scope

Anchor navigation:

1. click TOC/internal/footnote link
2. `navigation.scrollToAnchor`
3. resolve anchor to block id
4. virtualizer materializes/measures target block
5. scroll to estimated offset, measure, correct, and stabilize within tolerance

Watch reload:

1. `WatcherService` coalesces file events.
2. frontend receives `file-changed`.
3. current visible anchor/block is captured.
4. parse pipeline reruns.
5. `restorePosition` maps old anchor/block to the new model.

Session restoration:

1. backend loads and validates the versioned persisted session
2. frontend creates ordered loading tabs and selects the saved active tab
3. documents are opened with bounded concurrency
4. missing documents become recoverable error tabs
5. only the active restored tab mounts its reader
6. successful opens register watchers and refresh recents
7. each tab restores its anchor/block position when first activated
8. local asset references resolve again against the current process token; no
   persisted loopback URL is reused

Search:

1. active tab query/options update
2. search core scans all block plain text and emits the truthful total plus ordered results
3. selecting a result navigates to its block through the virtualizer
4. mounted target content marks the matching text and receives focus context

Print:

1. print command freezes the active tab's reader position
2. complete print representation mounts outside the interactive virtualizer
3. UI reports cancellable preparation progress
4. all printable enhancements settle or produce safe fallbacks
5. backend invokes the system print dialog
6. a guaranteed cleanup path removes the print representation and restores the reader

### P10 execution order

1. Remove evaluation internals from product chrome and land the shared formatting/error contracts.
2. Ship a thin command palette over the existing P9 command ids.
3. Add full-model search projection and virtualizer-aware result navigation.
4. Add history, copy tools, Mermaid inspection, and reload state.
5. Add guarded complete-document print preparation and native print.

## 8. IPC Contract

All Wails generated calls are wrapped in `frontend/src/ipc`.

Required wrappers:

- `openDocument`
- `openDocumentAt`
- `readDocument`
- `watchDocument`
- `unwatchDocument`
- `unwatchAllDocuments`
- `onFileChanged`
- `resolveAsset`
- `revokeAsset`
- `openExternal`
- `getConfig`
- `setConfig`
- `getSession`
- `setSession`
- `onFilesDropped`
- `setWindowTitle`
- `printWindow`
- `getVaultIndex`

Generated `wailsjs/` imports are forbidden outside `ipc/`.

## 9. Milestones

| Phase | Goal | Deliverables | Exit Criteria |
|---|---|---|---|
| P0 | Scaffold | Wails v2.11.x app, Svelte 5.x/Vite 8.x frontend, IPC wrappers, config, CI skeleton | Empty app builds locally; exact versions pinned |
| P1 | Safe base renderer | file open, parse worker, sanitize schema, frontmatter, base blocks, non-virtualized view, external links | GFM fixture renders safely; frontmatter hidden/panel works |
| P2 | Navigation model | heading/anchor/footnote indexes, TOC, internal anchors, scroll-spy | TOC, `#anchor`, and footnote backlinks pass tests without virtualization |
| P3 | Assets and watcher | trusted root detection, `AssetService`, lazy images, watcher debounce/safe-save | relative images render within root; traversal blocked; safe-save reload works |
| P4 | Rich enhancements | highlight.js, optional Shiki JS-regex evaluator, Mermaid, theme propagation | code/diagrams/math render; delayed enhancement never blocks reading |
| P5 | Virtualized large docs | virtualizer, anchor-aware scroll, restore position, visible enhancement scheduling | 10k-line fixture has bounded DOM and working anchors/TOC |
| P6 | Notes support | vault index, wikilink resolution, open target note | wikilinks navigate within configured vault; unresolved state is clear |
| P7 | Release hardening | cross-platform packaging, perf harness, security fixtures, docs | targets recorded on Windows/macOS/Linux; blockers resolved |
| P8 | Design system foundation | canonical tokens/themes, verified fonts, Lucide, Svelte primitives, component gallery | existing reader can consume the design API; light/dark primitive acceptance passes |
| P9 | Desktop workspace | tabs, multi-path watchers, persisted sessions, recents, drag-and-drop, native commands | tabs restore and switch safely; inactive tabs do not render or enhance |
| P10 | Reading productivity | surface corrections, formatting/errors, command palette, current-document search, navigation history, copy tools, diagram inspection, guarded print/PDF | long-document search/navigation and complete printing pass integration tests |
| P11 | Editorial experience | approved mock composition, typography, focus mode, responsive panels, accessibility | visual, keyboard, narrow-window, light/dark, and accessibility acceptance passes |

## 10. Test Plan

Unit:

- token schema and semantic alias completeness
- design primitive props and interaction states
- pipeline feature fixtures
- sanitize allowlist and malicious HTML
- anchor/footnote index construction
- trusted-root path resolution
- SVG sanitizer/blocker
- watcher event coalescing

Integration:

- design-system gallery in light, dark, and system themes
- production reader migration to shared primitives without behavior regressions
- open representative README
- open docs with parent-directory images
- click TOC/internal anchor/footnotes in virtualized mode
- external link interception
- theme switch with visible code and Mermaid
- safe-save reload and position restore
- open, deduplicate, reorder, close, and reopen tabs
- restore sessions with valid and missing documents
- drag files into the application and open recent documents
- follow local Markdown links and wikilinks across tabs
- search and navigate matches in virtualized documents
- invoke commands through native menus, shortcuts, and palette
- copy code/heading links and inspect Mermaid diagrams
- prepare and print the complete document, then restore the reader
- cancel print preparation and verify cleanup/restoration
- format metadata under fixed locale/time-zone fixtures
- render and recover from every reader error category
- switch focus mode and reader appearance without reparsing

Performance:

- small README
- few-hundred-KB technical doc
- 10k-line synthetic doc
- code-heavy doc
- Mermaid-heavy doc
- several large open tabs with one active renderer
- restored multi-tab session
- search-heavy large document
- complete-document print preparation

Metrics:

- open-to-first-text
- open-to-fully-enhanced visible range
- highlight latency by engine
- Mermaid render latency
- mounted block count
- process RSS before/after large docs
- scroll frame timing
- inactive-tab memory
- active-tab switch latency
- session restoration time
- search latency
- print preparation time
- total mounted blocks and enhancement work across several open tabs

Accessibility and visual:

- approved mock-reference comparison for toolbar, tab strip, outline, metadata, reader, empty state, palette, and focus mode
- ARIA tab, toolbar, search, dialog, and status semantics
- full keyboard workflow and visible focus
- command palette and diagram-dialog focus trap/restoration
- screen-reader announcements for async reader state
- reduced-motion and high-contrast behavior
- light/dark, empty, single-tab, multi-tab, search, focus, and narrow-window screenshots

## 11. Release Constraints

- No Wails v3 in v1.
- No Shiki Oniguruma/WASM in v1 product path.
- No highlighter-engine selector in the compact toolbar; Reader Settings owns it.
- No native hash scrolling in document content.
- No raw `file://` image loading.
- No image byte/base64 transfer over Wails IPC for normal document rendering.
- No generated Wails imports outside `ipc/`.
- No full-document live DOM for large documents.
- No simultaneous mounted document readers for inactive tabs.
- No multiple native windows in P9-P11.
- No editing, annotations, durable bookmarks, vault-wide search, tags, or transclusion in P9-P11.
- No custom PDF renderer; PDF output uses the platform print flow.
- No React prototype code, runtime CDN, generated global design-system bundle, or inline-style architecture in production.
- No unverified font exports; production font files require recorded source, license, and distinct expected hashes.
- No feature-local control styling when an approved P8 primitive covers the behavior.

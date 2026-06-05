# Markdown Viewer - Implementation Plan

**Status:** Draft  
**Version:** 0.3  
**Date:** 2026-06-05  
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
| Optional highlighter evaluation | Shiki with JavaScript RegExp engine only |
| Diagrams | Mermaid, lazy-loaded |
| Local assets | Go `AssetService` + loopback-only HTTP asset server with tokenized URLs |
| Dynamic Wails asset handler | Not used for Markdown document assets in v1 |
| Wails v3 | Not used until it reaches stable and is scheduled as a migration |

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
            ├── theme/
            └── workers/
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

Watches the parent directory of the open file. It handles:

- write events
- remove/create
- atomic rename safe-save
- event burst debounce
- rearming after rename

It emits `file-changed` only after coalescing and verifying the target is readable.

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

### `ConfigService`

Persists theme, frontmatter display mode, highlighter engine, trusted-folder preferences, and performance/debug settings.

## 4. Frontend Core Constructs

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

`buildDocumentModel(parsed)` creates:

- ordered blocks
- `anchorIndex`
- heading outline
- footnote/backlink map
- asset reference map
- list of languages used by visible code blocks

### `core/navigation`

Owns virtualized document navigation:

- `scrollToAnchor(anchorId)`
- `scrollToBlock(blockId, align)`
- `getActiveHeading(visibleRange)`
- `restorePosition(previousPosition, newModel)`

No component should use native hash scrolling directly.

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

## 5. UI Constructs

- `AppShell`: shell layout.
- `Toolbar`: open file, theme, highlighter display, reload.
- `TocSidebar`: uses `navigation.scrollToAnchor`.
- `DocumentView`: owns virtualizer and visible range.
- `BlockView`: renders sanitized block HTML and starts asset/highlight/diagram enhancement.
- `MetadataPanel`: frontmatter.
- `StatusBar`: path, reload state, enhancement progress, blocked asset count.

Svelte components are presentation and orchestration only. Parsing, sanitizing, resolving, highlighting, and diagram rendering stay in `core/`.

## 6. Data Flow

Open:

1. `Toolbar.open` calls `ipc.openDocument`.
2. Backend returns contents, canonical path, document dir, trusted root, and optional vault id.
3. Main thread sends `VaultIndex` to the parser worker only if the index changed.
4. Parser worker receives source + path metadata + vault index version id.
5. Worker returns parsed block records, headings, anchors, footnotes, frontmatter, asset references, and unresolved wikilinks.
6. `buildDocumentModel` creates navigation indexes.
7. `DocumentView` renders visible base text through the virtualizer.
8. Visible blocks request assets/highlighting/Mermaid as needed.

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

## 7. IPC Contract

All Wails generated calls are wrapped in `frontend/src/ipc`.

Required wrappers:

- `openDocument`
- `openDocumentAt`
- `readDocument`
- `startWatch`
- `stopWatch`
- `onFileChanged`
- `resolveAsset`
- `revokeAsset`
- `openExternal`
- `getConfig`
- `setConfig`
- `getVaultIndex`

Generated `wailsjs/` imports are forbidden outside `ipc/`.

## 8. Milestones

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

## 9. Test Plan

Unit:

- pipeline feature fixtures
- sanitize allowlist and malicious HTML
- anchor/footnote index construction
- trusted-root path resolution
- SVG sanitizer/blocker
- watcher event coalescing

Integration:

- open representative README
- open docs with parent-directory images
- click TOC/internal anchor/footnotes in virtualized mode
- external link interception
- theme switch with visible code and Mermaid
- safe-save reload and position restore

Performance:

- small README
- few-hundred-KB technical doc
- 10k-line synthetic doc
- code-heavy doc
- Mermaid-heavy doc

Metrics:

- open-to-first-text
- open-to-fully-enhanced visible range
- highlight latency by engine
- Mermaid render latency
- mounted block count
- process RSS before/after large docs
- scroll frame timing

## 10. Release Constraints

- No Wails v3 in v1.
- No Shiki Oniguruma/WASM in v1 product path.
- No native hash scrolling in document content.
- No raw `file://` image loading.
- No image byte/base64 transfer over Wails IPC for normal document rendering.
- No generated Wails imports outside `ipc/`.
- No full-document live DOM for large documents.

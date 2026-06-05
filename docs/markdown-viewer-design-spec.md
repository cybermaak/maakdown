# Markdown Viewer - Product and Technical Design Specification

**Status:** Draft  
**Version:** 0.3  
**Date:** 2026-06-05  
**Companion:** `docs/markdown-viewer-implementation-plan.md`

## 1. Overview

Maakdown is a cross-platform desktop Markdown **viewer** for technical documents and personal notes. It opens local Markdown files and renders CommonMark/GFM plus math, diagrams, code, frontmatter, callouts, local images, internal anchors, and notes-style wikilinks.

It is not an editor. There is no live preview loop, collaboration, cloud sync, mobile target, or full Pandoc/academic feature set in v1.

## 2. Goals

- Render common technical Markdown accurately and safely.
- Feel fast: first readable text appears quickly, scrolling remains smooth, and expensive enhancements happen progressively.
- Keep memory bounded for large documents by limiting live DOM size.
- Use existing rendering libraries instead of writing parsers/renderers from scratch.
- Ship on Windows, macOS, and Linux from one codebase.

## 3. V1 Scope

| Capability | Priority | Notes |
|---|---:|---|
| CommonMark basics | Must | headings, lists, emphasis, links, code, blockquotes |
| GFM tables, task lists, strikethrough, autolinks, footnotes | Must | footnote navigation must work with virtualization |
| Fenced code highlighting | Must | highlight.js is v1 default |
| Inline and block math | Must | KaTeX |
| Mermaid fenced diagrams | Must | lazy-loaded and rendered on viewport entry |
| YAML frontmatter | Must | extracted to metadata, never body-rendered |
| GitHub/Obsidian callouts | Must | sanitized class allowlist |
| Local relative images | Must | resolved through bounded asset service |
| Sidebar TOC | Must | click-to-scroll and scroll-spy |
| Internal `#anchor` links | Must | virtualizer-aware |
| Wikilinks `[[Note Name]]` | Should | notes phase; explicit resolver/index |
| Embeds/transclusion `![[Note]]` | Out | recursive resolution and cycle handling deferred |
| Tags/search | Out | future notes index |
| Mobile | Out | desktop-only; changing this reopens platform choice |

## 4. Functional Requirements

- **F1 Open/render:** open one Markdown file from disk and render it.
- **F2 Rich Markdown:** support all must-have capabilities in §3.
- **F3 TOC:** generate a heading outline with click-to-scroll and scroll-spy.
- **F4 Local assets:** resolve relative image paths against a trusted root and render them without exposing arbitrary file reads.
- **F5 Links:** external links open in the system browser; internal anchors scroll within the document; footnote links round-trip; wikilinks open a resolved target note when available.
- **F6 Themes:** support light/dark themes across document CSS, highlighter, KaTeX, and Mermaid.
- **F7 Frontmatter:** show frontmatter in a configurable metadata panel or hide it.
- **F8 Reload:** if the open file changes externally, debounce and reload while preserving reader position where possible.

## 5. Non-Functional Requirements

- **NF1 Memory:** live DOM is bounded by virtualizing block-level content for large documents.
- **NF2 Load speed:** typical documents reach first meaningful paint quickly; code and diagrams may enhance after text appears.
- **NF3 Snappiness:** parsing and expensive highlighting do not block scroll frames.
- **NF4 Security:** all rendered HTML is sanitized; links and local assets are constrained.
- **NF5 Cross-platform predictability:** the v1 feature set must avoid known unstable runtime paths in system WebViews.

## 6. Platform Decision

**Choice: Wails v2.11.x stable line + Go backend + Svelte 5.x + Vite 8.x + TypeScript frontend. Do not use Wails v3 for v1.**

Rationale:

- Wails v2 is the stable line; Wails v3 is still distributed as alpha/pre-release software.
- The app is frontend-heavy, and Go is sufficient for file I/O, link routing, config, filesystem watching, and asset access.
- System WebViews meet the memory goal better than Electron.
- Wails v2 has known dynamic asset-handler limitations with Vite 5+. To keep modern frontend tooling available, v1 must not depend on Wails v2 `AssetsHandler` for local Markdown images.

**Frontend build choice:** Svelte 5.x + TypeScript + Vite 8.x. Static frontend bundling still uses Vite; Markdown document assets use the loopback asset server in §10.

## 7. Rendering Architecture

The frontend owns Markdown processing using unified/remark/rehype:

```text
remark-parse
remark-gfm
remark-frontmatter
remark-math
remark-rehype allowDangerousHtml
rehype-raw
rehype-katex
rehype-callouts
rehype-slug
rehype-autolink-headings
rehype-sanitize extendedSchema
rehype-stringify
```

Syntax highlighting and Mermaid are **not** performed in this parse pipeline. They are progressive enhancements attached to block records.

The parser returns a `DocumentModel`:

- frontmatter object
- heading outline
- footnote/anchor index
- ordered block list
- per-block enhancement flags: `none`, `code`, `mermaid`
- per-block stable ids and source positions where possible

For worker transfer, return serialized block records and HTML strings, not large HAST object graphs. `rehype-sanitize` runs **inside the parser worker** before any HTML crosses to the main thread. The main thread may render returned block HTML, but must not append any new unsanitized HTML during enhancement.

## 8. Virtualized Navigation Model

Native browser hash scrolling is not sufficient because offscreen blocks may not exist in the DOM. The app must own navigation:

- `anchorIndex: Map<string, BlockId>` for headings, footnotes, and generated anchors.
- `scrollToAnchor(anchorId)` resolves to block id, asks the virtualizer to materialize/measure the target, then scrolls to the computed offset.
- Dynamic-height anchor scrolling is stabilizing, not one-shot: scroll to the best estimated offset, measure the mounted range, correct the offset, and repeat until the target is within tolerance or a bounded retry limit is reached.
- TOC scroll-spy uses virtualizer measurements and visible block ids, not raw DOM queries over the full document.
- Footnote backlinks use the same anchor index.

This model is required before enabling virtualization in P3.

## 9. Progressive Enhancement

- **Code:** highlight.js is the default v1 engine. It runs on visible blocks only, scheduled through idle callbacks or a dedicated highlighter worker when needed.
- **Shiki:** retained as an optional evaluation engine, but only with Shiki's JavaScript RegExp engine for v1. Do not ship Shiki's Oniguruma/WASM engine in the product path because it adds CSP/WASM/WebView risk without being required for v1.
- **Mermaid:** lazy-load on first visible Mermaid block; render visible diagrams only; rerender visible diagrams on theme change; show a safe error block for invalid diagrams.
- **Math:** render during parse with KaTeX, subject to sanitize schema allowlisting.

## 10. Local Asset and Link Security

The backend exposes an `AssetService` plus a loopback-only HTTP asset server, not arbitrary file URLs and not Wails v2 dynamic `AssetsHandler`.

Asset delivery choice:

- On startup, Go opens an HTTP server bound to `127.0.0.1` on a random port.
- Each app process gets an unguessable token; token rotation happens only on process restart. Asset ids are invalidated through `RevokeAsset`, document close, vault/folder switch, or process shutdown.
- `AssetService.ResolveAsset(...)` returns an opaque asset URL like `http://127.0.0.1:<port>/assets/<token>/<assetId>`.
- The server accepts `GET`/`HEAD` only, serves only previously resolved asset ids, sets exact `Content-Type` plus `X-Content-Type-Options: nosniff`, supports browser-native image loading/caching, and never exposes raw filesystem paths.
- Dev and production use the same asset path, avoiding Vite dev-server differences.

Trusted root selection:

1. If the user opened or configured a vault/folder, use that folder.
2. Else if the opened file is inside a Git repo, use the Git worktree root.
3. Else use the opened file's parent directory.

Asset resolution rules:

- Resolve relative paths against the Markdown file's directory.
- Clean paths and reject any path that escapes the trusted root after symlink resolution.
- Allow image MIME types only in v1: PNG, JPEG, GIF, WebP, SVG subject to sanitizer rules.
- Enforce a configurable max asset size.
- Load images lazily by assigning the tokenized loopback URL when blocks near the viewport.

SVGs are treated as images, not executable HTML. Prefer serving sanitized bytes with `Content-Type: image/svg+xml` only after rejecting script/event attributes, external references, and embedded foreignObject; otherwise render a blocked-asset placeholder.

External links use `LinkService.OpenExternal(url)` after scheme allowlisting (`http`, `https`, `mailto`). The WebView must not navigate to external content.

## 11. File Watching and Reload

The watcher observes the parent directory, not only the file, to survive atomic safe-save/rename behavior. It filters events to the current file, coalesces bursts with a 100-200 ms debounce, and reloads once the replacement file is readable.

Reload preserves:

- scroll anchor or nearest visible block
- active TOC item
- metadata panel state
- theme/highlighter settings

## 12. Performance Targets

Targets are validation criteria, not promises:

| Metric | Windows WebView2 | macOS WebKit | Linux WebKitGTK |
|---|---:|---:|---:|
| `fixtures/small-readme.md` first meaningful paint | <= 150 ms | <= 200 ms | <= 250 ms |
| `fixtures/medium-technical-doc.md` first meaningful paint | <= 250 ms | <= 350 ms | <= 450 ms |
| `fixtures/large-10k-lines.md` | no main-thread parse block | same | same |
| Scroll during enhancement | no sustained dropped-frame bursts | same | same |
| Live DOM | bounded by visible blocks + buffer | same | same |

The measurement harness records open-to-text, open-to-enhanced-visible-range, visible highlight latency, Mermaid render latency, scroll frame timing, process RSS, and per-engine timing. Highlighter memory comparison is process-level and approximate unless the platform exposes finer data.

## 13. Testing Requirements

- Unit fixtures for Markdown features, frontmatter extraction, anchors, footnotes, wikilinks, and callouts.
- Security fixtures for raw HTML, dangerous links, SVG payloads, asset path traversal, symlink escape, and oversized files.
- Virtualizer tests for TOC clicks, `#anchor`, footnote backlinks, reload position restore, and scroll-spy.
- Watcher tests for write, rename, remove/create, and editor safe-save bursts.
- Cross-platform smoke tests on Windows, macOS, and Linux before release, with Linux WebKitGTK treated as the likely performance floor.

## 14. External Decision Evidence

- Wails v2.11 documentation describes `AssetServer`/dynamic asset handling and notes that Wails v2 dynamic asset handling does not work with Vite 5+.
- Wails GitHub releases identify Wails v3 as alpha/pre-release.
- Shiki documents both the default Oniguruma WebAssembly engine and the JavaScript RegExp engine; v1 chooses the JavaScript engine for optional Shiki evaluation to avoid the WASM/CSP path.

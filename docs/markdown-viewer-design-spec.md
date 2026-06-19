# Markdown Viewer - Product and Technical Design Specification

**Status:** Draft  
**Version:** 0.6
**Date:** 2026-06-06
**Companion:** `docs/markdown-viewer-implementation-plan.md`

## 1. Overview

Maakdown is a cross-platform desktop Markdown **viewer** for technical documents and personal notes. It opens local Markdown files and renders CommonMark/GFM plus math, diagrams, code, frontmatter, callouts, local images, internal anchors, and notes-style wikilinks.

The next release evolves the renderer into a reader-first, native-editorial desktop workspace. It supports multiple documents in tabs, restores reading sessions, and adds practical retrieval and output tools without becoming an editor.

It is not an editor. There is no live preview loop, collaboration, cloud sync, mobile target, or full Pandoc/academic feature set.

## 2. Goals

- Render common technical Markdown accurately and safely.
- Feel fast: first readable text appears quickly, scrolling remains smooth, and expensive enhancements happen progressively.
- Keep memory bounded for large documents by limiting live DOM size.
- Use existing rendering libraries instead of writing parsers/renderers from scratch.
- Ship on Windows, macOS, and Linux from one codebase.
- Make opening, switching, finding, navigating, and printing documents feel native to a desktop reader.
- Preserve a quiet, document-first interface with strong typography and restrained application chrome.
- Establish and enforce one reusable design system before adding workspace features.

## 3. Product Scope

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
| Tabbed documents | Must | one window; canonical paths are unique |
| Session restoration | Must | tabs, active document, and reading positions |
| Recent files and drag-and-drop | Must | desktop file-opening workflows |
| Current-document search | Must | virtualizer-aware match navigation |
| Navigation history | Must | file and anchor transitions per tab |
| Command palette and shortcuts | Must | keyboard access to reader commands |
| Print and system PDF output | Must | print-complete document, not virtualized slice |
| Focus mode and typography controls | Must | global reader appearance settings |
| Design-system foundation | Must | tokens, themes, fonts, icons, primitives, and visual QA land before workspace features |
| Embeds/transclusion `![[Note]]` | Out | recursive resolution and cycle handling deferred |
| Vault-wide search and tags | Out | future notes index |
| Editing and annotations | Out | viewer-only product boundary |
| Durable bookmarks | Out | reading position only in this cycle |
| Multiple native windows | Out | one tabbed workspace window |
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
- **F9 Workspace:** open multiple documents as tabs in one window; activate an existing tab instead of duplicating a canonical path.
- **F10 Session:** restore the previous tab order, active tab, and per-document reading position at launch; represent missing files as recoverable tabs.
- **F11 Desktop open flows:** support the native file picker, recent files, file drag-and-drop, and reopen-closed-tab.
- **F12 Document links:** local Markdown links and resolved wikilinks activate an existing target tab or open the target in a new tab.
- **F13 Search:** find text in the active document with match count, next/previous navigation, case sensitivity, and whole-word matching.
- **F14 History:** maintain per-tab back/forward history for file and anchor transitions.
- **F15 Commands:** expose application commands through native menus, keyboard shortcuts, and an in-app command palette.
- **F16 Reader tools:** support copying code and heading links, inspecting Mermaid diagrams, manual reload, and visible external-change status.
- **F17 Print:** print the complete rendered document through the system print flow, including print-to-PDF where the operating system provides it.
- **F18 Appearance:** support focus mode plus configurable reading font, font size, line height, and content measure.
- **F19 Design system:** all application chrome and reader primitives use the approved semantic tokens, themes, typography, iconography, component states, and content voice.
- **F20 Formatting:** dates, times, file sizes, counts, and durations use one locale-aware formatting layer rather than raw runtime string conversion.
- **F21 Reader errors:** missing files, permission failures, oversized or unsupported files, parse failures, blocked assets, and watcher loss map to defined recoverable presentations.

## 5. Non-Functional Requirements

- **NF1 Memory:** live DOM is bounded by virtualizing block-level content for large documents.
- **NF2 Load speed:** typical documents reach first meaningful paint quickly; code and diagrams may enhance after text appears.
- **NF3 Snappiness:** parsing and expensive highlighting do not block scroll frames.
- **NF4 Security:** all rendered HTML is sanitized; links and local assets are constrained.
- **NF5 Cross-platform predictability:** the v1 feature set must avoid known unstable runtime paths in system WebViews.
- **NF6 Active-tab isolation:** only the active tab mounts document blocks or performs asset, highlighting, math, and Mermaid enhancement work.
- **NF7 Durable state:** settings and sessions are versioned and saved atomically in the operating system application-data directory.
- **NF8 Accessibility:** all workspace and reader workflows are keyboard-operable, expose appropriate semantics, announce asynchronous state, and respect reduced-motion and high-contrast preferences.
- **NF9 Responsive desktop layout:** the reader remains usable in narrow desktop windows by collapsing inspectors into drawers before reducing document readability.
- **NF10 Visual consistency:** production UI contains no feature-local theme palettes or one-off control styling when an approved token or primitive exists.
- **NF11 Search truthfulness:** search counts are computed over the complete active document model even though visual marks are applied only to mounted blocks.
- **NF12 Phase performance gates:** the large-document harness runs after workspace, search, and editorial changes, including a several-open-tabs scenario that verifies only the active reader mounts.

## 6. Platform Decision

**Choice: Wails v2.12.x stable line + Go backend + Svelte 5.x + Vite 8.x + TypeScript frontend. Do not use Wails v3 for v1.**

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

With multiple tabs, watchers are path-scoped. A file-change event identifies the canonical path so only the matching tab is reloaded. Closing a tab unregisters its watcher.

## 12. Design System And Mock Authority

The reviewed design system and UX mock are preserved under
`docs/design-system/`. They establish the visual and interaction baseline for
all work beginning with P8.

The accepted direction is:

- warm paper and ink surfaces in light mode
- sage-tinted charcoal surfaces in dark mode
- Inter for UI and default reading text
- JetBrains Mono for code
- one restrained ink-blue interaction accent
- typed callout accents limited to callout/status contexts
- flat surfaces separated by hairline borders
- 4px, 6px, 10px, and pill radius tiers
- shadows reserved for dialogs, popovers, and the command palette
- Lucide line icons in compact controls
- 120-180 ms functional motion with reduced-motion overrides
- terse, literal UI copy with no emoji or marketing language

Semantic CSS custom properties are the production API. Components consume
semantic aliases rather than raw palette values. Light, dark, and system themes
must cover application chrome, reader content, status states, syntax
highlighting, KaTeX, and Mermaid.

The initial primitive set includes buttons, icon buttons, segmented controls,
badges, tags, TOC items, callouts, code-block chrome, wikilinks, dialogs,
popovers, tabs, toolbars, and status indicators. Every primitive must define
hover, pressed, focus, active, disabled, error, and relevant loading states.

The React mock is interaction and composition reference only. Production uses
Svelte components, the existing parser/virtualizer, real Mermaid output, and a
pinned local Lucide package. Runtime CDN dependencies and prototype inline-style
architecture are prohibited.

The mock makes these product details explicit:

- the top chrome is a compact toolbar plus a separate tab strip
- the outline rail carries a provisional square `M` mark and wordmark
- the active document title and watch status appear in the toolbar
- tabs show active, watching, missing, and close states
- metadata renders status as a badge and tags as chips
- command search covers commands, open tabs, recents, and headings
- the empty workspace combines a drop target, open action, recents, and missing-file treatment
- focus mode leaves explicit find and exit controls available
- code blocks expose language and copy controls
- Mermaid figures expose captions and a zoom affordance

The duplicated font exports are reference-only and must not ship. Production
uses genuine, licensed, weight-specific Inter and JetBrains Mono assets from
the pinned local Fontsource packages.

### Supplemental Product Review

`docs/design-system/reviews/Maakdown-Design-Product-Review.pdf` is an accepted
supplemental product and UX review. Where its historical P8-P10 numbering differs
from the current P8-P11 roadmap, the current phase numbers in this specification
take precedence.

The incorporated decisions are:

- use a compact three-zone icon toolbar with stable dimensions and tooltips
- keep the highlighter selector out of the compact toolbar; expose persisted
  highlight.js/Shiki selection in Reader Settings for normal-use evaluation
- make the command palette the first P10 vertical slice and the main route to
  commands, tabs, recents, headings, and settings
- format metadata and other human-readable values through one locale-aware layer
- render headings as document ink, with a quiet hover/focus anchor affordance
- cap prose to the configured reading measure while allowing diagrams, wide
  tables, and code to use a wider block-specific measure
- separate application/document identity from a labelled `Outline` navigation group
- treat accessibility fundamentals as continuous requirements, not a final-phase retrofit

The review's suggestion to stage watchers as active-tab-only before widening to
all tabs is recorded as superseded: P9 already ships tested path-scoped
multi-document watchers. The final all-open-document watcher behavior remains
the requirement.

## 13. Workspace And Session Model

Maakdown uses one native window with a tabbed workspace.

- A canonical file path may appear in at most one open tab.
- Opening an already-open file activates its tab.
- Local Markdown links and resolved wikilinks reuse an existing target tab or open a new tab.
- Unresolved wikilinks remain inert inline content and never create an empty tab.
- Dropped Markdown files open or activate tabs. Folder drops do not implicitly
  create a vault in this release; they show an unsupported-drop status instead.
- Closing the active tab selects the nearest remaining tab.
- Closed tabs may be reopened during the current session.
- Only the active tab renders document DOM and performs progressive enhancements.
- Inactive tabs retain their parsed model when practical, navigation history, reading position, and error state without mounting document blocks.

The persisted session contains:

- ordered open document paths
- active tab path
- per-document anchor/block position and relative offset
- recent file paths ordered by last successful open
- global appearance and reader settings

Session state is versioned and written by atomic replacement. Missing files do not abort restoration; they appear as recoverable error tabs that can be closed or relocated.
Restored documents re-resolve local assets in the new process; persisted state
must never reuse tokenized loopback asset URLs from a previous process.

## 14. Search, Commands, And Output

Current-document search operates on block plain text rather than the mounted DOM:

- matching runs over the active document model
- total and current match counts come from the complete document projection,
  never from the mounted virtualized range
- results identify block id plus text offsets
- next/previous navigation materializes and stabilizes the target block through the virtualizer
- only mounted result content receives temporary visual marks
- changing tabs keeps each tab's search state independent

The command palette covers application commands, open tabs, recent files,
document headings, and settings. It is the primary in-app command spine and
lands before the rest of P10. Native menus and palette commands share the same
command registry and enabled-state rules.

Printing temporarily switches the active document into a complete print
representation, shows preparation progress, waits for images, KaTeX, code, and
Mermaid output to settle or fail safely, invokes the system print flow, then
restores the bounded interactive view and reading position in a guaranteed
cleanup path on success, cancellation, or error. Large-document expansion is
explicitly user-initiated and memory-sensitive. Maakdown does not implement a
separate PDF renderer.

## 15. Editorial Interface And Accessibility

The visual direction is native editorial: quiet desktop chrome, excellent document typography, restrained color, and a centered reading surface.

- The tab strip has stable dimensions, horizontal overflow, file status, and close controls.
- The toolbar and tab strip remain visually distinct rows, matching the approved mock composition.
- The toolbar uses familiar icons with tooltips for commands and compact controls for settings.
- The toolbar has stable navigation/identity/reader-control zones; engine names
  and other evaluation internals do not appear in normal product chrome.
- The sidebar separates the Maakdown/document identity area from a labelled
  `Outline` group.
- TOC and metadata panels are independently collapsible and resizable.
- At narrow widths, metadata collapses before the TOC; remaining side panels become drawers.
- Focus mode hides tabs, navigation, metadata, and secondary controls while retaining search and an explicit exit control.
- Reader appearance settings offer sans-serif or serif text, stepped font sizes, compact/normal/relaxed line height, and narrow/standard/wide measure.
- Prose uses the selected reading measure; diagrams, wide tables, and code may
  opt into a wider block measure without stretching ordinary paragraphs.
- Headings use ink-colored document typography. Anchor links appear as a quiet
  hover/focus affordance rather than persistent blue underlines.
- Code, tables, callouts, task lists, footnotes, diagrams, broken assets, and unresolved wikilinks receive deliberate light and dark presentation.
- Metadata status values use semantic badges, tags use chips, and file watch state is visible without dominating the document.
- Metadata dates, times, sizes, counts, and durations use the shared formatting
  layer and never expose raw `Date.toString()`-style values.
- Theme, metadata mode, typography, and evaluation/debug controls have one
  settings surface reachable through the command palette.

Reader error presentations:

- missing file: recoverable tab with relocate, retry, and close actions
- permission denied: explanation plus retry after permissions change
- oversized file or asset: bounded refusal with the configured limit
- unsupported type: supported-extension guidance without attempting to parse
- parse failure: readable error state with retry and diagnostic detail
- watcher lost: stale/warning state plus manual reload and re-arm action
- blocked asset or unresolved wikilink: inline, non-navigating fallback

Accessibility requirements:

- ARIA tab, dialog, toolbar, search, and status semantics
- visible keyboard focus and complete keyboard navigation
- focus trapping and restoration for dialogs and the command palette
- screen-reader announcements for loading, reloads, search results, copy completion, and errors
- reduced-motion support and high-contrast-compatible design tokens

## 16. Performance Targets

Targets are validation criteria, not promises:

| Metric | Windows WebView2 | macOS WebKit | Linux WebKitGTK |
|---|---:|---:|---:|
| `fixtures/small-readme.md` first meaningful paint | <= 150 ms | <= 200 ms | <= 250 ms |
| `fixtures/medium-technical-doc.md` first meaningful paint | <= 250 ms | <= 350 ms | <= 450 ms |
| `fixtures/large-10k-lines.md` | no main-thread parse block | same | same |
| Scroll during enhancement | no sustained dropped-frame bursts | same | same |
| Live DOM | bounded by visible blocks + buffer | same | same |

The measurement harness records open-to-text, open-to-enhanced-visible-range, visible highlight latency, Mermaid render latency, scroll frame timing, process RSS, and per-engine timing. Highlighter memory comparison is process-level and approximate unless the platform exposes finer data.

Tabbed-workspace performance validation additionally records inactive-tab
memory, active-tab switch latency, session restoration time, search latency, and
print preparation time. The standing large-document scenario opens several
tabs and asserts that only the active tab contributes mounted blocks or
enhancement work.

## 17. Testing Requirements

- Unit fixtures for Markdown features, frontmatter extraction, anchors, footnotes, wikilinks, and callouts.
- Security fixtures for raw HTML, dangerous links, SVG payloads, asset path traversal, symlink escape, and oversized files.
- Virtualizer tests for TOC clicks, `#anchor`, footnote backlinks, reload position restore, and scroll-spy.
- Watcher tests for write, rename, remove/create, and editor safe-save bursts.
- Workspace tests for canonical-path deduplication, tab ordering, close/reopen behavior, inactive-tab isolation, and missing restored files.
- Session tests for schema migration, atomic replacement, recent-file ordering, and per-document position restoration.
- Search tests for options, match ordering, virtualized navigation, tab isolation, and no-result behavior.
- Formatting tests use fixed locales/time zones for dates, sizes, counts, and durations.
- Error-presentation tests cover every reader error category and recovery action.
- Command tests for native menu, shortcut, and palette parity.
- Print tests for complete-document preparation and restoration of the virtualized reader.
- Accessibility tests for keyboard workflows, focus management, semantics, announcements, reduced motion, and narrow-window layouts.
- Design-system tests for token completeness, light/dark state coverage, primitive interaction states, font loading, icon accessibility, and visual drift from approved references.
- Cross-platform smoke tests on Windows, macOS, and Linux before release, with Linux WebKitGTK treated as the likely performance floor.
- The large-document and multi-tab performance gates run after P9, P10, and P11 changes, not only at release.

## 18. External Decision Evidence

- Wails v2.12 documentation describes `AssetServer`/dynamic asset handling and notes that Wails v2 dynamic asset handling does not work with Vite 5+.
- Wails GitHub releases identify Wails v3 as alpha/pre-release.
- Shiki documents both the default Oniguruma WebAssembly engine and the JavaScript RegExp engine; v1 chooses the JavaScript engine for optional Shiki evaluation to avoid the WASM/CSP path.
- The reviewed Maakdown mock and design-system handoff are preserved under `docs/design-system/` as the P8 visual source material.
- The supplemental design and product review is preserved under
  `docs/design-system/reviews/` and incorporated into specification v0.6.

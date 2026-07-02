# Maakdown Task Tracker

**Purpose:** project task breakdown and progress tracker.  
**Status values:** Todo, In Progress, Blocked, Done, Deferred.  
**Last updated:** 2026-07-02.

## Summary

| Phase | Status | Goal | Exit Criteria |
|---|---|---|---|
| P0 | Done | Scaffold repository and app shell | repo initialized, project tree present, tool versions pinned, Wails build passes |
| P1 | Done | Safe base renderer | GFM fixture renders safely; frontmatter panel/hide works |
| P2 | Done | Navigation model | TOC, anchors, and footnote backlinks work before virtualization |
| P3 | Done | Assets and watcher | trusted-root images work; traversal blocked; safe-save reload works |
| P4 | Done | Rich enhancements | code, math, Mermaid, and theme propagation work across supported native webviews |
| P5 | Done | Virtualized large docs | 10k-line fixture has bounded DOM and working anchors |
| P6 | Done | Notes support | wikilinks navigate within configured vault |
| P7 | Done | Release hardening | v0.1.0 artifacts publish for all three OSes; macOS is signed/notarized and Windows/Linux remain unsigned |
| P8 | Done | Design system foundation | approved design language, themes, fonts, icons, primitives, and visual harness land |
| P9 | Done | Desktop workspace | tabs, sessions, recents, desktop open flows, and native commands work |
| P10 | Done | Reading productivity | search, history, reader tools, and complete-document printing work |
| P11 | In Progress | Editorial experience | browser-level cross-OS UAT and Windows WebView2 native acceptance are green; remaining native editorial gaps are Linux WebKitGTK search/focus/drag/drop/print coverage |
| P12 | Done | OS integration | macOS, Linux, and Windows Markdown association are complete |
| P13-P18 | In Progress | Next release: Precision Reading & Performance | P13-P18 implementation and macOS acceptance are complete; Windows/Linux validation after P18 push blocks release |

## P0 - Scaffold

| ID | Status | Task | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|
| P0.1 | Done | Create approved spec/plan docs | none | docs exist under `docs/` | reviewed with Claude/Gemini |
| P0.2 | Done | Initialize git repo | none | `.git/` exists and initial scaffold commit is created | `git status` |
| P0.3 | Done | Create project tree from implementation plan | P0.1 | Go/Wails, frontend, core, signing, docs folders exist | `find`/`rg` tree check |
| P0.4 | Done | Add repo agent guidance | P0.1 | `AGENTS.md`, `CLAUDE.md`, `DEV_CONTEXT.md` exist | file review |
| P0.5 | Done | Pin frontend dependencies | P0.3 | `frontend/package.json` pins Svelte 5.x and Vite 8.x | `npm install`, `npm run check`, `npm run build` |
| P0.6 | Done | Verify Go/Wails scaffold | P0.3 | `go test ./...` and `wails build` can run | `scripts/verify.sh` |

## P1 - Safe Base Renderer

| ID | Status | Task | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|
| P1.1 | Done | Implement parser worker protocol | P0 | worker returns sanitized block records | `npm run test`, `npm run check`, `npm run build` |
| P1.2 | Done | Assemble unified pipeline | P1.1 | GFM/frontmatter/math/callouts parse as expected | `parseDocument.test.ts` |
| P1.3 | Done | Implement sanitize schema | P1.2 | malicious HTML fixtures render inert | `parseDocument.test.ts` |
| P1.4 | Done | Build base non-virtualized document view | P1.2 | visible Markdown renders without enhancement | `npm run check`, `npm run build` |
| P1.5 | Done | Implement frontmatter metadata panel | P1.2 | panel/hide modes work | `npm run check`, `npm run build` |

## P2 - Navigation Model

| ID | Status | Task | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|
| P2.1 | Done | Build anchor/heading/footnote indexes | P1 | anchors map to block ids | `parseDocument.test.ts` |
| P2.2 | Done | Implement TOC sidebar | P2.1 | headings render and click-scroll works | `npm run check`, `npm run build` |
| P2.3 | Done | Implement internal link interception | P2.1 | `#anchor` and footnote backlinks route through navigation | `navigation.test.ts`, `npm run check` |
| P2.4 | Done | Implement scroll-spy state | P2.1 | active heading follows visible range | `navigation.test.ts`, `npm run check` |
| P2.5 | Done | Correct large-document heading/block mapping | P2.1 | late TOC targets land on the requested heading and scroll-spy exposes the active entry | Playwright benchmark measured 0.19 px final-anchor error |

## P3 - Assets And Watcher

| ID | Status | Task | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|
| P3.1 | Done | Implement trusted-root detection | P0 | vault > git root > file parent precedence | `go test ./internal/assetservice` |
| P3.2 | Done | Implement asset resolver and tokenized ids | P3.1 | traversal and symlink escapes rejected | `go test ./internal/assetservice` |
| P3.3 | Done | Implement loopback asset server | P3.2 | images stream via tokenized URLs | `go test ./internal/assetservice` |
| P3.4 | Done | Implement SVG policy | P3.3 | unsafe SVG blocked or sanitized | `go test ./internal/assetservice` |
| P3.5 | Done | Implement parent-directory watcher | P0 | write/rename/safe-save coalesced | `go test ./internal/watcher` |
| P3.6 | Done | Preserve position on reload | P3.5/P2 | reload restores nearest anchor/block | `npm run check`, `npm run build` |
| P3.7 | Done | Harden local SVG/image serving | P3.4 | SVG validator allows the xmlns namespace while blocking real remote refs; virtualized images re-resolve on remount via a per-document URL cache; vault index is cached and invalidated on fs change | `go test ./internal/assetservice ./internal/vault`, UAT image checks |

## P4 - Rich Enhancements

| ID | Status | Task | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|
| P4.1 | Done | Implement highlight.js highlighter | P1 | visible code blocks highlight lazily | highlighter tests and Playwright benchmark |
| P4.2 | Done | Implement optional Shiki JS-regex highlighter | P4.1 | engine can be selected for evaluation | highlighter tests and dark-theme visual pass |
| P4.3 | Done | Instrument highlighter timings | P4.1 | timing report emitted for fixtures | `npm run benchmark` |
| P4.4 | Done | Implement Mermaid manager | P1 | visible diagrams render lazily and show errors safely | Playwright benchmark and visual pass |
| P4.5 | Done | Implement theme propagation | P4.1/P4.4 | document, highlighter, Mermaid update without reparse | Svelte check and Playwright visual pass |
| P4.6 | Done | Stabilize Mermaid rendering on Windows/WebView2 | Frontend | P4.4/P11.11 | fixture diagrams preserve their diagram-specific label modes, edge content is not clipped, wide flowcharts remain readable without creating a page-level scrollbar, and cache entries never cross documents | `fixtures/mermaid-cases.md` accepted in RDP-created and physical Windows sessions; frontend checks, tests, build, and Go tests passed; macOS/Linux retained existing HTML-label path |

## P5 - Virtualized Large Docs

| ID | Status | Task | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|
| P5.1 | Done | Implement block virtualizer | P2/P4 | mounted block count bounded | virtualizer tests; 38 blocks in large benchmark |
| P5.2 | Done | Implement dynamic-height measurement cache | P5.1 | large doc scroll remains stable | virtualizer tests and Playwright scroll pass |
| P5.3 | Done | Implement multi-pass anchor stabilization | P5.2 | anchor target lands within tolerance | 0.19 px final-anchor error |
| P5.4 | Done | Schedule visible enhancement work | P5.1/P4 | no sustained scroll-frame drops | IntersectionObserver enhancement scheduling and perf harness |

## P6 - Notes Support

| ID | Status | Task | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|
| P6.1 | Done | Build vault index service | P3 | note names map to paths | `go test ./internal/vault` |
| P6.2 | Done | Transfer vault index to parser worker on change | P6.1 | parse calls pass current versioned index | parser worker and frontend build verification |
| P6.3 | Done | Render resolved/unresolved wikilinks | P6.2 | links open target notes or show unresolved state | parser tests and frontend integration |

## P7 - Release Hardening

| ID | Status | Task | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|
| P7.1 | Done | Build performance fixture corpus | P1 | named fixtures exist | small, medium, and 10k-line fixtures generated deterministically |
| P7.2 | Done | Implement perf harness | P5 | target metrics recorded locally and in CI | benchmark-mode production bundle with deterministic fixture host; repeated `npm run benchmark`; `docs/performance-baseline.md` |
| P7.3 | Done | Add macOS signing/notarization runbook | P0 | non-secret signing docs and script exist | doc/script review; credentials remain external |
| P7.4 | Done | Add Windows signing runbook | P0 | non-secret signing docs and script exist | doc/script review; credentials remain external |
| P7.5 | Done | Cross-platform packaging verification | P7.3/P7.4/P7.7 | unsigned builds validated on Windows/macOS/Linux | sandbox run 27083374632 built, validated, and uploaded all three native artifacts |
| P7.6 | Done | UI-driven UAT regression suite | P8-P11 | optimized spec-level Playwright suite covers UAT-01 through UAT-11 with deterministic mocked native boundaries | production-bundled UAT-mode `npm run uat` (25 tests); CI run 27470447128 passed on macOS, Ubuntu, and Windows; `docs/uat-traceability.md` |
| P7.7 | Done | Create GitHub repository and activate hosted verification | User/Release | repository exists, Actions are enabled, and manually dispatched `Cross-platform release smoke` passes | first `ci/sandbox` attempt passed on Linux/macOS/Windows: Actions run 27083374632; no signing secrets committed |
| P7.8 | Done | Publish release artifacts to GitHub Releases | Release | tag-triggered CI publishes unsigned Windows/Linux archives while the local macOS release flow uploads signed/notarized DMG and ZIP artifacts | v0.1.0 published with Linux x64, Windows x64, and signed/notarized macOS arm64 artifacts |
| P7.9 | Done | Add native rendering screenshot smoke | Release | every push captures minimal light/dark screenshots from the packaged WKWebView, WebView2, and WebKitGTK applications without gating the build | sandbox run 27490613627 passed all three OS jobs; six screenshots manually inspected |

## P8 - Design System Foundation

| ID | Status | Task | Owner | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|---|
| P8.1 | Done | Preserve and document approved mock/design references | Design/Docs | P7 | source hierarchy, accepted direction, prototype caveats, and mock states are in `docs/design-system/` | reference inventory complete; `git diff --check` |
| P8.2 | Done | Define production token architecture | Design/Frontend | P8.1 | raw palette, semantic colors, typography, spacing, layout, radius, elevation, motion, and reader aliases are canonical | `tokens.css` review; `git diff --check` |
| P8.3 | Done | Implement light, dark, and system theme foundations | Frontend | P8.2/P4.5 | all semantic tokens resolve in every theme without document reparse | light/dark visual-smoke screenshots |
| P8.4 | Done | Source and document production fonts | Design/Release | P8.1 | genuine licensed Inter and JetBrains Mono weight files have provenance, hashes, and local loading | Fontsource packages bundle licensed, weight-specific local assets; production build |
| P8.5 | Done | Install pinned Lucide Svelte icon package | Frontend | P8.1 | icons render locally with shared sizing and accessible labels; no CDN remains | dependency review, build, and icon gallery |
| P8.6 | Done | Implement core control primitives | Frontend | P8.2/P8.3/P8.5 | Button, IconButton, SegmentedControl, Badge, Tag, and StatusIndicator cover approved states | Svelte check and deterministic gallery |
| P8.7 | Done | Implement reader primitives | Frontend | P8.2/P8.3/P8.5 | TocItem, Callout, CodeBlockChrome, and Wikilink match contracts without bypassing parser security | shared Svelte primitives, parser tests, reader benchmark, and UAT heading/code coverage |
| P8.8 | Done | Implement floating and shell primitives | Frontend | P8.6 | Dialog, Popover, Toolbar, and Tab provide keyboard/focus behavior and stable dimensions | zero-warning Svelte accessibility check and UAT tab-keyboard coverage |
| P8.9 | Done | Build development design-system gallery | Frontend | P8.6-P8.8 | every primitive/state renders in one deterministic route for visual QA | expanded light/dark `npm run visual-smoke` gallery |
| P8.10 | Done | Migrate existing reader shell to tokens and primitives | Frontend | P8.3/P8.6-P8.8 | current P1-P7 behavior uses the design API with no feature-local control palette | frontend tests, build, benchmark, and screenshots |
| P8.11 | Done | Establish visual regression and adherence checks | Frontend/CI | P8.9/P8.10 | approved light/dark references and overflow checks run in CI | CI visual-smoke step and deterministic screenshots |

## P9 - Desktop Workspace

| ID | Status | Task | Owner | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|---|
| P9.1 | Done | Replace single-document state with tabbed workspace model | Frontend | P8/P5/P6 | tabs own independent model, position, load, and error state; P10 retains history/search ownership | workspace unit tests; Svelte check |
| P9.2 | Done | Implement canonical-path tab lifecycle | Frontend | P9.1 | open reuses existing paths; close selects nearest tab; closed tabs can reopen | workspace unit tests |
| P9.3 | Done | Refactor watcher for multiple document paths | Backend | P3/P9.1 | watchers register/unregister by canonical path and emit path-specific changes | Go tests for shared directory, safe-save, and cleanup |
| P9.4 | Done | Persist versioned settings and sessions atomically | Backend | P9.1 | OS app-data JSON stores tabs, active tab, positions, recents, and settings | Go tests for defaults, corruption, reload, and atomic replacement |
| P9.5 | Done | Restore tabs and per-document reading positions | Full stack | P9.2/P9.4 | launch restores order, active tab, positions, and recoverable missing-file tabs | session serialization tests plus UAT restore and in-place missing-file relocation |
| P9.6 | Done | Add approved empty state and recent documents | Frontend | P8/P9.4 | mock-aligned drop target, open action, recents, timestamps, and missing state work | workspace tests and visual smoke |
| P9.7 | Done | Add native file drag-and-drop | Full stack | P9.2/P9.6 | supported dropped Markdown files open or activate tabs with visible drop feedback | Wails runtime integration and frontend build |
| P9.8 | Done | Add native menus and shared command dispatch | Full stack | P9.2/P8.8 | menu, shortcut, and toolbar commands share command ids | Go build and Svelte check |
| P9.9 | Done | Add standard tab and file keyboard commands | Frontend | P9.8 | open, close, reopen, cycle tabs, and reload use platform shortcuts | command-path review and frontend checks |
| P9.10 | Done | Update native window title from active tab | Backend | P9.2 | title shows document name and application name, including empty workspace | Wails binding generation and Go build |
| P9.11 | Done | Enforce active-tab-only rendering and enhancement | Frontend | P9.1/P9.2 | inactive tabs mount no document blocks and schedule no enhancements | single mounted `DocumentView`; large reader benchmark |
| P9.12 | Done | Implement mock-aligned toolbar and two-row tab chrome | Frontend | P8/P9.2/P9.3 | active title, watch badge, tab states, add/close actions, and separate toolbar/tab rows match reference | visual smoke and benchmark |

## P10 - Reading Productivity

| ID | Status | Task | Owner | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|---|
| P10.0 | Done | Apply supplemental product-surface corrections | Frontend/Design | P8/P9 | production toolbar uses stable icon zones, highlighter selection is dev-only, sidebar labels `Outline`, and prose/heading-link treatment matches the accepted review | Svelte check, light/dark/narrow screenshots, product-mode assertion |
| P10.1 | Done | Add block plain-text search projection | Frontend core | P9.1 | every searchable block exposes stable text without DOM scraping | unit tests across Markdown fixtures |
| P10.2 | Done | Implement current-document search engine and state | Frontend core | P10.1 | query, case, whole-word, truthful full-model counts, ordering, and wrapping work per tab | search unit tests including virtualized count accuracy |
| P10.3 | Done | Integrate search with virtualized navigation and marking | Frontend | P5/P10.2 | next/previous lands on offscreen results and marks only mounted content | Playwright 10k-line search tests |
| P10.4 | Done | Implement per-tab file and anchor navigation history | Frontend core | P9.1/P2 | back/forward restores path, anchor/block, and relative offset | history unit tests and UAT workspace/navigation coverage |
| P10.5 | Done | Build command-palette-first command spine | Frontend | P9.8/P10.0 | thin palette ships first for commands/tabs/recents/headings, then adds settings and history with approved keyboard interaction | keyboard selection, focus trap/restoration, and UAT-05 |
| P10.6 | Done | Add code-copy and heading-link copy tools | Frontend | P4/P8/P9.8 | code chrome shows language/copy state and copy actions announce success/failure | clipboard mocks and Playwright tests |
| P10.7 | Done | Add zoomable Mermaid inspection dialog | Frontend | P4.4/P8.8 | captioned diagrams open with zoom, pan, reset, close, and focus restoration | component, accessibility, and visual tests |
| P10.8 | Done | Add manual reload and external-change status | Full stack | P9.3 | toolbar/tab states expose watching, changed, reload progress, and recoverable errors | watcher integration tests |
| P10.9 | Done | Implement guarded complete-document print preparation | Frontend | P5/P4 | progress/cancel flow renders all blocks and printable enhancements, then guaranteed cleanup restores the bounded reader | UAT-06 completion/cancellation and bounded cleanup |
| P10.10 | Done | Invoke native print and system PDF flow | Backend | P10.9 | print command opens platform dialog and restores bounded reader afterward | macOS/Windows/Linux smoke tests |
| P10.11 | Done | Add shared formatting and locale layer | Frontend core | P10.0 | metadata, dates, sizes, counts, and durations use one tested formatter with no raw runtime strings | fixed-locale/time-zone unit tests and metadata screenshots |
| P10.12 | Done | Define reader error taxonomy and recovery presentations | Full stack | P9/P10.0 | missing, permission, oversized, unsupported, parse, watcher, asset, and unresolved-link states have typed messages and actions | unit fixtures plus Playwright recovery scenarios |
| P10.13 | Done | Add unified Settings surface through the palette | Frontend | P10.5/P9.4 | theme, metadata, reader, panel, and dev/evaluation settings have one persistent home; Shiki remains dev-only | persistence, keyboard, and visual tests |
| P10.14 | Done | Add standing multi-tab active-render benchmark | Frontend/CI | P9.11 | several large open tabs retain one mounted reader and bounded enhancement work after P10 changes | production-bundled UAT-mode `npm run benchmark:workspace`; CI thresholds for one reader, mounted blocks, and activation latency |
| P10.15 | Done | Keep the accessibility baseline continuously green | Frontend/CI | P8/P9 | existing and new controls retain visible focus, names, semantics, reduced-motion behavior, and dialog/palette focus management before P11 async-announcement completion | automated accessibility checks plus manual keyboard smoke per P10 milestone |
| P10.16 | Done | Preserve full-document range during print preparation | Frontend | P10.6/P5.2 | asynchronous block measurements cannot restore virtualization before the system print call; the complete document is mounted and enhanced for the print snapshot | local UAT 25/25; CI run 27470447128 passed UAT on macOS, Ubuntu, and Windows |
| P10.17 | Done | Stabilize Mermaid rendering in RDP-created WebView2 sessions | Frontend/Windows | P10.7 | diagrams created in RDP match physical-session sizing and label layout without changing macOS/Linux output | `fixtures/mermaid-cases.md` accepted in RDP and physical Windows sessions; frontend checks, tests, build, and Go tests passed |

## P11 - Editorial Experience

| ID | Status | Task | Owner | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|---|
| P11.1 | Done | Compose approved native-editorial shell | Design/Frontend | P8/P9 | outline, two-row chrome, centered reader, and metadata inspector match mock intent | reference comparison and visual baselines |
| P11.2 | Done | Add collapsible and resizable outline/metadata panels | Frontend | P11.1 | dimensions persist and panels collapse independently without content overlap | interaction and persistence tests |
| P11.3 | Done | Add responsive narrow-window drawers | Frontend | P11.2 | metadata collapses first; remaining panels become accessible drawers | viewport matrix screenshots |
| P11.4 | Done | Add reader typography and measure controls | Frontend | P9.4/P8/P11.1 | sans/serif, 13-22px size, three line heights, and three measures update without reparsing and persist | config, visual, and regression tests |
| P11.5 | Done | Implement mock-aligned focus mode | Frontend | P11.1/P10.3 | secondary chrome hides while explicit find and exit controls remain usable | keyboard and visual tests |
| P11.6 | Done | Refine metadata status badges and tag chips | Frontend | P8/P11.1 | status values use semantic tones, tags wrap cleanly, and paths remain readable | fixture and narrow-panel visual tests |
| P11.7 | Done | Refine document element presentation | Frontend | P8/P10.0/P11.1 | ink headings with hover anchors, capped prose plus wide diagrams/tables/code, tasks, callouts, footnotes, assets, and wikilinks match approved treatments in both themes | fixture visual regression |
| P11.8 | Done | Finalize provisional brand mark usage | Design/Frontend | P8.1/P11.1 | square `M` mark is consistently applied and remains replaceable without layout changes | brand review and icon-size screenshots |
| P11.9 | Done | Complete keyboard and semantic accessibility | Frontend | P10/P11.1-P11.7 | tabs, toolbars, search, palette, dialogs, drawers, and reader are keyboard/screen-reader operable | zero-warning Svelte check, axe serious/critical gate, and UAT keyboard paths |
| P11.10 | Done | Add reduced-motion, high-contrast, and async announcements | Frontend | P8/P11.9 | system preferences are respected and loading/reload/search/copy/error state is announced | media-query coverage and UAT-07 |
| P11.11 | Blocked | Run cross-platform native editorial acceptance pass | Release | P11.1-P11.10/P7.7/P4.6 | empty, tabs, search, focus, narrow, light, dark, diagram, drag/drop, window chrome, and print workflows pass in WKWebView, WebView2, and WebKitGTK | browser-level CI is green on all three OSes; 2026-06-17 Debian/GNOME Wayland ad hoc pass verified WebKitGTK startup, empty state persistence, multi-tab native opens, Mermaid/10k/local-asset fixtures, and light/dark profiles, but Linux search/focus/drag/drop/print still need manual or harness coverage; 2026-06-20 Windows production-exe UI automation verified empty state, native tab opens, search, focus, narrow layout, light/dark, Mermaid, window chrome, print preview/cancel, and Explorer-to-app drag/drop opening `fixtures/README.md` as an active tab in WebView2 |
| P11.12 | Done | Adopt design-handoff Panels option A (masthead + minimap) | Design/Frontend | P11.1 | metadata moves to a scrolling masthead and the outline to a hover-reveal edge minimap (fixed decorative collapsed glyph); single reading column; supersedes the persistent two-rail layout and its resizers/drawers from P11.2-P11.3 | `npm run check`, UAT 19/19, render screenshots |
| P11.13 | Done | Trim toolbar controls | Frontend | P11.12 | outline/metadata toggle buttons and the redundant New tab button removed; show/hide wiring kept via command ids; Open always opens a new tab | `npm run check`, UAT-04/08 |
| P11.14 | Done | Resolve open-path responsiveness regression | Frontend/Backend | P11.12 | opening a second document after a large file no longer stalls (confirmed on-device); vault index cached/invalidated and minimap outline lazily rendered cut open-path work | frontend long-task probe (0 tasks, ~0.6s open); vault walk measured ~11ms; user-confirmed |
| P11.15 | Deferred | Autonomous native UI verification harness | Frontend/Release | P11.14 | drive the real built app over CDP (remote-debug + open-at-path command + Go/JS timing) to verify native-shell behavior without UI automation; AppleScript/accessibility only as last resort | design noted; revisit when native-shell regressions need coverage |

## P12 - OS Integration

| ID | Status | Task | Owner | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|---|
| P12.1 | Done | macOS Markdown file association | Full stack | P7 | bundle declares a Viewer/Alternate claim for net.daringfireball.markdown (no default takeover); OS-handed files open as tabs in the single running instance (cold start buffered); Reader Settings offers user-initiated "Set as default" via LaunchServices | LS dump shows rank Alternate/role Viewer; open -a cold + running-instance tab checks via session state; user default verified untouched; UAT-09 (4 scenarios); go build/wails build |
| P12.2 | Done | Linux Markdown file association | Full stack | P12.1 | user-level `.desktop` entry with `MimeType=text/markdown` registers an Open With candidate; `xdg-mime` query/default drives the Settings row | implementation and Linux-tagged tests passed in CI run 27527661318; packaged WebKitGTK build/capture passed run 27527648278; logged-in GNOME/WebKitGTK pass on 2026-06-17 verified desktop-entry registration, GIO Open With/default loading, `xdg-mime` default, and `gio open`/`xdg-open` opening Markdown files as tabs in the single running window |
| P12.3 | Done | Windows Markdown file association | Full stack | P12.1 | HKCU ProgId + RegisteredApplications add Maakdown to Open With/Default Apps; Markdown files use the standalone derived Markdown document icon rather than the main app icon or app-icon overlay; Settings row launches the system chooser (no silent default on Win10+) | real Windows session verified five `REG_NONE` OpenWith entries, ProgId command/icon, per-user capabilities, unchanged existing default, argv open to the requested tab, `DefaultIcon` pointing at `%APPDATA%\Maakdown\markdown.ico`; 2026-06-27 current-machine icon file was refreshed from `build/windows/markdown.ico`, registry value re-applied, and shell association refresh requested; Windows build, Go tests, frontend checks, and UAT-09 (5 scenarios) |

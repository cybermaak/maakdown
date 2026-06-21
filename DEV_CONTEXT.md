# DEV_CONTEXT

## Project Summary

Maakdown is a cross-platform desktop Markdown viewer for technical documents and personal notes. The approved v1 stack is Wails v2.12.x, Go, Svelte 5.x, Vite 8.x, and TypeScript.

The app is a viewer, not an editor. It renders CommonMark/GFM, code, KaTeX math, Mermaid diagrams, frontmatter, callouts, local images, anchors/footnotes, and later notes-style wikilinks.

## Current Phase

**Phase:** P11.11 is active; P0-P10 and P12 are complete
**Active focus:** remaining native editorial acceptance. Windows Mermaid
rendering is accepted in physical and RDP-created WebView2 sessions, Windows
native UI automation has verified the main editorial workflows except
drag/drop, and macOS, Linux, and Windows Markdown association are complete.

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
- `frontend/src/components/`: reader surface, masthead, hover minimap, workspace
  chrome, dialogs, settings, and native-window controls.
- `fixtures/`: deterministic Markdown evaluation documents and local fixture assets.
- `frontend/e2e/`: Playwright UI-driven UAT journeys and the mock-IPC seeding support.
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
- Use highlight.js as the default highlighter and expose highlight.js/Shiki
  selection in Reader Settings for persisted user evaluation.
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

- P11.11 needs native WKWebView/WebView2/WebKitGTK editorial acceptance.
  Cross-OS CI currently runs the frontend in Chromium, so it does not validate
  native webview rendering, window chrome, drag/drop, or system print behavior.
- macOS signing and notarization are operational. Windows release signing
  remains blocked on the user's external certificate; Linux remains unsigned
  by design.

## Verification Notes

- Current frontend verification includes 29 unit tests, zero-warning Svelte
  checks, the production build, reader/workspace benchmarks, visual smoke, and
  25 production-bundled UAT tests with an axe serious/critical accessibility
  gate.
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
  (scroll → minimap jump → palette focus mode → dark theme + Mermaid) and
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
  keyboard protocol. Therefore Linux search/focus keyboard paths, native
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
  offscreen-capable matches, focus-mode toggle, narrow-window rendering,
  light/dark theme toggles, custom Windows title-bar controls, Mermaid
  rendering in WebView2, and WebView2 print preview/cancel. Attempted real
  Explorer-to-app file drag/drop with multiple mouse paths from the selected
  `README.md` row, but no new tab opened; keep Windows drag/drop pending under
  P11.11 rather than claiming full Windows native editorial acceptance.
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

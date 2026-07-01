# Maakdown Next Release Plan

**Release theme:** Precision Reading & Performance  
**Target:** next feature release after `v0.1.1`  
**Status:** Planning  
**Last updated:** 2026-07-01

## 1. Release Intent

The next release keeps Maakdown a slick, lightweight Markdown reader. The goal
is not to turn the app into an editor, IDE, or vault manager. The release should
make long technical documents easier to orient inside, make code-heavy documents
more pleasant to read, and prove or improve the current performance envelope.

The guiding phrase for implementation is **precision without weight**:

- add orientation signals only where they help reading
- keep all expensive work virtualizer-aware
- prefer parsed-model projections over DOM scraping
- keep settings few, persistent, and easy to ignore
- do not add editing, annotation, bookmark, sync, plugin, or vault-wide features

## 2. Validation Policy

Every task in this release has three validation tracks:

- **macOS validation:** required before moving to the next task. A task cannot be
  marked `Done` until it has passed its macOS validation step.
- **Windows validation:** does not block the next task, but blocks release.
- **Linux validation:** does not block the next task, but blocks release.

For implementation sequencing, use this rule:

1. Finish a task.
2. Run its unit/component/browser verification.
3. Run its **macOS validation** on the packaged or dev app as specified.
4. Mark the task `Done` only after macOS validation passes.
5. Record Windows/Linux validation as `Pending`, `Passed`, or `Blocked`.
6. Do not cut the release until every task's Windows and Linux validation is
   passed or explicitly waived by the user.

Mac validation should be done on the local development machine. Windows and
Linux validation can use GitHub Actions, native screenshot artifacts, a real
machine, or user/manual confirmation when native behavior is involved.

## 3. Scope

### In Scope

- optional document source line numbers
- performance and memory analysis with measured optimizations
- minimap enhancements
- code reading tools
- document statistics
- recent files improvements
- current-document find polish
- print/export polish
- reader theme preset cleanup
- crash and error recovery pass

### Out Of Scope

- Markdown editing
- annotations
- bookmarks
- multiple windows
- vault-wide search
- backlinks
- transclusion
- sync or cloud features
- plugin architecture
- custom theme authoring UI
- semantic code intelligence beyond rendering and copying

## 4. Feature Plan

### 4.1 Optional Document Source Line Numbers

Add a reader setting that shows source line numbers in the document margin.
This should feel like a reading aid, not an editor surface.

Behavior:

- Off by default unless design review decides the subtle style is acceptable as
  default.
- Toggle from Settings and command palette.
- Persist through existing versioned settings storage.
- Line numbers are based on parser source positions, not rendered DOM position.
- Blocks with known source position show their first source line.
- Multi-line blocks may show a compact range only if it remains visually quiet.
- Line-number gutter must not shift layout unpredictably during virtualization.
- Copying text from the reader must not include line numbers.
- Focus mode may keep line numbers visible only if the user enabled them.

Technical notes:

- Extend parser block records with normalized source location metadata where the
  unified/remark pipeline exposes it.
- Store line numbers on the document model as cheap scalar metadata.
- Render line numbers inside `DocumentView` block chrome with stable gutter
  dimensions and tokenized styling.
- Avoid measuring line-number width dynamically per row. Use tabular numerals
  and a max-width derived from document line count.
- Virtualized blocks must render line numbers only for mounted blocks.

Risks:

- Some transformed blocks may have imperfect source positions. Prefer approximate
  and stable over trying to reconstruct exact positions with expensive mapping.
- Large documents must not pay a meaningful cost for disabled line numbers.

### 4.2 Performance And Memory Analysis

Run a dedicated performance and memory audit before and after feature work.

Audit areas:

- cold app launch to empty state
- first open to readable text for small, medium, and large fixtures
- parser worker time and transfer payload size
- source-position extraction overhead
- virtualized scroll CPU and mounted block count
- memory growth after repeated open/close/reopen cycles
- multi-tab memory footprint with inactive large documents
- Mermaid enhancement cost and cache behavior
- highlight.js versus Shiki cost
- image asset cache lifetime
- vault indexing and invalidation cost
- session restore time
- print expansion peak mounted block count and cleanup

Deliverables:

- `docs/performance-audit-next-release.md`
- updated benchmark output where useful
- measured optimization tickets in the tracker
- explicit "no action" notes for areas that are already acceptable

Implementation rule:

Do not optimize based only on intuition. Record a baseline, identify a likely
cause, make a narrow change, and compare before/after.

### 4.3 Document Minimap Enhancements

Make the hover minimap more useful without turning it into a persistent panel.

Behavior:

- Current viewport position is visible in the collapsed and expanded minimap.
- Search hits appear as small marks when a current-document search is active.
- Optional marks for headings, diagrams, and code blocks may be added if the
  parsed model already exposes the needed metadata cheaply.
- Marks must be stable for large documents and not require DOM scanning.
- Hover-expanded outline behavior remains unchanged.

Technical notes:

- Build minimap marks from parsed block metadata and current search results.
- Keep mark computation O(blocks) at parse/search time, not on every scroll.
- Scroll updates should update only the viewport indicator.
- Use design tokens for mark colors and high-contrast variants.

### 4.4 Better Code Reading Tools

Improve code-heavy reading while keeping enhancement lazy.

Behavior:

- Add optional line numbers for fenced code blocks.
- Add per-code-block wrap/nowrap control.
- Add a global default for code wrapping in Settings.
- Preserve existing copy behavior; copied code must not include visual line
  numbers.
- If "copy selected lines" is implemented, it must use actual user selection
  and remain robust without complex editor behavior.

Technical notes:

- Code line numbers should be rendered from the raw code text before syntax
  enhancement mutates markup.
- Use CSS counters or precomputed line wrappers only if they do not break
  highlight.js/Shiki markup.
- Prefer a simple overlay/gutter approach that does not duplicate code text.
- Keep code line-number rendering mounted-block-only.

### 4.5 Document Stats Panel

Expose lightweight document statistics in the metadata masthead or Settings.

Stats:

- word count
- estimated reading time
- heading count
- code block count
- Mermaid diagram count
- image count
- table count
- task count
- source line count when available

Behavior:

- Stats are derived from the parsed document model.
- Stats are not a dashboard and should not dominate the reader.
- Values should use the shared formatter layer.
- Stats should update after reload without a full app restart.

### 4.6 Open Recent Improvements

Make recents more practical for repeated document work.

Behavior:

- Pin/unpin recent files.
- Pinned recents remain at the top.
- Clear missing recents.
- Clear all unpinned recents.
- Missing recent files should keep the existing recovery affordance where
  possible.
- Recents continue to use canonical path identity and existing session storage.

Technical notes:

- Extend `RecentDocument` with `pinned` and optional last-missing metadata.
- Preserve backward-compatible session/config migration.
- Add command palette entries for pinned recents.

### 4.7 Find UX Polish

Improve current-document search feedback without expanding to vault search.

Behavior:

- Search result marks appear in minimap.
- Search bar clearly indicates wrapped navigation.
- No-results state is visible and accessible.
- Search options remain case/whole-word scoped to current document.
- Search state remains per tab.

Technical notes:

- Reuse existing search result model.
- Avoid remounting the reader just to update search marks.
- Add aria-live messaging for no-results and wrapped navigation.

### 4.8 Print And PDF Polish

Refine print output and preparation without changing the native print flow.

Behavior:

- Print stylesheet improves page breaks around code, tables, Mermaid, callouts,
  and headings.
- Add option to include or exclude the metadata masthead in print.
- Code blocks and tables avoid awkward clipping where possible.
- Mermaid diagrams print with theme-appropriate contrast.
- Print preparation remains cancellable and restores virtualization.

Technical notes:

- Keep the existing complete-document print preparation contract.
- Print settings should be persistent but minimal.
- Do not add a custom PDF engine.

### 4.9 Theme Preset Cleanup

Make the theme system easier to maintain and extend later.

Behavior:

- Document the reader token contract.
- Add or refine a high-contrast reader preset if it remains lightweight.
- Keep light/dark/system behavior unchanged.
- Do not add custom theme authoring UI in this release.

Technical notes:

- Centralize reader token documentation in `docs/design-system/`.
- Ensure code, Mermaid, selection, links, line-number gutters, minimap marks, and
  print styles consume semantic reader tokens.

### 4.10 Crash And Error Recovery Pass

Improve trust when documents or enhancements fail.

Behavior:

- Oversized-document behavior is explicit and recoverable.
- Parser failures preserve app responsiveness and show a typed recovery state.
- Enhancement failures remain isolated per block.
- Asset failures do not retry infinitely.
- Session restore handles missing or permission-denied files cleanly.

Technical notes:

- Extend the existing reader error taxonomy only where it has gaps.
- Add regression fixtures for parse, asset, Mermaid, and missing-file cases.
- Keep messages concise and non-alarming.

## 5. Release Phases

### P13 - Performance Baseline And Instrumentation

Establish measurement before feature work changes the profile.

Outputs:

- next-release performance audit doc
- benchmark improvements where needed
- memory and timing baseline
- release thresholds for "no regression"

### P14 - Source Orientation

Implement document source line numbers and code line-number/wrap tools.

Outputs:

- source line metadata in parser model
- reader line-number gutter
- code block line numbers and wrap controls
- settings and command palette wiring

### P15 - Navigation Insight

Enhance minimap and current-document find feedback.

Outputs:

- viewport indicator
- search hit marks
- optional structural marks
- wrapped/no-result search messaging

### P16 - Reader Utilities

Add document stats, recent-file polish, print polish, and recovery improvements.

Outputs:

- parsed-model stats projection
- pinned recents and cleanup actions
- print options and stylesheet refinements
- typed recovery improvements

### P17 - Theme, Accessibility, And Release Acceptance

Tie the release together with token cleanup, UAT updates, and cross-platform
release validation.

Outputs:

- reader token documentation
- high-contrast or refined theme preset if accepted
- UAT updates
- macOS task-by-task validation complete
- Windows/Linux release-blocking validation complete

## 6. Testing Strategy

Unit/component tests:

- parser source positions
- settings migration
- stats projection
- recent-file pinning and cleanup
- search mark projection
- print option persistence
- error taxonomy additions

Browser/UAT tests:

- line-number toggle
- code line-number and wrap behavior
- minimap search marks
- stats visibility
- pinned recents
- print metadata include/exclude
- error recovery scenarios

Benchmark tests:

- open-to-readable text with line numbers disabled and enabled
- source-position extraction overhead
- search/minimap mark projection cost
- code-line-number rendering on large code fixtures
- memory after repeated tab open/close cycles

Native validation:

- macOS validates each task before moving on
- Windows validates accumulated behavior before release
- Linux validates accumulated behavior before release

## 7. Release Exit Criteria

The release is ready when:

- all P13-P17 tasks in `docs/next-release-task-tracker.md` are `Done`
- every task has passed macOS validation
- every task has passed or explicitly waived Windows/Linux validation
- full local release check passes
- GitHub CI passes on `main`
- native rendering screenshots are reviewed
- release smoke passes on macOS, Windows, and Linux
- performance audit documents before/after findings
- no accepted benchmark threshold regresses without user approval

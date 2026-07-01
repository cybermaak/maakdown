# Maakdown UI-Driven UAT Test Plan

## Purpose

This suite is the last-line product regression gate for Maakdown. It verifies
approved user-visible behavior through the UI rather than testing internal
implementation details.

The suite runs locally during release checks and headlessly in GitHub Actions on
pushes to `main`. Its normal target is under six minutes, with a hard ten-minute
timeout.

## Coverage Policy

- Add executable UAT coverage only for implemented specification requirements.
- Keep future requirements in a traceability matrix without skipped or
  expected-failure tests.
- When a tracked feature becomes `Done`, add its UAT scenario before treating
  the phase as release-ready.
- Prefer one end-to-end journey that covers related requirements over many
  narrowly duplicated tests.
- Use semantic UI and computed-style assertions. Do not maintain pixel
  screenshot baselines.
- Keep performance benchmarking separate except for user-visible regression
  assertions such as bounded document DOM.

## Test Harness

- Use Playwright Test with headless Chromium.
- Run against the Vite application with an explicit UAT mode.
- Provide a deterministic mocked Wails boundary for file opening, sessions,
  recents, file drops, watcher events, external links, settings, clipboard, and
  printing.
- Keep production IPC behavior unchanged; enable mocks only through the UAT
  entry mode.
- Reuse the deterministic Markdown fixtures under `fixtures/`.
- Use roles, accessible names, labels, and visible text as selectors. Add
  `data-uat` only when no stable semantic selector can express the product
  outcome.
- Isolate mock storage and event state per test.
- Treat unexpected page errors and console errors as failures.

## Product Journeys

### UAT-01 Open And Read A Technical Document

1. Open a representative technical document through the mocked native picker.
2. Verify headings, prose, GFM table and tasks, callout, local image, math,
   highlighted code, Mermaid, metadata, document statistics, and unresolved
   wikilink presentation.
3. Verify heading links inherit heading ink and are not underlined.
4. Verify unsafe or unresolved content remains visibly inert.

**Covers:** rendering, progressive enhancement, local assets, metadata,
security presentation, and reader styling.

### UAT-02 Theme And Reader Consistency

1. Open a document containing prose, code, math, and Mermaid.
2. Switch between light and dark themes without reopening the document.
3. Verify application chrome and rendered content update together.
4. Verify dark syntax highlighting uses a dark code surface.
5. Verify Mermaid uses semantic reader colors rather than library defaults.
6. Simulate restart and verify the selected theme persists.

**Covers:** theme propagation, reader theme contract, highlight.js, KaTeX,
Mermaid, and durable settings.

### UAT-03 Large-Document Navigation And Search

1. Open the 10,000-line fixture.
2. Navigate to a late heading through the outline and verify it becomes visible.
3. Search for a term with offscreen matches.
4. Verify the displayed total reflects the complete document.
5. Verify next and previous navigation wrap and materialize offscreen matches.
6. Verify visible matches are marked.
7. Verify mounted document blocks remain bounded.

**Covers:** virtualization, outline navigation, anchor stabilization,
full-document search truthfulness, and active rendering bounds.

### UAT-04 Desktop Workspace Lifecycle

1. Open two documents.
2. Open an already-open canonical path and verify the existing tab activates.
3. Switch tabs and verify only the active document is mounted.
4. Close and reopen a tab.
5. Simulate dropping another Markdown file.
6. Simulate an external file change and verify reload preserves reading
   position.
7. Simulate restart and verify tab order, active tab, recents, pinned recents,
   settings, and per-document position restore.
8. Restore a missing path, locate its replacement, and verify the existing tab
   recovers in place with one watcher on the replacement path.
9. Clear unpinned or missing recents without affecting pinned recents.

**Covers:** tabs, canonical-path deduplication, active-tab isolation, reopen,
drop, watcher status, reload, sessions, recents, reading position, and
missing-file recovery.

### UAT-05 Commands And Editorial Reading Controls

1. Exercise keyboard shortcuts and the command palette for open, find, reload,
   print, focus mode, and reader appearance.
2. Verify command-palette results include commands, tabs, recents, and headings.
3. Change font family, size, line height, and measure.
4. Verify appearance changes do not reopen or reparse the document and persist
   after restart.
5. Enter focus mode and verify find plus an explicit exit remain reachable.
6. Use a narrow viewport and verify there is no page-level horizontal overflow
   and essential controls remain reachable.

**Covers:** command parity, keyboard access, command palette, typography,
focus mode, persistence, and responsive behavior.

### UAT-06 Complete-Document Print Preparation

1. Trigger print through the UI.
2. Verify the mocked print invocation sees the complete document rather than
   only the virtualized slice.
3. Verify printable code, math, diagrams, images, and document text are present.
4. Complete the mocked print flow.
5. Verify cleanup restores bounded virtualization and the original reading
   position.
6. Verify the metadata masthead can be included or excluded from print output.

**Covers:** complete-document preparation, system print boundary, enhanced
print content, guaranteed cleanup, and position restoration.

### UAT-07 Accessibility Release Gate

Run accessibility checks against:

- empty workspace
- populated reader
- search UI
- command palette
- reader appearance surface
- focus mode
- narrow viewport

Verify:

- keyboard-only operation
- visible focus
- named controls and correct landmarks
- tab, toolbar, search, dialog, and status semantics
- modal focus containment and restoration
- loading, reload, search, copy, and error announcements when implemented
- reduced-motion behavior
- no serious or critical Axe violations

## Requirements Traceability

Maintain a table alongside the executable suite with these columns:

| Requirement | Product outcome | Verification | Status |
|---|---|---|---|
| `F*` or `NF*` identifier | concise user-visible expectation | UAT scenario, lower-level test, or benchmark | Executable or Planned |

Every implemented approved requirement must map to either:

- one of the UAT journeys above, or
- an explicitly documented unit, integration, security, packaging, or
  performance check when browser UAT is not the correct verification layer.

## Commands And CI

Add these frontend commands when implementing the suite:

```text
npm run uat
npm run uat:headed
npm run uat:report
```

CI behavior:

- Run UAT as a separate GitHub Actions job after the frontend build on pushes to
  `main`.
- Install Playwright Chromium and required Linux dependencies.
- Use two workers.
- Apply a 60-second per-test timeout.
- Apply a ten-minute job timeout.
- Retry once in CI only.
- Emit JUnit and HTML reports.
- Capture screenshots, traces, and DOM snapshots only on failure.
- Upload failure artifacts rather than retaining passing-run screenshots.

Local release behavior:

- Add `npm run uat` to `scripts/release-check.sh`.
- A UAT failure blocks release progression.
- Native packaging and signing checks remain separate platform-owner gates.

## Acceptance Criteria

- All executable UAT journeys pass locally and in headless GitHub Actions
  Chromium.
- The suite normally completes in under six minutes and always terminates
  within ten minutes.
- No skipped or expected-failure UAT tests are committed.
- No unexpected browser page or console errors occur.
- Every implemented approved requirement has traceable verification.
- Planned requirements become executable only when their tracker task is
  completed.

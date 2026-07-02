# Maakdown UAT Requirements Traceability

Companion to the executable suite under `frontend/e2e/` and the plan in
`docs/uat-test-plan.md`. Each row maps an approved requirement to its
user-visible outcome and the verification that covers it.

- **Status = Executable**: covered by a committed, passing UAT journey or an
  explicitly documented lower-level test.
- **Status = Planned**: requirement (or its feature) is still `Todo` in
  `docs/task-tracker.md`. No skipped or expected-failure UAT test is committed;
  the scenario becomes executable when the tracker task is `Done`.

## Executable coverage

| Requirement | Product outcome | Verification | Status |
|---|---|---|---|
| Safe base rendering (P1) | Headings, prose, GFM tables/tasks, callouts render; raw HTML/script is inert | UAT-01 | Executable |
| Frontmatter metadata (P1) | Metadata panel shows status badge and tags | UAT-01 | Executable |
| Reader link styling (P8/P11 reader CSS) | Heading self-links inherit heading ink and are not underlined | UAT-01 | Executable |
| Navigation model (P2) | TOC outline and internal anchors resolve | UAT-01 (outline render), UAT-04 (restore) | Executable |
| Local assets (P3) | Relative images resolve through the tokenized boundary and load | UAT-01 | Executable |
| Progressive enhancement (P4) | Code highlights lazily; KaTeX math renders | UAT-01, UAT-02 | Executable |
| Mermaid (P4) | Diagrams render with semantic reader colors, not library defaults | UAT-01, UAT-02 | Executable |
| Theme propagation (P4.5/P8.3) | Light/dark switch updates chrome and content together without reopening | UAT-02 | Executable |
| Durable settings (P8/P9.4) | Selected theme/settings persist across restart | UAT-02, UAT-04 | Executable |
| Notes/wikilinks (P6) | Unresolved wikilinks render as inert, non-navigable spans | UAT-01 | Executable |
| Virtualized active rendering (P5/P9.11) | Only the active document mounts a reader surface | UAT-04 | Executable |
| Tabbed workspace (P9.1–P9.2) | Open, switch, close, and reopen tabs | UAT-04 | Executable |
| Canonical-path dedup (P9.2) | Reopening an open path activates the existing tab | UAT-04 | Executable |
| File drop (P9.7) | Dropped Markdown opens or activates a tab | UAT-04 | Executable |
| Watcher reload (P3.6/P9.3) | External change reloads while preserving reading position | UAT-04 | Executable |
| Sessions and recents (P9.4–P9.6) | Tab order, active tab, positions, settings, and recents restore on restart | UAT-04 | Executable |
| Missing-file recovery (P9.5) | A restored missing tab can locate a replacement without creating a duplicate tab or watcher | UAT-04 | Executable |
| Parser security schema (P1.3) | Malicious HTML fixtures render inert | `src/core/pipeline/parseDocument.test.ts` (unit) + UAT-01 | Executable |
| Bounded large-document DOM (P5) | Mounted block count stays bounded | `scripts/benchmark-reader.mjs` (performance harness) | Executable |
| Full-document search (P10.1–P10.3) | Offscreen matches are counted, materialized, marked, and case-filtered | UAT-03 | Executable |
| Navigation and command spine (P10.4–P10.5) | History and palette commands are keyboard operable with focus restoration | history unit tests, UAT-05 | Executable |
| Copy and Mermaid tools (P10.6–P10.7) | Copy state is announced; diagrams open and close through an accessible dialog | UAT-05 | Executable |
| Complete-document print (P10.9–P10.10) | Print sees the expanded document; cancellation skips print; cleanup restores bounds | UAT-06 | Executable |
| Multi-tab performance (P10.14) | Several large tabs retain one bounded active reader with thresholded activation | `scripts/benchmark-workspace.mjs` | Executable |
| Reader appearance and focus mode (P11.4–P11.5) | Appearance updates without reparse and focus mode remains keyboard reachable | UAT-05 | Executable |
| Accessibility release gate (P11.9–P11.10) | Keyboard tabs/modals, labels, announcements, and reduced motion pass with no serious/critical axe findings | UAT-07 | Executable |
| Custom context menus | Native menu suppressed; consistent per-surface custom menu for reader, tabs, outline, and toolbar | UAT-08 | Executable |
| OS file association (P12.1/P12.3) | OS-handed files open as tabs (live and cold start); Settings offers user-consented default handling with Windows chooser semantics | UAT-09 + on-device macOS and Windows acceptance | Executable |
| Scroll stability after outline navigation (P5/P9.11) | The document comes to rest after a minimap jump; no self-sustaining scroll oscillation | UAT-11 | Executable |
| Performance baseline (P13) | Reader/workspace performance thresholds are measured before release | `scripts/benchmark-reader.mjs`, `scripts/benchmark-workspace.mjs`, `docs/performance-audit-next-release.md` | Executable |
| Document line numbers (P14) | Optional source line gutter renders from parser metadata and copy excludes visual numbers | UAT-05 + parser unit tests | Executable |
| Code line numbers and wrap controls (P14) | Code gutters and wrap defaults/toggles work with syntax highlighting and clean copy | UAT-05 + benchmark enhancement checks | Executable |
| Minimap marks and find feedback (P15) | Viewport, search, heading, code, diagram, and table marks are model-driven; no-results state is visible | UAT-03, UAT-11, minimap unit tests | Executable |
| Document statistics (P16) | Word/read-time/structure counts surface quietly in the metadata masthead | UAT-01 + stats unit tests | Executable |
| Pinned and cleaned recents (P16) | Pinned recents remain first; unpinned/missing recents can be cleared | UAT-04 + workspace unit tests | Executable |
| Print metadata option (P16) | Print can include or exclude the metadata masthead while still expanding the full document | UAT-06 | Executable |
| Reader recovery states (P16) | Missing, permission, parse, asset, enhancement, and oversized states are typed and recoverable where appropriate | UAT-04 + reader error unit tests | Executable |
| Reader token contract and high contrast (P17) | Reader tokens document line gutters/minimap/code/print and high-contrast preset remains semantic | `docs/design-system/reader-token-contract.md`, theme unit tests, UAT-07 | Executable |
| Table reading tools (P18) | Tables can be constrained to reader measure, auto-sized/wrapped, filtered, sorted, and safely suppress controls when unsuitable | UAT-12 + table projection unit tests | Executable |
| Reader feedback polish (P19) | Display settings are sectioned and labelled; source gutters align; minimap marks are explained; Mermaid source can be inspected in place | UAT-03, UAT-05 | Executable |
| Table filter ergonomics (P19) | Headered tables expose column filter controls with active chips, row counts, clear actions, and recoverable empty states | UAT-12 + table projection unit tests | Executable |

Cross-platform acceptance remains tracked by P7.7/P11.11 and begins after the
GitHub repository exists and the hosted workflow has produced its first matrix.

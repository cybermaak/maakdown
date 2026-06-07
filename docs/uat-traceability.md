# Maakdown UAT Requirements Traceability

Companion to the executable suite under `frontend/e2e/` and the plan in
`docs/uat-test-plan.md`. Each row maps an approved requirement to its
user-visible outcome and the verification that covers it.

- **Status = Executable**: covered by a committed, passing UAT journey or an
  explicitly documented lower-level test.
- **Status = Planned**: requirement (or its feature) is still `Todo` in
  `docs/task-tracker.md`. No skipped or expected-failure UAT test is committed;
  the scenario becomes executable when the tracker task is `Done`.

## Executable coverage (Done phases P0–P9)

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
| Parser security schema (P1.3) | Malicious HTML fixtures render inert | `src/core/pipeline/parseDocument.test.ts` (unit) + UAT-01 | Executable |
| Bounded large-document DOM (P5) | Mounted block count stays bounded | `scripts/benchmark-reader.mjs` (performance harness) | Executable |

## Planned coverage (Todo phases P10–P11)

| Requirement | Product outcome | Verification | Status |
|---|---|---|---|
| Full-document search (P10.1–P10.3) | Offscreen matches counted, materialized, wrapped, and marked | UAT-03 | Planned |
| Navigation history (P10.4) | Per-tab back/forward restores path and anchor | UAT-05 | Planned |
| Command palette (P10.5) | Palette groups commands, tabs, recents, and headings | UAT-05 | Planned |
| Copy tools (P10.6) | Code/heading copy announce success and failure | UAT-05 | Planned |
| Mermaid inspection dialog (P10.7) | Captioned diagrams open with zoom/pan/reset and focus restore | UAT-05 | Planned |
| Reload status (P10.8) | Toolbar/tab expose watching, changed, and reload states | UAT-04 (extension) | Planned |
| Complete-document print (P10.9–P10.10) | Print sees the whole document, then cleanup restores bounds and position | UAT-06 | Planned |
| Editorial shell and panels (P11.1–P11.3) | Outline, two-row chrome, resizable/collapsible panels, narrow drawers | UAT-05 | Planned |
| Reader appearance controls (P11.4) | Font, size, line height, measure update without reparse and persist | UAT-05 | Planned |
| Focus mode (P11.5) | Secondary chrome hides; find and explicit exit stay reachable | UAT-05 | Planned |
| Accessibility release gate (P11.9–P11.10) | Keyboard, landmarks, modal focus, announcements, reduced motion | UAT-07 | Planned |

When a Planned row's tracker task becomes `Done`, add its UAT scenario (UAT-03,
UAT-05, UAT-06, or UAT-07) as an executable spec under `frontend/e2e/` and move
the row to the Executable table before treating the phase as release-ready.

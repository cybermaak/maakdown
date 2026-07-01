# Next Release Task Tracker

**Release theme:** Precision Reading & Performance  
**Status values:** Todo, In Progress, Blocked, Done, Deferred.  
**Validation rule:** macOS validation blocks the next task. Windows and Linux
validation do not block the next task, but block release.  
**Last updated:** 2026-07-01

## Summary

| Phase | Status | Goal | Release Gate |
|---|---|---|---|
| P13 | Done | Performance baseline and instrumentation | macOS baseline recorded; Windows/Linux release validation pending |
| P14 | Done | Source orientation and code reading tools | macOS browser/UAT validation passed; Windows/Linux release validation pending |
| P15 | Done | Navigation insight | macOS browser/UAT validation passed; Windows/Linux release validation pending |
| P16 | Done | Reader utilities | macOS unit, UAT, benchmark, build, and release checks passed; Windows/Linux release validation pending |
| P17 | In Progress | Theme, accessibility, and release acceptance | macOS acceptance passed; Windows/Linux release validation blocks release |

## Validation Fields

Each task includes:

- **Mac validation:** must pass before moving to the next task.
- **Windows validation:** may be pending while work continues; must pass before release.
- **Linux validation:** may be pending while work continues; must pass before release.

Use `Pending`, `Passed`, `Blocked`, or `Waived by user` in validation notes as
work progresses.

## P13 - Performance Baseline And Instrumentation

| ID | Status | Task | Owner | Depends On | Exit Criteria | Mac Validation | Windows Validation | Linux Validation |
|---|---|---|---|---|---|---|---|---|
| P13.1 | Done | Define next-release benchmark matrix | Frontend/Perf | none | fixtures and metrics cover cold open, open-to-readable text, parser time, transfer payload, scroll, memory, enhancement cost, session restore, and print expansion | Passed: `npm run benchmark` on macOS; baseline recorded in `docs/performance-audit-next-release.md` | Pending: run CI/browser subset and native Windows smoke before release | Pending: run CI/browser subset and native Linux smoke before release |
| P13.2 | Done | Add memory probe harness | Frontend/Perf | P13.1 | repeated open/close/reopen and multi-tab scenarios report heap trend or available browser memory proxy without destabilizing CI | Passed: `npm run benchmark:workspace` on macOS records memory probe and active-tab-only mounted reader | Pending: run in GitHub Actions or Windows machine before release | Pending: run in GitHub Actions or Linux machine before release |
| P13.3 | Done | Measure parser source-position overhead | Frontend/Perf | P13.1 | benchmark can compare parser model with/without source-location extraction | Passed: macOS benchmark records enabled/disabled parser deltas and transfer overhead | Pending: CI browser run before release | Pending: CI browser run before release |
| P13.4 | Done | Audit current enhancement costs | Frontend/Perf | P13.1 | Mermaid, highlight.js, Shiki, KaTeX, image resolution, and vault indexing have timing notes and candidate optimizations | Passed: macOS benchmark verifies highlight.js, Shiki, Mermaid, and KaTeX enhancement surfaces | Pending: native screenshot/release smoke before release | Pending: native screenshot/release smoke before release |
| P13.5 | Done | Publish performance audit baseline | Docs/Perf | P13.1-P13.4 | `docs/performance-audit-next-release.md` includes baseline, thresholds, and prioritized optimization tasks | Passed: audit doc created; `git diff --check` passed | Pending: not applicable until release summary | Pending: not applicable until release summary |

## P14 - Source Orientation And Code Reading Tools

| ID | Status | Task | Owner | Depends On | Exit Criteria | Mac Validation | Windows Validation | Linux Validation |
|---|---|---|---|---|---|---|---|---|
| P14.1 | Done | Add source line metadata to document model | Frontend Core | P13.3 | parsed blocks include stable `sourceStartLine` and optional `sourceEndLine`; missing positions degrade gracefully | Passed: parser tests and macOS benchmark confirm source metadata on fixtures | Pending: CI parser tests before release | Pending: CI parser tests before release |
| P14.2 | Done | Implement document line-number setting | Frontend | P14.1 | Settings and command palette toggle persisted document line numbers without reparsing unnecessarily | Passed: full macOS UAT covers settings/palette path and config persistence plumbing | Pending: Windows UAT/native smoke before release | Pending: Linux UAT/native smoke before release |
| P14.3 | Done | Render document line-number gutter | Frontend | P14.2 | mounted blocks show subtle source line numbers; copy excludes numbers; virtualization remains bounded | Passed: macOS benchmark keeps mounted blocks bounded; UAT verifies visible gutter and copy exclusion | Pending: Windows native screenshot/manual pass before release | Pending: Linux native screenshot/manual pass before release |
| P14.4 | Done | Add source-line navigation affordance | Frontend | P14.3 | command/search result or copied heading link can expose approximate source line without editor behavior | Passed: macOS UAT/search/outline navigation keeps source-line gutter visible with per-block source titles | Pending: Windows UAT/manual pass before release | Pending: Linux UAT/manual pass before release |
| P14.5 | Done | Add code block line numbers | Frontend | P14.1/P14.3 | fenced code blocks can show line numbers independent of document gutter; copy excludes numbers | Passed: macOS UAT verifies code gutter and copy exclusion; benchmark covers highlighted code surfaces | Pending: Windows screenshot/manual pass before release | Pending: Linux screenshot/manual pass before release |
| P14.6 | Done | Add code wrap/nowrap controls | Frontend | P14.5 | per-block wrap toggle and global default work with highlight.js and Shiki | Passed: macOS UAT verifies global default and per-block wrap toggle; benchmark still verifies highlight.js and Shiki | Pending: Windows native screenshot/manual pass before release | Pending: Linux native screenshot/manual pass before release |
| P14.7 | Done | Add orientation UAT coverage | Frontend QA | P14.2-P14.6 | UAT covers document line numbers, code line numbers, wrapping, persistence, and copy exclusion | Passed: `npm run uat` on macOS, 26 tests passed in 13.9s | Pending: GitHub CI Windows UAT before release | Pending: GitHub CI Linux UAT before release |

## P15 - Navigation Insight

| ID | Status | Task | Owner | Depends On | Exit Criteria | Mac Validation | Windows Validation | Linux Validation |
|---|---|---|---|---|---|---|---|---|
| P15.1 | Done | Model minimap marks | Frontend Core | P13.1/P10 | parsed headings, visible viewport, search hits, and optional code/diagram marks project to minimap coordinates cheaply | Passed: minimap unit tests and macOS UAT verify model/search marks | Pending: CI tests before release | Pending: CI tests before release |
| P15.2 | Done | Add current viewport indicator | Frontend | P15.1 | collapsed and expanded minimap show current viewport without distracting motion | Passed: macOS UAT scroll-stability regression and benchmark keep virtualized range steady | Pending: Windows screenshot/manual pass before release | Pending: Linux screenshot/manual pass before release |
| P15.3 | Done | Add search hit marks to minimap | Frontend | P15.1/P10.2 | active current-document search displays hit marks; clearing search removes marks | Passed: macOS UAT verifies search marks appear and clear on no-results state | Pending: Windows UAT/manual pass before release | Pending: Linux UAT/manual pass before release |
| P15.4 | Done | Add optional structural marks | Frontend | P15.1 | code/diagram/table marks are added only if cheap and visually restrained; otherwise document deferral | Passed: structural code/diagram/table marks are projected from parsed block metadata and covered by unit tests | Pending: Windows screenshot/manual pass before release | Pending: Linux screenshot/manual pass before release |
| P15.5 | Done | Polish find feedback | Frontend | P15.3 | no-results and wrapped-navigation states are visible, accessible, and announced | Passed: macOS UAT verifies visible no-results feedback; wrap status is aria-live | Pending: Windows UAT before release | Pending: Linux UAT before release |
| P15.6 | Done | Add minimap/search UAT coverage | Frontend QA | P15.2-P15.5 | UAT covers viewport mark, search marks, no results, and wrapped navigation | Passed: focused macOS UAT and full `npm run uat` passed | Pending: GitHub CI Windows UAT before release | Pending: GitHub CI Linux UAT before release |

## P16 - Reader Utilities

| ID | Status | Task | Owner | Depends On | Exit Criteria | Mac Validation | Windows Validation | Linux Validation |
|---|---|---|---|---|---|---|---|---|
| P16.1 | Done | Add document stats projection | Frontend Core | P14.1 | word count, reading time, heading/code/diagram/image/table/task/source-line counts derive from parsed model | Passed: `npm test -- --run src/core/stats/documentStats.test.ts src/core/workspace/workspace.test.ts src/core/errors/readerErrors.test.ts`; full `npm test` | Pending: CI tests before release | Pending: CI tests before release |
| P16.2 | Done | Surface document stats quietly | Frontend | P16.1 | stats appear in masthead/settings without creating dashboard weight; shared formatter used | Passed: UAT-01 verifies stats in the masthead metadata region; `npm run uat` | Pending: Windows screenshot/manual pass before release | Pending: Linux screenshot/manual pass before release |
| P16.3 | Done | Extend recent document model | Frontend/Backend | P9.4 | recents support pinned state and missing-file metadata with backward-compatible migration | Passed: Go config migration/persistence tests and workspace unit tests | Pending: Windows config/session pass before release | Pending: Linux config/session pass before release |
| P16.4 | Done | Add pinned recents and cleanup actions | Frontend | P16.3 | pin/unpin, clear missing, clear unpinned, and command palette pinned recents work | Passed: UAT-04 verifies pinned recents and clearing unpinned recents; workspace unit tests | Pending: Windows UAT/manual pass before release | Pending: Linux UAT/manual pass before release |
| P16.5 | Done | Refine print stylesheet | Frontend | P10.9/P14.5 | page breaks improve for headings, code, tables, Mermaid, callouts; line numbers and metadata behave intentionally | Passed: UAT-06 print snapshot verifies complete-document print and virtualization restore | Pending: Windows print preview/manual pass before release | Pending: Linux print/PDF manual pass before release |
| P16.6 | Done | Add print metadata option | Frontend/Backend | P16.5 | include/exclude metadata masthead persists and affects print output only | Passed: config migration/default tests and UAT-06 metadata exclusion scenario | Pending: Windows print manual pass before release | Pending: Linux print manual pass before release |
| P16.7 | Done | Improve reader recovery states | Full Stack | P10.12/P13.4 | oversized, parse, asset, Mermaid, missing, and permission states remain typed and recoverable | Passed: reader error unit tests and UAT-04 missing-document recovery | Pending: Windows UAT/manual pass before release | Pending: Linux UAT/manual pass before release |
| P16.8 | Done | Add reader utility UAT coverage | Frontend QA | P16.2/P16.4/P16.6/P16.7 | UAT covers stats, pinned recents, print metadata, and recovery states | Passed: `npm run uat` on macOS, 27 tests passed in 15.9s during release check | Pending: GitHub CI Windows UAT before release | Pending: GitHub CI Linux UAT before release |

## P17 - Theme, Accessibility, Performance Closeout, And Release Acceptance

| ID | Status | Task | Owner | Depends On | Exit Criteria | Mac Validation | Windows Validation | Linux Validation |
|---|---|---|---|---|---|---|---|---|
| P17.1 | Done | Document reader token contract | Design/Frontend | P14-P16 | `docs/design-system/` documents tokens for line gutters, minimap marks, code tools, print, and high contrast | Passed: token contract added and design-system README linked; `git diff --check` | Pending: screenshot review before release | Pending: screenshot review before release |
| P17.2 | Done | Add or refine high-contrast preset | Frontend/Design | P17.1 | high-contrast reader preset is available if lightweight; otherwise deferral is documented | Passed: high-contrast reader token preset and persisted setting added; `npm run check`, UAT accessibility pass | Pending: Windows screenshot/manual pass before release | Pending: Linux screenshot/manual pass before release |
| P17.3 | Done | Run measured optimization pass | Frontend/Backend/Perf | P13/P14-P16 | prioritized optimizations from audit are implemented or explicitly deferred with data | Passed: `npm run benchmark` and `npm run benchmark:workspace`; closeout recorded in `docs/performance-audit-next-release.md` | Pending: CI benchmark/release smoke before release | Pending: CI benchmark/release smoke before release |
| P17.4 | Done | Update UAT plan and traceability | QA/Docs | P14-P16 | UAT docs include new spec-level scenarios without exceeding release time budget materially | Passed: UAT plan and traceability updated; `npm run uat` passed in 15.9s during release check | Pending: Windows CI UAT before release | Pending: Linux CI UAT before release |
| P17.5 | Done | Run full macOS acceptance | Release | P13-P17.4 | all new features pass in packaged macOS app; no task has pending macOS validation | Passed: `scripts/release-check.sh` completed successfully on macOS, including Wails `darwin/arm64` build | N/A | N/A |
| P17.6 | Blocked | Run Windows release-blocking validation | Release | P17.5 | all new features pass Windows CI plus native/manual checks where required | Already passed macOS; run Windows CI, native screenshots, release smoke, and manual native checks | Blocked: requires GitHub Actions push or native Windows validation before release | N/A |
| P17.7 | Blocked | Run Linux release-blocking validation | Release | P17.5 | all new features pass Linux CI plus native/manual checks where required | Already passed macOS; run Linux CI, native screenshots, release smoke, and manual native checks | N/A | Blocked: requires GitHub Actions push or native Linux validation before release |
| P17.8 | In Progress | Prepare release notes and final release gate | Release/Docs | P17.5-P17.7 | release notes describe precision reading features, perf results, and known limits; release process is ready | Passed: release checklist updated and macOS release check passed; final notes wait for Windows/Linux gates | Pending: release smoke before release | Pending: release smoke before release |

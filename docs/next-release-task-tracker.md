# Next Release Task Tracker

**Release theme:** Precision Reading & Performance  
**Status values:** Todo, In Progress, Blocked, Done, Deferred.  
**Validation rule:** macOS validation blocks the next task. Windows and Linux
validation do not block the next task, but block release.  
**Last updated:** 2026-07-01

## Summary

| Phase | Status | Goal | Release Gate |
|---|---|---|---|
| P13 | Todo | Performance baseline and instrumentation | baseline recorded; no-regression thresholds defined |
| P14 | Todo | Source orientation and code reading tools | document/code line numbers and code wrap validated |
| P15 | Todo | Navigation insight | minimap/search polish validated |
| P16 | Todo | Reader utilities | stats, recents, print, and recovery polish validated |
| P17 | Todo | Theme, accessibility, and release acceptance | all macOS gates passed; Windows/Linux release gates passed |

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
| P13.1 | Todo | Define next-release benchmark matrix | Frontend/Perf | none | fixtures and metrics cover cold open, open-to-readable text, parser time, transfer payload, scroll, memory, enhancement cost, session restore, and print expansion | Run matrix locally on macOS; record commands and first baseline in `docs/performance-audit-next-release.md` | Pending: run CI/browser subset and native Windows smoke before release | Pending: run CI/browser subset and native Linux smoke before release |
| P13.2 | Todo | Add memory probe harness | Frontend/Perf | P13.1 | repeated open/close/reopen and multi-tab scenarios report heap trend or available browser memory proxy without destabilizing CI | Run macOS memory probe three times; confirm bounded trend or document noise | Pending: run in GitHub Actions or Windows machine before release | Pending: run in GitHub Actions or Linux machine before release |
| P13.3 | Todo | Measure parser source-position overhead | Frontend/Perf | P13.1 | benchmark can compare parser model with/without source-location extraction | Run macOS benchmark on small/medium/large fixtures; record delta | Pending: CI browser run before release | Pending: CI browser run before release |
| P13.4 | Todo | Audit current enhancement costs | Frontend/Perf | P13.1 | Mermaid, highlight.js, Shiki, KaTeX, image resolution, and vault indexing have timing notes and candidate optimizations | Open evaluation fixture on macOS; confirm timings and document candidates | Pending: native screenshot/release smoke before release | Pending: native screenshot/release smoke before release |
| P13.5 | Todo | Publish performance audit baseline | Docs/Perf | P13.1-P13.4 | `docs/performance-audit-next-release.md` includes baseline, thresholds, and prioritized optimization tasks | Review doc locally and run `git diff --check` | Pending: not applicable until release summary | Pending: not applicable until release summary |

## P14 - Source Orientation And Code Reading Tools

| ID | Status | Task | Owner | Depends On | Exit Criteria | Mac Validation | Windows Validation | Linux Validation |
|---|---|---|---|---|---|---|---|---|
| P14.1 | Todo | Add source line metadata to document model | Frontend Core | P13.3 | parsed blocks include stable `sourceStartLine` and optional `sourceEndLine`; missing positions degrade gracefully | Run parser tests and open fixture on macOS; inspect headings, lists, code, tables, math, and Mermaid line metadata | Pending: CI parser tests before release | Pending: CI parser tests before release |
| P14.2 | Todo | Implement document line-number setting | Frontend | P14.1 | Settings and command palette toggle persisted document line numbers without reparsing unnecessarily | On macOS toggle line numbers, restart app, confirm persistence and no layout jump | Pending: Windows UAT/native smoke before release | Pending: Linux UAT/native smoke before release |
| P14.3 | Todo | Render document line-number gutter | Frontend | P14.2 | mounted blocks show subtle source line numbers; copy excludes numbers; virtualization remains bounded | On macOS open 10k fixture, scroll top/middle/end, copy text, confirm bounded DOM and stable gutter | Pending: Windows native screenshot/manual pass before release | Pending: Linux native screenshot/manual pass before release |
| P14.4 | Todo | Add source-line navigation affordance | Frontend | P14.3 | command/search result or copied heading link can expose approximate source line without editor behavior | On macOS navigate to headings and verify displayed line numbers match source approximately | Pending: Windows UAT/manual pass before release | Pending: Linux UAT/manual pass before release |
| P14.5 | Todo | Add code block line numbers | Frontend | P14.1/P14.3 | fenced code blocks can show line numbers independent of document gutter; copy excludes numbers | On macOS test TypeScript, Go, shell, and long code blocks in light/dark themes | Pending: Windows screenshot/manual pass before release | Pending: Linux screenshot/manual pass before release |
| P14.6 | Todo | Add code wrap/nowrap controls | Frontend | P14.5 | per-block wrap toggle and global default work with highlight.js and Shiki | On macOS toggle wrapping for long code; switch highlighter; confirm no highlight/theme regression | Pending: Windows native screenshot/manual pass before release | Pending: Linux native screenshot/manual pass before release |
| P14.7 | Todo | Add orientation UAT coverage | Frontend QA | P14.2-P14.6 | UAT covers document line numbers, code line numbers, wrapping, persistence, and copy exclusion | Run `npm run uat` on macOS; verify new tests fail before feature or assert exact behavior | Pending: GitHub CI Windows UAT before release | Pending: GitHub CI Linux UAT before release |

## P15 - Navigation Insight

| ID | Status | Task | Owner | Depends On | Exit Criteria | Mac Validation | Windows Validation | Linux Validation |
|---|---|---|---|---|---|---|---|---|
| P15.1 | Todo | Model minimap marks | Frontend Core | P13.1/P10 | parsed headings, visible viewport, search hits, and optional code/diagram marks project to minimap coordinates cheaply | On macOS run unit tests and benchmark mark projection on large fixture | Pending: CI tests before release | Pending: CI tests before release |
| P15.2 | Todo | Add current viewport indicator | Frontend | P15.1 | collapsed and expanded minimap show current viewport without distracting motion | On macOS scroll large fixture and confirm viewport indicator tracks smoothly | Pending: Windows screenshot/manual pass before release | Pending: Linux screenshot/manual pass before release |
| P15.3 | Todo | Add search hit marks to minimap | Frontend | P15.1/P10.2 | active current-document search displays hit marks; clearing search removes marks | On macOS search common/rare terms and confirm marks/navigate results correctly | Pending: Windows UAT/manual pass before release | Pending: Linux UAT/manual pass before release |
| P15.4 | Todo | Add optional structural marks | Frontend | P15.1 | code/diagram/table marks are added only if cheap and visually restrained; otherwise document deferral | On macOS inspect technical fixture in both themes and confirm marks do not clutter | Pending: Windows screenshot/manual pass before release | Pending: Linux screenshot/manual pass before release |
| P15.5 | Todo | Polish find feedback | Frontend | P15.3 | no-results and wrapped-navigation states are visible, accessible, and announced | On macOS keyboard-test find next/previous, no results, wrap, and focus restoration | Pending: Windows UAT before release | Pending: Linux UAT before release |
| P15.6 | Todo | Add minimap/search UAT coverage | Frontend QA | P15.2-P15.5 | UAT covers viewport mark, search marks, no results, and wrapped navigation | Run `npm run uat` on macOS and inspect screenshot artifact | Pending: GitHub CI Windows UAT before release | Pending: GitHub CI Linux UAT before release |

## P16 - Reader Utilities

| ID | Status | Task | Owner | Depends On | Exit Criteria | Mac Validation | Windows Validation | Linux Validation |
|---|---|---|---|---|---|---|---|---|
| P16.1 | Todo | Add document stats projection | Frontend Core | P14.1 | word count, reading time, heading/code/diagram/image/table/task/source-line counts derive from parsed model | On macOS run unit tests against fixtures with frontmatter, code, Mermaid, tables, and tasks | Pending: CI tests before release | Pending: CI tests before release |
| P16.2 | Todo | Surface document stats quietly | Frontend | P16.1 | stats appear in masthead/settings without creating dashboard weight; shared formatter used | On macOS inspect small/large documents in narrow and wide windows | Pending: Windows screenshot/manual pass before release | Pending: Linux screenshot/manual pass before release |
| P16.3 | Todo | Extend recent document model | Frontend/Backend | P9.4 | recents support pinned state and missing-file metadata with backward-compatible migration | On macOS seed old session/config, launch app, verify migration and persistence | Pending: Windows config/session pass before release | Pending: Linux config/session pass before release |
| P16.4 | Todo | Add pinned recents and cleanup actions | Frontend | P16.3 | pin/unpin, clear missing, clear unpinned, and command palette pinned recents work | On macOS validate recents from empty state, toolbar/palette, and missing-file recovery | Pending: Windows UAT/manual pass before release | Pending: Linux UAT/manual pass before release |
| P16.5 | Todo | Refine print stylesheet | Frontend | P10.9/P14.5 | page breaks improve for headings, code, tables, Mermaid, callouts; line numbers and metadata behave intentionally | On macOS print preview long fixture, cancel/print-to-PDF, confirm virtualization restored | Pending: Windows print preview/manual pass before release | Pending: Linux print/PDF manual pass before release |
| P16.6 | Todo | Add print metadata option | Frontend/Backend | P16.5 | include/exclude metadata masthead persists and affects print output only | On macOS print preview with option on/off; verify reader view unchanged | Pending: Windows print manual pass before release | Pending: Linux print manual pass before release |
| P16.7 | Todo | Improve reader recovery states | Full Stack | P10.12/P13.4 | oversized, parse, asset, Mermaid, missing, and permission states remain typed and recoverable | On macOS run recovery fixtures and manual missing-file/session restore pass | Pending: Windows UAT/manual pass before release | Pending: Linux UAT/manual pass before release |
| P16.8 | Todo | Add reader utility UAT coverage | Frontend QA | P16.2/P16.4/P16.6/P16.7 | UAT covers stats, pinned recents, print metadata, and recovery states | Run `npm run uat` on macOS and inspect relevant screenshots | Pending: GitHub CI Windows UAT before release | Pending: GitHub CI Linux UAT before release |

## P17 - Theme, Accessibility, Performance Closeout, And Release Acceptance

| ID | Status | Task | Owner | Depends On | Exit Criteria | Mac Validation | Windows Validation | Linux Validation |
|---|---|---|---|---|---|---|---|---|
| P17.1 | Todo | Document reader token contract | Design/Frontend | P14-P16 | `docs/design-system/` documents tokens for line gutters, minimap marks, code tools, print, and high contrast | On macOS review rendered gallery/light/dark screenshots and run `git diff --check` | Pending: screenshot review before release | Pending: screenshot review before release |
| P17.2 | Todo | Add or refine high-contrast preset | Frontend/Design | P17.1 | high-contrast reader preset is available if lightweight; otherwise deferral is documented | On macOS run visual smoke and manual high-contrast/reduced-motion pass | Pending: Windows screenshot/manual pass before release | Pending: Linux screenshot/manual pass before release |
| P17.3 | Todo | Run measured optimization pass | Frontend/Backend/Perf | P13/P14-P16 | prioritized optimizations from audit are implemented or explicitly deferred with data | On macOS compare before/after benchmark and memory probe; update audit doc | Pending: CI benchmark/release smoke before release | Pending: CI benchmark/release smoke before release |
| P17.4 | Todo | Update UAT plan and traceability | QA/Docs | P14-P16 | UAT docs include new spec-level scenarios without exceeding release time budget materially | On macOS run full UAT and confirm timing remains acceptable | Pending: Windows CI UAT before release | Pending: Linux CI UAT before release |
| P17.5 | Todo | Run full macOS acceptance | Release | P13-P17.4 | all new features pass in packaged macOS app; no task has pending macOS validation | On macOS run `scripts/release-check.sh`, native app smoke, print preview, and screenshot review | N/A | N/A |
| P17.6 | Todo | Run Windows release-blocking validation | Release | P17.5 | all new features pass Windows CI plus native/manual checks where required | Already passed macOS; run Windows CI, native screenshots, release smoke, and manual native checks | Passed required before release | N/A |
| P17.7 | Todo | Run Linux release-blocking validation | Release | P17.5 | all new features pass Linux CI plus native/manual checks where required | Already passed macOS; run Linux CI, native screenshots, release smoke, and manual native checks | N/A | Passed required before release |
| P17.8 | Todo | Prepare release notes and final release gate | Release/Docs | P17.5-P17.7 | release notes describe precision reading features, perf results, and known limits; release process is ready | On macOS verify docs, `git status`, release check, and signed macOS dry run if needed | Pending: release smoke before release | Pending: release smoke before release |

# Maakdown Task Tracker

**Purpose:** project task breakdown and progress tracker.  
**Status values:** Todo, In Progress, Blocked, Done, Deferred.  
**Last updated:** 2026-06-05.

## Summary

| Phase | Status | Goal | Exit Criteria |
|---|---|---|---|
| P0 | Done | Scaffold repository and app shell | repo initialized, project tree present, tool versions pinned, Wails build passes |
| P1 | Done | Safe base renderer | GFM fixture renders safely; frontmatter panel/hide works |
| P2 | Done | Navigation model | TOC, anchors, and footnote backlinks work before virtualization |
| P3 | Done | Assets and watcher | trusted-root images work; traversal blocked; safe-save reload works |
| P4 | Todo | Rich enhancements | code, math, Mermaid, and theme propagation work |
| P5 | Todo | Virtualized large docs | 10k-line fixture has bounded DOM and working anchors |
| P6 | Todo | Notes support | wikilinks navigate within configured vault |
| P7 | Todo | Release hardening | cross-platform build/signing docs and perf/security runs complete |

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

## P3 - Assets And Watcher

| ID | Status | Task | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|
| P3.1 | Done | Implement trusted-root detection | P0 | vault > git root > file parent precedence | `go test ./internal/assetservice` |
| P3.2 | Done | Implement asset resolver and tokenized ids | P3.1 | traversal and symlink escapes rejected | `go test ./internal/assetservice` |
| P3.3 | Done | Implement loopback asset server | P3.2 | images stream via tokenized URLs | `go test ./internal/assetservice` |
| P3.4 | Done | Implement SVG policy | P3.3 | unsafe SVG blocked or sanitized | `go test ./internal/assetservice` |
| P3.5 | Done | Implement parent-directory watcher | P0 | write/rename/safe-save coalesced | `go test ./internal/watcher` |
| P3.6 | Done | Preserve position on reload | P3.5/P2 | reload restores nearest anchor/block | `npm run check`, `npm run build` |

## P4 - Rich Enhancements

| ID | Status | Task | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|
| P4.1 | Todo | Implement highlight.js highlighter | P1 | visible code blocks highlight lazily | unit/integration tests |
| P4.2 | Todo | Implement optional Shiki JS-regex highlighter | P4.1 | engine can be selected for evaluation | highlighter tests |
| P4.3 | Todo | Instrument highlighter timings | P4.1 | timing report emitted for fixtures | perf harness |
| P4.4 | Todo | Implement Mermaid manager | P1 | visible diagrams render lazily and show errors safely | integration tests |
| P4.5 | Todo | Implement theme propagation | P4.1/P4.4 | document, highlighter, Mermaid update without reparse | integration test |

## P5 - Virtualized Large Docs

| ID | Status | Task | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|
| P5.1 | Todo | Implement block virtualizer | P2/P4 | mounted block count bounded | perf test |
| P5.2 | Todo | Implement dynamic-height measurement cache | P5.1 | large doc scroll remains stable | integration/perf tests |
| P5.3 | Todo | Implement multi-pass anchor stabilization | P5.2 | anchor target lands within tolerance | integration test |
| P5.4 | Todo | Schedule visible enhancement work | P5.1/P4 | no sustained scroll-frame drops | perf harness |

## P6 - Notes Support

| ID | Status | Task | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|
| P6.1 | Todo | Build vault index service | P3 | note names map to paths | unit tests |
| P6.2 | Todo | Transfer vault index to parser worker on change | P6.1 | parse calls pass version id only | worker tests |
| P6.3 | Todo | Render resolved/unresolved wikilinks | P6.2 | links open target notes or show unresolved state | integration test |

## P7 - Release Hardening

| ID | Status | Task | Depends On | Exit Criteria | Verification |
|---|---|---|---|---|---|
| P7.1 | Todo | Build performance fixture corpus | P1 | named fixtures exist | perf harness |
| P7.2 | Todo | Implement perf harness | P5 | target metrics recorded per platform | perf report |
| P7.3 | Todo | Add macOS signing/notarization runbook | P0 | non-secret signing docs exist | doc review |
| P7.4 | Todo | Add Windows signing runbook | P0 | non-secret signing docs exist | doc review |
| P7.5 | Todo | Cross-platform packaging verification | P7.3/P7.4 | builds validated on Windows/macOS/Linux | release checklist |

# Next Release Performance Audit

**Release:** Precision Reading & Performance  
**Status:** Baseline and closeout recorded
**Last updated:** 2026-07-01

## Measurement Commands

Run from the repository root unless noted:

```bash
cd frontend && npm run benchmark
cd frontend && npm run benchmark:workspace
```

Outputs:

- `output/performance/reader-benchmark.json`
- `output/performance/workspace-benchmark.json`

## macOS Baseline

Environment:

- platform: `darwin`
- arch: `arm64`
- browser harness: Playwright Chromium
- generated at: `2026-07-01T06:34:48Z` and `2026-07-01T06:35:08Z`

### Reader Open And Virtualization

| Fixture | Open To Text | Blocks | Source Lines | Mounted Blocks | Mounted Readers |
|---|---:|---:|---:|---:|---:|
| `small-readme.md` | 467 ms | 47 | 243 | 16 | 1 |
| `medium-technical-doc.md` | 210 ms | 214 | 975 | 41 | 1 |
| `large-10k-lines.md` | 1,309 ms | 2,606 | 10,727 | 12 | 1 |

Scroll assignment stayed effectively flat in the benchmark harness:

- max scroll assignment: 0.10 ms
- average scroll assignment: 0.0033 ms or less

### Parser Source-Position Overhead

| Fixture | With Positions | Without Positions | Delta | Transfer Delta |
|---|---:|---:|---:|---:|
| `small-readme.md` | 14.4 ms | 10.3 ms | +4.1 ms | +1.6 KB |
| `medium-technical-doc.md` | 51.8 ms | 38.5 ms | +13.3 ms | +7.2 KB |
| `large-10k-lines.md` | 586.7 ms | 530.1 ms | +56.6 ms | +93.5 KB |

Decision: source-position collection is acceptable for the next release. It is
linear, scalar-only, and needed for source line numbers. Keep the data cheap:
line numbers only, no source-map reconstruction.

### Enhancement Costs

The benchmark verifies at least one rendered block for each enhancement surface:

- highlight.js: rendered
- Shiki: rendered after settings switch
- Mermaid: rendered without errors
- KaTeX: rendered

Observed mounted enhanced blocks stay low because enhancement remains tied to
the virtualized range.

### Workspace And Memory Probe

Workspace benchmark:

- restored tabs: 3
- mounted readers: 1
- mounted blocks: 22
- tab activation samples: 84 ms, 23 ms, 29 ms
- max activation: 84 ms
- browser memory probe: 20.5 MB used JS heap, 33.1 MB total JS heap

Reader benchmark browser memory probe reported roughly 21.7 MB used JS heap
across the sampled fixtures. Chromium's memory values are coarse in this
headless harness, so treat them as trend probes, not exact allocations.

## Thresholds For This Release

These thresholds guard against broad regressions while leaving room for
reasonable machine variance:

- large fixture open-to-readable text: <= 1,800 ms on local macOS benchmark
- large fixture parser with source positions: <= 750 ms on local macOS benchmark
- large fixture mounted blocks during steady scroll: <= 100
- workspace restored mounted readers: exactly 1
- workspace tab activation max: <= 1,500 ms
- source-position transfer overhead on large fixture: <= 150 KB
- no Mermaid errors in the benchmark fixture pass

## Optimization Candidates

- Shiki and Mermaid still dominate bundle weight; keep lazy enhancement and
  avoid eager imports in reader initialization.
- Source-position overhead is acceptable now. Revisit only if source metadata
  expands beyond line-number scalars.
- The benchmark's memory probe is intentionally coarse. If future work shows
  growth across repeated open/close cycles, add a Chromium CDP heap snapshot
  probe rather than guessing from one sample.

## Validation Notes

- P13.1 baseline matrix: Passed on macOS with reader and workspace benchmarks.
- P13.2 memory probe harness: Passed on macOS through browser memory probes and
  workspace multi-tab activation.
- P13.3 parser source-position overhead: Passed on macOS with enabled/disabled
  comparison in `reader-benchmark.json`.
- P13.4 enhancement audit: Passed on macOS with highlight.js, Shiki, Mermaid,
  and KaTeX rendering checks in the reader benchmark.
- P13.5 audit publication: Passed by this document plus `git diff --check`.

Windows and Linux benchmark validation remains pending for the release gate.

## P17 Closeout

Closeout run:

- reader benchmark generated at `2026-07-01T15:06:44Z`
- workspace benchmark generated at `2026-07-01T15:06:28Z`

| Fixture | Open To Text | Parser With Positions | Mounted Blocks | Result |
|---|---:|---:|---:|---|
| `small-readme.md` | 215 ms | 30.8 ms | 33 | Pass |
| `medium-technical-doc.md` | 217 ms | 47.9 ms | 41 | Pass |
| `large-10k-lines.md` | 808 ms | 610.6 ms | 11 | Pass |

Workspace closeout:

- mounted readers: 1
- mounted blocks: 22
- tab activation samples: 25 ms, 35 ms, 45 ms
- max activation: 45 ms
- memory probe: 23.1 MB used JS heap, 33.1 MB total JS heap

All closeout values remain inside the accepted release thresholds. No measured
optimization task is required before release. Keep the existing lazy Mermaid and
Shiki enhancement strategy; the major remaining performance risk is bundle
weight from optional rich-rendering engines, not steady-state reader work.

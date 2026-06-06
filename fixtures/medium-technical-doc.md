---
title: Maakdown Reader Evaluation Dossier
subtitle: Product specification, architecture plan, and performance fixture
version: 1.0
status: evaluation
owners:
  - Frontend Platform
  - Desktop Integration
  - Release Engineering
tags:
  - markdown
  - performance
  - security
  - desktop
generated: 2026-06-05
---

# Maakdown Reader Evaluation Dossier

This document is a combined product specification, implementation plan, security
review, and performance fixture for **Maakdown**, a cross-platform desktop
Markdown viewer. It is deliberately substantial: the content remains meaningful
when read end-to-end, while its size and feature density make it useful for
evaluating first paint, scrolling, navigation, local assets, and progressive
enhancement.

> [!IMPORTANT]
> This fixture is executable documentation. When a renderer feature changes, the
> same file should be reopened and compared across macOS WebKit, Windows WebView2,
> and Linux WebKitGTK.

## Executive summary

Maakdown opens local technical documents and personal notes without becoming an
editor or a general-purpose browser. Its design centers on four promises:

1. **Readable first:** sanitized base content appears before expensive work.
2. **Bounded later:** large documents eventually use block virtualization.
3. **Local by default:** files, assets, and credentials stay under explicit trust boundaries.
4. **Predictable everywhere:** one architecture targets all desktop platforms.

The v1 stack is Wails 2.11, Go, Svelte 5, Vite 8, unified/remark/rehype, KaTeX,
highlight.js, and Mermaid. External links are delegated to the system browser.
Relative images are served through an opaque, tokenized loopback URL.

![Maakdown architecture overview](assets/architecture-overview.svg)

## System architecture

```mermaid
flowchart LR
    U[Reader] -->|Open document| W[Wails shell]
    W --> F[Go FileService]
    F --> P[Parser worker]
    P --> S[Sanitized block model]
    S --> V[Document view]
    V --> N[Navigation model]
    V --> H[Visible code highlighter]
    V --> M[Lazy Mermaid manager]
    V --> A[Asset resolver]
    A --> L[Tokenized loopback server]
    F --> X[Parent-directory watcher]
    X -->|Debounced file-changed| P
    N -->|Materialize and stabilize| V
```

### Open and reload sequence

```mermaid
sequenceDiagram
    autonumber
    actor Reader
    participant UI as Svelte UI
    participant Files as FileService
    participant Parser as Parser Worker
    participant Watcher as WatcherService
    Reader->>UI: Choose Markdown file
    UI->>Files: OpenDocument()
    Files-->>UI: canonical path + contents + trusted root
    UI->>Parser: parse(source, path, vaultVersion)
    Parser-->>UI: sanitized blocks + indexes + metadata
    UI->>Watcher: StartWatch(path)
    UI-->>Reader: readable document
    Watcher-->>UI: file-changed(path)
    UI->>Files: ReadDocument(path)
    UI->>Parser: parse(updated source)
    Parser-->>UI: replacement model
    UI-->>Reader: restored nearest anchor
```

### Document lifecycle

```mermaid
stateDiagram-v2
    [*] --> Empty
    Empty --> Opening: choose file
    Opening --> Parsing: bytes loaded
    Parsing --> Readable: sanitized blocks available
    Readable --> Enhancing: visible code or diagram
    Enhancing --> Readable: enhancement complete
    Readable --> Reloading: filesystem event
    Reloading --> Parsing: replacement readable
    Opening --> Error: read rejected
    Parsing --> Error: parse failure
    Error --> Opening: retry
```

## Performance budgets

| Fixture | macOS target | Windows target | Linux target |
|---|---:|---:|---:|
| Small README first meaningful paint | 200 ms | 150 ms | 250 ms |
| Medium technical document | 350 ms | 250 ms | 450 ms |
| This evaluation dossier | responsive scroll | responsive scroll | responsive scroll |
| Anchor correction | <= 8 px | <= 8 px | <= 8 px |

The frame budget at 60 Hz is approximately:

$$
\Delta t = \frac{1000\text{ ms}}{60} \approx 16.67\text{ ms}
$$


## Cross-service dependency model

```mermaid
classDiagram
    class App {
      +Startup(ctx)
      +Shutdown(ctx)
    }
    class FileService {
      +OpenDocument()
      +OpenDocumentAt(path)
      +ReadDocument(path)
    }
    class AssetService {
      +Start()
      +ResolveAsset(documentPath, relativePath)
      +RevokeAsset(id)
    }
    class WatcherService {
      +StartWatch(path)
      +StopWatch()
    }
    class DocumentModel {
      +Block[] blocks
      +Heading[] headings
      +Map anchors
      +Map frontmatter
    }
    App --> FileService
    App --> AssetService
    App --> WatcherService
    FileService --> DocumentModel
    AssetService --> DocumentModel

```

## Release timeline

```mermaid
gantt
    title Maakdown v1 delivery path
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d
    section Foundations
    Scaffold and shell        :done, p0, 2026-06-01, 4d
    Safe base renderer        :done, p1, after p0, 4d
    Navigation model          :done, p2, after p1, 3d
    Assets and watcher        :done, p3, after p2, 4d
    section Rich rendering
    Highlighting and Mermaid  :active, p4, after p3, 6d
    Virtualized documents     :p5, after p4, 8d
    Notes and wikilinks       :p6, after p5, 5d
    section Release
    Signing hardening         :p7, after p6, 6d
```

## Security data model

```mermaid
erDiagram
    DOCUMENT ||--o{ BLOCK : contains
    DOCUMENT ||--o{ ASSET_REFERENCE : requests
    TRUSTED_ROOT ||--o{ ASSET_REFERENCE : constrains
    ASSET_REFERENCE ||--|| ASSET_TOKEN : exposes
    DOCUMENT ||--o{ ANCHOR : indexes
    ANCHOR }o--|| BLOCK : targets
    DOCUMENT {
      string canonical_path
      string trusted_root
      datetime modified_at
    }
    BLOCK {
      string stable_id
      string kind
      string sanitized_html
    }
    ASSET_TOKEN {
      string opaque_id
      string mime_type
    }
```

## 1. Rendering Architecture: Evaluation Scenario 1

This scenario examines **Keeping parsing deterministic while expensive enhancements remain progressive**. The governing choice is:
Sanitize serialized block HTML in the parser worker, then enhance visible code and diagrams separately. The primary measurement is `open-to-readable-text`, owned by
Frontend platform. This section intentionally mixes prose, structured data, links,
code, mathematics, and navigation targets so that one scroll pass exercises the
reader as a coherent technical document rather than as synthetic filler.

### Context and intended behavior

Maakdown should make the base text readable before enhancement work begins. A
reader opening this section should be able to scan the decision, inspect the
acceptance criteria, follow [the implementation checkpoint](#checkpoint-1),
and return from footnote 1 without the interface stealing focus.[^scenario-1]

> [!NOTE]
> Scenario 1 belongs to **P1** and uses `open-to-readable-text` as its
> principal signal. A slow enhancement must never make the unenhanced source unreadable.

> [!WARNING]
> A successful happy-path render is not enough. The same workflow must remain safe
> when Markdown contains raw HTML, malformed links, oversized assets, duplicate
> headings, or a filesystem event burst.

### Acceptance matrix

| Dimension | Expected behavior | Evidence | Owner |
|---|---|---|---|
| Correctness | Stable block ordering and deterministic anchors | fixture snapshot | Frontend platform |
| Security | Sanitized HTML and constrained local resources | adversarial tests | Security |
| Performance | No sustained main-thread stall during scrolling | trace and timing sample | Performance |
| Accessibility | Keyboard-reachable links and meaningful document structure | semantic audit | Reader experience |
| Distribution | Same behavior in development and signed builds | release smoke test | Release engineering |

### Delivery checklist

- [x] Define the scenario and its observable outcome.
- [x] Identify the trusted boundary and failure behavior.
- [ ] Capture p50 and p95 values on macOS WebKit.
- [ ] Repeat the same fixture on Windows WebView2.
- [ ] Record Linux WebKitGTK as the likely performance floor.
- [ ] Link regressions to [[Maakdown Performance Notebook]].

### Quantitative model

For a document with (n) parsed blocks and a visible window containing (v)
blocks, the target steady-state cost is:

$$
T_{frame} = T_{layout}(v) + T_{enhance}(v) + \epsilon,
\qquad v \ll n
$$

The weighted readiness score for this scenario is:

$$
R = 0.35C + 0.25S + 0.20P + 0.10A + 0.10D
$$

where (C) is correctness, (S) security, (P) performance, (A)
accessibility, and (D) distribution confidence.

### typescript implementation sample

```typescript
export async function openAndParse(path: string): Promise<DocumentModel> {
  const document = await openDocumentAt(path);
  const model = await parser.parse({
    source: document.contents,
    path: document.path
  });
  return buildDocumentModel(model);
}
```

### Checkpoint 1

<a id="checkpoint-1"></a>

The checkpoint captures the operational contract:

1. Parse and sanitize before HTML reaches the document surface.
2. Preserve plain text and source code while enhancements are pending.
3. Resolve navigation through stable document-model identifiers.
4. Keep filesystem paths behind the backend trust boundary.
5. Verify the same behavior in a packaged build.

The expected result is measurable: **open-to-readable-text** should remain within its
budget while the reader scrolls continuously through adjacent sections.

[^scenario-1]: Scenario 1 is generated deterministically from the approved Maakdown design and implementation plan.


## 2. Navigation and Reader Position: Evaluation Scenario 1

This scenario examines **Making anchors reliable when large documents eventually use a bounded DOM**. The governing choice is:
Route TOC, footnotes, and internal links through one anchor-to-block navigation model. The primary measurement is `anchor landing error`, owned by
Reader experience. This section intentionally mixes prose, structured data, links,
code, mathematics, and navigation targets so that one scroll pass exercises the
reader as a coherent technical document rather than as synthetic filler.

### Context and intended behavior

Maakdown should make the base text readable before enhancement work begins. A
reader opening this section should be able to scan the decision, inspect the
acceptance criteria, follow [the implementation checkpoint](#checkpoint-2),
and return from footnote 2 without the interface stealing focus.[^scenario-2]

> [!NOTE]
> Scenario 2 belongs to **P1** and uses `anchor landing error` as its
> principal signal. A slow enhancement must never make the unenhanced source unreadable.

> [!WARNING]
> A successful happy-path render is not enough. The same workflow must remain safe
> when Markdown contains raw HTML, malformed links, oversized assets, duplicate
> headings, or a filesystem event burst.

### Acceptance matrix

| Dimension | Expected behavior | Evidence | Owner |
|---|---|---|---|
| Correctness | Stable block ordering and deterministic anchors | fixture snapshot | Reader experience |
| Security | Sanitized HTML and constrained local resources | adversarial tests | Security |
| Performance | No sustained main-thread stall during scrolling | trace and timing sample | Performance |
| Accessibility | Keyboard-reachable links and meaningful document structure | semantic audit | Reader experience |
| Distribution | Same behavior in development and signed builds | release smoke test | Release engineering |

### Delivery checklist

- [x] Define the scenario and its observable outcome.
- [x] Identify the trusted boundary and failure behavior.
- [ ] Capture p50 and p95 values on macOS WebKit.
- [ ] Repeat the same fixture on Windows WebView2.
- [ ] Record Linux WebKitGTK as the likely performance floor.
- [ ] Link regressions to [[Maakdown Performance Notebook]].

### Quantitative model

For a document with (n) parsed blocks and a visible window containing (v)
blocks, the target steady-state cost is:

$$
T_{frame} = T_{layout}(v) + T_{enhance}(v) + \epsilon,
\qquad v \ll n
$$

The weighted readiness score for this scenario is:

$$
R = 0.35C + 0.25S + 0.20P + 0.10A + 0.10D
$$

where (C) is correctness, (S) security, (P) performance, (A)
accessibility, and (D) distribution confidence.

### svelte implementation sample

```svelte
<script lang="ts">
  import type { Heading } from '../core/model/types';
  let { headings, activeId }: { headings: Heading[]; activeId: string | null } = $props();
</script>

<nav aria-label="Document outline">
  {#each headings as heading}
    <button class:active={heading.id === activeId}>{heading.text}</button>
  {/each}
</nav>
```

### Checkpoint 2

<a id="checkpoint-2"></a>

The checkpoint captures the operational contract:

1. Parse and sanitize before HTML reaches the document surface.
2. Preserve plain text and source code while enhancements are pending.
3. Resolve navigation through stable document-model identifiers.
4. Keep filesystem paths behind the backend trust boundary.
5. Verify the same behavior in a packaged build.

The expected result is measurable: **anchor landing error** should remain within its
budget while the reader scrolls continuously through adjacent sections.

[^scenario-2]: Scenario 2 is generated deterministically from the approved Maakdown design and implementation plan.


## 3. Trusted Local Assets: Evaluation Scenario 1

This scenario examines **Displaying relative images without turning the viewer into an arbitrary file server**. The governing choice is:
Resolve assets under a trusted root and expose opaque tokenized loopback URLs. The primary measurement is `blocked traversal attempts`, owned by
Backend platform. This section intentionally mixes prose, structured data, links,
code, mathematics, and navigation targets so that one scroll pass exercises the
reader as a coherent technical document rather than as synthetic filler.

### Context and intended behavior

Maakdown should make the base text readable before enhancement work begins. A
reader opening this section should be able to scan the decision, inspect the
acceptance criteria, follow [the implementation checkpoint](#checkpoint-3),
and return from footnote 3 without the interface stealing focus.[^scenario-3]

> [!NOTE]
> Scenario 3 belongs to **P1** and uses `blocked traversal attempts` as its
> principal signal. A slow enhancement must never make the unenhanced source unreadable.

> [!WARNING]
> A successful happy-path render is not enough. The same workflow must remain safe
> when Markdown contains raw HTML, malformed links, oversized assets, duplicate
> headings, or a filesystem event burst.

### Acceptance matrix

| Dimension | Expected behavior | Evidence | Owner |
|---|---|---|---|
| Correctness | Stable block ordering and deterministic anchors | fixture snapshot | Backend platform |
| Security | Sanitized HTML and constrained local resources | adversarial tests | Security |
| Performance | No sustained main-thread stall during scrolling | trace and timing sample | Performance |
| Accessibility | Keyboard-reachable links and meaningful document structure | semantic audit | Reader experience |
| Distribution | Same behavior in development and signed builds | release smoke test | Release engineering |

### Delivery checklist

- [x] Define the scenario and its observable outcome.
- [x] Identify the trusted boundary and failure behavior.
- [ ] Capture p50 and p95 values on macOS WebKit.
- [ ] Repeat the same fixture on Windows WebView2.
- [ ] Record Linux WebKitGTK as the likely performance floor.
- [ ] Link regressions to [[Maakdown Performance Notebook]].

### Quantitative model

For a document with (n) parsed blocks and a visible window containing (v)
blocks, the target steady-state cost is:

$$
T_{frame} = T_{layout}(v) + T_{enhance}(v) + \epsilon,
\qquad v \ll n
$$

The weighted readiness score for this scenario is:

$$
R = 0.35C + 0.25S + 0.20P + 0.10A + 0.10D
$$

where (C) is correctness, (S) security, (P) performance, (A)
accessibility, and (D) distribution confidence.

### bash implementation sample

```bash
set -euo pipefail

npm --prefix frontend run test
npm --prefix frontend run check
npm --prefix frontend run build
go test ./...
"$(go env GOPATH)/bin/wails" build
```

### Checkpoint 3

<a id="checkpoint-3"></a>

The checkpoint captures the operational contract:

1. Parse and sanitize before HTML reaches the document surface.
2. Preserve plain text and source code while enhancements are pending.
3. Resolve navigation through stable document-model identifiers.
4. Keep filesystem paths behind the backend trust boundary.
5. Verify the same behavior in a packaged build.

The expected result is measurable: **blocked traversal attempts** should remain within its
budget while the reader scrolls continuously through adjacent sections.

[^scenario-3]: Scenario 3 is generated deterministically from the approved Maakdown design and implementation plan.


## 4. Filesystem Reloads: Evaluation Scenario 1

This scenario examines **Surviving editor safe-save behavior without duplicate reloads or lost reading position**. The governing choice is:
Watch the parent directory, debounce event bursts, and restore the nearest stable anchor. The primary measurement is `reload stabilization time`, owned by
Desktop integration. This section intentionally mixes prose, structured data, links,
code, mathematics, and navigation targets so that one scroll pass exercises the
reader as a coherent technical document rather than as synthetic filler.

### Context and intended behavior

Maakdown should make the base text readable before enhancement work begins. A
reader opening this section should be able to scan the decision, inspect the
acceptance criteria, follow [the implementation checkpoint](#checkpoint-4),
and return from footnote 4 without the interface stealing focus.[^scenario-4]

> [!NOTE]
> Scenario 4 belongs to **P2** and uses `reload stabilization time` as its
> principal signal. A slow enhancement must never make the unenhanced source unreadable.

> [!WARNING]
> A successful happy-path render is not enough. The same workflow must remain safe
> when Markdown contains raw HTML, malformed links, oversized assets, duplicate
> headings, or a filesystem event burst.

### Acceptance matrix

| Dimension | Expected behavior | Evidence | Owner |
|---|---|---|---|
| Correctness | Stable block ordering and deterministic anchors | fixture snapshot | Desktop integration |
| Security | Sanitized HTML and constrained local resources | adversarial tests | Security |
| Performance | No sustained main-thread stall during scrolling | trace and timing sample | Performance |
| Accessibility | Keyboard-reachable links and meaningful document structure | semantic audit | Reader experience |
| Distribution | Same behavior in development and signed builds | release smoke test | Release engineering |

### Delivery checklist

- [x] Define the scenario and its observable outcome.
- [x] Identify the trusted boundary and failure behavior.
- [ ] Capture p50 and p95 values on macOS WebKit.
- [ ] Repeat the same fixture on Windows WebView2.
- [ ] Record Linux WebKitGTK as the likely performance floor.
- [ ] Link regressions to [[Maakdown Performance Notebook]].

### Quantitative model

For a document with (n) parsed blocks and a visible window containing (v)
blocks, the target steady-state cost is:

$$
T_{frame} = T_{layout}(v) + T_{enhance}(v) + \epsilon,
\qquad v \ll n
$$

The weighted readiness score for this scenario is:

$$
R = 0.35C + 0.25S + 0.20P + 0.10A + 0.10D
$$

where (C) is correctness, (S) security, (P) performance, (A)
accessibility, and (D) distribution confidence.

### python implementation sample

```python
def percentile(samples: list[float], quantile: float) -> float:
    ordered = sorted(samples)
    index = min(round((len(ordered) - 1) * quantile), len(ordered) - 1)
    return ordered[index]

print({"p50": percentile(latencies, 0.50), "p95": percentile(latencies, 0.95)})
```

### Checkpoint 4

<a id="checkpoint-4"></a>

The checkpoint captures the operational contract:

1. Parse and sanitize before HTML reaches the document surface.
2. Preserve plain text and source code while enhancements are pending.
3. Resolve navigation through stable document-model identifiers.
4. Keep filesystem paths behind the backend trust boundary.
5. Verify the same behavior in a packaged build.

The expected result is measurable: **reload stabilization time** should remain within its
budget while the reader scrolls continuously through adjacent sections.

[^scenario-4]: Scenario 4 is generated deterministically from the approved Maakdown design and implementation plan.


## 5. Progressive Code Highlighting: Evaluation Scenario 1

This scenario examines **Providing rich code without making the initial document paint wait for every grammar**. The governing choice is:
Use highlight.js for visible blocks first and retain raw readable code as the fallback. The primary measurement is `visible highlight latency`, owned by
Frontend platform. This section intentionally mixes prose, structured data, links,
code, mathematics, and navigation targets so that one scroll pass exercises the
reader as a coherent technical document rather than as synthetic filler.

### Context and intended behavior

Maakdown should make the base text readable before enhancement work begins. A
reader opening this section should be able to scan the decision, inspect the
acceptance criteria, follow [the implementation checkpoint](#checkpoint-5),
and return from footnote 5 without the interface stealing focus.[^scenario-5]

> [!NOTE]
> Scenario 5 belongs to **P2** and uses `visible highlight latency` as its
> principal signal. A slow enhancement must never make the unenhanced source unreadable.

> [!WARNING]
> A successful happy-path render is not enough. The same workflow must remain safe
> when Markdown contains raw HTML, malformed links, oversized assets, duplicate
> headings, or a filesystem event burst.

### Acceptance matrix

| Dimension | Expected behavior | Evidence | Owner |
|---|---|---|---|
| Correctness | Stable block ordering and deterministic anchors | fixture snapshot | Frontend platform |
| Security | Sanitized HTML and constrained local resources | adversarial tests | Security |
| Performance | No sustained main-thread stall during scrolling | trace and timing sample | Performance |
| Accessibility | Keyboard-reachable links and meaningful document structure | semantic audit | Reader experience |
| Distribution | Same behavior in development and signed builds | release smoke test | Release engineering |

### Delivery checklist

- [x] Define the scenario and its observable outcome.
- [x] Identify the trusted boundary and failure behavior.
- [ ] Capture p50 and p95 values on macOS WebKit.
- [ ] Repeat the same fixture on Windows WebView2.
- [ ] Record Linux WebKitGTK as the likely performance floor.
- [ ] Link regressions to [[Maakdown Performance Notebook]].

### Quantitative model

For a document with (n) parsed blocks and a visible window containing (v)
blocks, the target steady-state cost is:

$$
T_{frame} = T_{layout}(v) + T_{enhance}(v) + \epsilon,
\qquad v \ll n
$$

The weighted readiness score for this scenario is:

$$
R = 0.35C + 0.25S + 0.20P + 0.10A + 0.10D
$$

where (C) is correctness, (S) security, (P) performance, (A)
accessibility, and (D) distribution confidence.

### rust implementation sample

```rust
pub fn stabilize_anchor(mut estimate: f64, measurements: &[f64]) -> f64 {
    for measured in measurements.iter().take(4) {
        let error = measured - estimate;
        if error.abs() < 2.0 { break; }
        estimate += error;
    }
    estimate
}
```

### Checkpoint 5

<a id="checkpoint-5"></a>

The checkpoint captures the operational contract:

1. Parse and sanitize before HTML reaches the document surface.
2. Preserve plain text and source code while enhancements are pending.
3. Resolve navigation through stable document-model identifiers.
4. Keep filesystem paths behind the backend trust boundary.
5. Verify the same behavior in a packaged build.

The expected result is measurable: **visible highlight latency** should remain within its
budget while the reader scrolls continuously through adjacent sections.

[^scenario-5]: Scenario 5 is generated deterministically from the approved Maakdown design and implementation plan.


## 6. Diagram Lifecycle: Evaluation Scenario 1

This scenario examines **Rendering complex Mermaid diagrams without blocking scroll or leaking stale SVG trees**. The governing choice is:
Load Mermaid on first demand, render near-viewport diagrams, and rerender visible diagrams on theme changes. The primary measurement is `diagram render latency`, owned by
Reader experience. This section intentionally mixes prose, structured data, links,
code, mathematics, and navigation targets so that one scroll pass exercises the
reader as a coherent technical document rather than as synthetic filler.

### Context and intended behavior

Maakdown should make the base text readable before enhancement work begins. A
reader opening this section should be able to scan the decision, inspect the
acceptance criteria, follow [the implementation checkpoint](#checkpoint-6),
and return from footnote 6 without the interface stealing focus.[^scenario-6]

> [!NOTE]
> Scenario 6 belongs to **P2** and uses `diagram render latency` as its
> principal signal. A slow enhancement must never make the unenhanced source unreadable.

> [!WARNING]
> A successful happy-path render is not enough. The same workflow must remain safe
> when Markdown contains raw HTML, malformed links, oversized assets, duplicate
> headings, or a filesystem event burst.

### Acceptance matrix

| Dimension | Expected behavior | Evidence | Owner |
|---|---|---|---|
| Correctness | Stable block ordering and deterministic anchors | fixture snapshot | Reader experience |
| Security | Sanitized HTML and constrained local resources | adversarial tests | Security |
| Performance | No sustained main-thread stall during scrolling | trace and timing sample | Performance |
| Accessibility | Keyboard-reachable links and meaningful document structure | semantic audit | Reader experience |
| Distribution | Same behavior in development and signed builds | release smoke test | Release engineering |

### Delivery checklist

- [x] Define the scenario and its observable outcome.
- [x] Identify the trusted boundary and failure behavior.
- [ ] Capture p50 and p95 values on macOS WebKit.
- [ ] Repeat the same fixture on Windows WebView2.
- [ ] Record Linux WebKitGTK as the likely performance floor.
- [ ] Link regressions to [[Maakdown Performance Notebook]].

### Quantitative model

For a document with (n) parsed blocks and a visible window containing (v)
blocks, the target steady-state cost is:

$$
T_{frame} = T_{layout}(v) + T_{enhance}(v) + \epsilon,
\qquad v \ll n
$$

The weighted readiness score for this scenario is:

$$
R = 0.35C + 0.25S + 0.20P + 0.10A + 0.10D
$$

where (C) is correctness, (S) security, (P) performance, (A)
accessibility, and (D) distribution confidence.

### sql implementation sample

```sql
SELECT platform,
       percentile_cont(0.50) WITHIN GROUP (ORDER BY first_paint_ms) AS p50,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY first_paint_ms) AS p95
FROM reader_benchmarks
WHERE fixture = 'maakdown-reader-evaluation'
GROUP BY platform
ORDER BY platform;
```

### Checkpoint 6

<a id="checkpoint-6"></a>

The checkpoint captures the operational contract:

1. Parse and sanitize before HTML reaches the document surface.
2. Preserve plain text and source code while enhancements are pending.
3. Resolve navigation through stable document-model identifiers.
4. Keep filesystem paths behind the backend trust boundary.
5. Verify the same behavior in a packaged build.

The expected result is measurable: **diagram render latency** should remain within its
budget while the reader scrolls continuously through adjacent sections.

[^scenario-6]: Scenario 6 is generated deterministically from the approved Maakdown design and implementation plan.


## 7. Large Document Virtualization: Evaluation Scenario 1

This scenario examines **Bounding memory while preserving dynamic-height layout and accurate navigation**. The governing choice is:
Virtualize block records, cache measurements, and stabilize anchor jumps with bounded correction passes. The primary measurement is `live DOM block count`, owned by
Performance. This section intentionally mixes prose, structured data, links,
code, mathematics, and navigation targets so that one scroll pass exercises the
reader as a coherent technical document rather than as synthetic filler.

### Context and intended behavior

Maakdown should make the base text readable before enhancement work begins. A
reader opening this section should be able to scan the decision, inspect the
acceptance criteria, follow [the implementation checkpoint](#checkpoint-7),
and return from footnote 7 without the interface stealing focus.[^scenario-7]

> [!NOTE]
> Scenario 7 belongs to **P2** and uses `live DOM block count` as its
> principal signal. A slow enhancement must never make the unenhanced source unreadable.

> [!WARNING]
> A successful happy-path render is not enough. The same workflow must remain safe
> when Markdown contains raw HTML, malformed links, oversized assets, duplicate
> headings, or a filesystem event burst.

### Acceptance matrix

| Dimension | Expected behavior | Evidence | Owner |
|---|---|---|---|
| Correctness | Stable block ordering and deterministic anchors | fixture snapshot | Performance |
| Security | Sanitized HTML and constrained local resources | adversarial tests | Security |
| Performance | No sustained main-thread stall during scrolling | trace and timing sample | Performance |
| Accessibility | Keyboard-reachable links and meaningful document structure | semantic audit | Reader experience |
| Distribution | Same behavior in development and signed builds | release smoke test | Release engineering |

### Delivery checklist

- [x] Define the scenario and its observable outcome.
- [x] Identify the trusted boundary and failure behavior.
- [ ] Capture p50 and p95 values on macOS WebKit.
- [ ] Repeat the same fixture on Windows WebView2.
- [ ] Record Linux WebKitGTK as the likely performance floor.
- [ ] Link regressions to [[Maakdown Performance Notebook]].

### Quantitative model

For a document with (n) parsed blocks and a visible window containing (v)
blocks, the target steady-state cost is:

$$
T_{frame} = T_{layout}(v) + T_{enhance}(v) + \epsilon,
\qquad v \ll n
$$

The weighted readiness score for this scenario is:

$$
R = 0.35C + 0.25S + 0.20P + 0.10A + 0.10D
$$

where (C) is correctness, (S) security, (P) performance, (A)
accessibility, and (D) distribution confidence.

### json implementation sample

```json
{
  "fixture": "maakdown-reader-evaluation",
  "targets": {
    "firstMeaningfulPaintMs": 350,
    "anchorTolerancePx": 8,
    "maxMountedBlocks": 180
  },
  "platforms": ["darwin-arm64", "windows-amd64", "linux-amd64"]
}
```

### Checkpoint 7

<a id="checkpoint-7"></a>

The checkpoint captures the operational contract:

1. Parse and sanitize before HTML reaches the document surface.
2. Preserve plain text and source code while enhancements are pending.
3. Resolve navigation through stable document-model identifiers.
4. Keep filesystem paths behind the backend trust boundary.
5. Verify the same behavior in a packaged build.

The expected result is measurable: **live DOM block count** should remain within its
budget while the reader scrolls continuously through adjacent sections.

[^scenario-7]: Scenario 7 is generated deterministically from the approved Maakdown design and implementation plan.


## 8. Signed Desktop Distribution: Evaluation Scenario 1

This scenario examines **Shipping trustworthy macOS and Windows artifacts without storing credentials in source control**. The governing choice is:
Keep manifests and entitlements in git while certificates and notarization credentials remain external secrets. The primary measurement is `release verification duration`, owned by
Release engineering. This section intentionally mixes prose, structured data, links,
code, mathematics, and navigation targets so that one scroll pass exercises the
reader as a coherent technical document rather than as synthetic filler.

### Context and intended behavior

Maakdown should make the base text readable before enhancement work begins. A
reader opening this section should be able to scan the decision, inspect the
acceptance criteria, follow [the implementation checkpoint](#checkpoint-8),
and return from footnote 8 without the interface stealing focus.[^scenario-8]

> [!NOTE]
> Scenario 8 belongs to **P3** and uses `release verification duration` as its
> principal signal. A slow enhancement must never make the unenhanced source unreadable.

> [!WARNING]
> A successful happy-path render is not enough. The same workflow must remain safe
> when Markdown contains raw HTML, malformed links, oversized assets, duplicate
> headings, or a filesystem event burst.

### Acceptance matrix

| Dimension | Expected behavior | Evidence | Owner |
|---|---|---|---|
| Correctness | Stable block ordering and deterministic anchors | fixture snapshot | Release engineering |
| Security | Sanitized HTML and constrained local resources | adversarial tests | Security |
| Performance | No sustained main-thread stall during scrolling | trace and timing sample | Performance |
| Accessibility | Keyboard-reachable links and meaningful document structure | semantic audit | Reader experience |
| Distribution | Same behavior in development and signed builds | release smoke test | Release engineering |

### Delivery checklist

- [x] Define the scenario and its observable outcome.
- [x] Identify the trusted boundary and failure behavior.
- [ ] Capture p50 and p95 values on macOS WebKit.
- [ ] Repeat the same fixture on Windows WebView2.
- [ ] Record Linux WebKitGTK as the likely performance floor.
- [ ] Link regressions to [[Maakdown Performance Notebook]].

### Quantitative model

For a document with (n) parsed blocks and a visible window containing (v)
blocks, the target steady-state cost is:

$$
T_{frame} = T_{layout}(v) + T_{enhance}(v) + \epsilon,
\qquad v \ll n
$$

The weighted readiness score for this scenario is:

$$
R = 0.35C + 0.25S + 0.20P + 0.10A + 0.10D
$$

where (C) is correctness, (S) security, (P) performance, (A)
accessibility, and (D) distribution confidence.

### yaml implementation sample

```yaml
release:
  channels: [nightly, beta, stable]
  signing:
    macos: keychain
    windows: external-secret
  artifacts:
    retain-symbols: true
    publish-checksums: true
```

### Checkpoint 8

<a id="checkpoint-8"></a>

The checkpoint captures the operational contract:

1. Parse and sanitize before HTML reaches the document surface.
2. Preserve plain text and source code while enhancements are pending.
3. Resolve navigation through stable document-model identifiers.
4. Keep filesystem paths behind the backend trust boundary.
5. Verify the same behavior in a packaged build.

The expected result is measurable: **release verification duration** should remain within its
budget while the reader scrolls continuously through adjacent sections.

[^scenario-8]: Scenario 8 is generated deterministically from the approved Maakdown design and implementation plan.

## Consolidated risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Main-thread parsing delays first paint | Medium | High | worker parsing and serialized blocks |
| Mermaid blocks stall scrolling | Medium | High | viewport scheduling and lazy module load |
| Relative image escapes trusted root | Low | Critical | canonicalization and symlink-aware root checks |
| Atomic save drops file watch | Medium | Medium | parent-directory watch and event coalescing |
| Anchor target is unmounted | High after P5 | Medium | model-owned navigation and stabilization |
| Signing credential leaks into git | Low | Critical | external secret storage and ignore rules |

## Final release gate

- [ ] All required Markdown constructs render safely.
- [ ] Code highlighting is lazy and theme-aware.
- [ ] Mermaid diagrams render or fail with a safe visible error.
- [ ] The large-document DOM remains bounded.
- [ ] Internal anchors and footnote backlinks survive virtualization.
- [ ] Local images resolve only under the trusted root.
- [ ] Reload preserves reader position.
- [ ] macOS artifacts are signed and notarized.
- [ ] Windows artifacts are Authenticode-signed and timestamped.
- [ ] Checksums and release notes are published without secrets.

The dossier ends where the product begins: with a reader opening a difficult,
realistic document and finding that the software stays quiet, quick, and
trustworthy around it.

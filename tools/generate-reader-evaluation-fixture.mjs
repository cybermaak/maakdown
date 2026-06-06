import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDir = resolve(repoRoot, 'fixtures');
const outputPath = resolve(fixtureDir, 'maakdown-reader-evaluation.md');

const chapters = [
  {
    title: 'Rendering Architecture',
    concern: 'Keeping parsing deterministic while expensive enhancements remain progressive',
    decision: 'Sanitize serialized block HTML in the parser worker, then enhance visible code and diagrams separately.',
    metric: 'open-to-readable-text',
    owner: 'Frontend platform'
  },
  {
    title: 'Navigation and Reader Position',
    concern: 'Making anchors reliable when large documents eventually use a bounded DOM',
    decision: 'Route TOC, footnotes, and internal links through one anchor-to-block navigation model.',
    metric: 'anchor landing error',
    owner: 'Reader experience'
  },
  {
    title: 'Trusted Local Assets',
    concern: 'Displaying relative images without turning the viewer into an arbitrary file server',
    decision: 'Resolve assets under a trusted root and expose opaque tokenized loopback URLs.',
    metric: 'blocked traversal attempts',
    owner: 'Backend platform'
  },
  {
    title: 'Filesystem Reloads',
    concern: 'Surviving editor safe-save behavior without duplicate reloads or lost reading position',
    decision: 'Watch the parent directory, debounce event bursts, and restore the nearest stable anchor.',
    metric: 'reload stabilization time',
    owner: 'Desktop integration'
  },
  {
    title: 'Progressive Code Highlighting',
    concern: 'Providing rich code without making the initial document paint wait for every grammar',
    decision: 'Use highlight.js for visible blocks first and retain raw readable code as the fallback.',
    metric: 'visible highlight latency',
    owner: 'Frontend platform'
  },
  {
    title: 'Diagram Lifecycle',
    concern: 'Rendering complex Mermaid diagrams without blocking scroll or leaking stale SVG trees',
    decision: 'Load Mermaid on first demand, render near-viewport diagrams, and rerender visible diagrams on theme changes.',
    metric: 'diagram render latency',
    owner: 'Reader experience'
  },
  {
    title: 'Large Document Virtualization',
    concern: 'Bounding memory while preserving dynamic-height layout and accurate navigation',
    decision: 'Virtualize block records, cache measurements, and stabilize anchor jumps with bounded correction passes.',
    metric: 'live DOM block count',
    owner: 'Performance'
  },
  {
    title: 'Signed Desktop Distribution',
    concern: 'Shipping trustworthy macOS and Windows artifacts without storing credentials in source control',
    decision: 'Keep manifests and entitlements in git while certificates and notarization credentials remain external secrets.',
    metric: 'release verification duration',
    owner: 'Release engineering'
  }
];

const languageSamples = [
  ['go', `func (s *Service) ResolveAsset(documentPath, rawPath string) (AssetRef, error) {
\troot, err := DetectTrustedRoot(documentPath, s.configuredRoot)
\tif err != nil {
\t\treturn AssetRef{}, err
\t}
\tresolved, err := ResolveAssetPath(documentPath, rawPath, root)
\tif err != nil {
\t\treturn AssetRef{}, err
\t}
\treturn s.register(resolved)
}`],
  ['typescript', `export async function openAndParse(path: string): Promise<DocumentModel> {
  const document = await openDocumentAt(path);
  const model = await parser.parse({
    source: document.contents,
    path: document.path
  });
  return buildDocumentModel(model);
}`],
  ['svelte', `<script lang="ts">
  import type { Heading } from '../core/model/types';
  let { headings, activeId }: { headings: Heading[]; activeId: string | null } = $props();
</script>

<nav aria-label="Document outline">
  {#each headings as heading}
    <button class:active={heading.id === activeId}>{heading.text}</button>
  {/each}
</nav>`],
  ['bash', `set -euo pipefail

npm --prefix frontend run test
npm --prefix frontend run check
npm --prefix frontend run build
go test ./...
"$(go env GOPATH)/bin/wails" build`],
  ['python', `def percentile(samples: list[float], quantile: float) -> float:
    ordered = sorted(samples)
    index = min(round((len(ordered) - 1) * quantile), len(ordered) - 1)
    return ordered[index]

print({"p50": percentile(latencies, 0.50), "p95": percentile(latencies, 0.95)})`],
  ['rust', `pub fn stabilize_anchor(mut estimate: f64, measurements: &[f64]) -> f64 {
    for measured in measurements.iter().take(4) {
        let error = measured - estimate;
        if error.abs() < 2.0 { break; }
        estimate += error;
    }
    estimate
}`],
  ['sql', `SELECT platform,
       percentile_cont(0.50) WITHIN GROUP (ORDER BY first_paint_ms) AS p50,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY first_paint_ms) AS p95
FROM reader_benchmarks
WHERE fixture = 'maakdown-reader-evaluation'
GROUP BY platform
ORDER BY platform;`],
  ['json', `{
  "fixture": "maakdown-reader-evaluation",
  "targets": {
    "firstMeaningfulPaintMs": 350,
    "anchorTolerancePx": 8,
    "maxMountedBlocks": 180
  },
  "platforms": ["darwin-arm64", "windows-amd64", "linux-amd64"]
}`],
  ['yaml', `release:
  channels: [nightly, beta, stable]
  signing:
    macos: keychain
    windows: external-secret
  artifacts:
    retain-symbols: true
    publish-checksums: true`],
  ['css', `.document-scroll {
  overflow: auto;
  scrollbar-gutter: stable;
}

.doc-block {
  max-width: 72ch;
  contain: layout style;
}

.toc button[aria-current="true"] {
  font-weight: 700;
}`]
];

function chapterSection(chapter, index, cycle) {
  const number = cycle * chapters.length + index + 1;
  const [language, code] = languageSamples[number % languageSamples.length];
  const phase = `P${Math.min(7, Math.floor(number / 4) + 1)}`;

  return `
## ${number}. ${chapter.title}: Evaluation Scenario ${cycle + 1}

This scenario examines **${chapter.concern}**. The governing choice is:
${chapter.decision} The primary measurement is \`${chapter.metric}\`, owned by
${chapter.owner}. This section intentionally mixes prose, structured data, links,
code, mathematics, and navigation targets so that one scroll pass exercises the
reader as a coherent technical document rather than as synthetic filler.

### Context and intended behavior

Maakdown should make the base text readable before enhancement work begins. A
reader opening this section should be able to scan the decision, inspect the
acceptance criteria, follow [the implementation checkpoint](#checkpoint-${number}),
and return from footnote ${number} without the interface stealing focus.[^scenario-${number}]

> [!NOTE]
> Scenario ${number} belongs to **${phase}** and uses \`${chapter.metric}\` as its
> principal signal. A slow enhancement must never make the unenhanced source unreadable.

> [!WARNING]
> A successful happy-path render is not enough. The same workflow must remain safe
> when Markdown contains raw HTML, malformed links, oversized assets, duplicate
> headings, or a filesystem event burst.

### Acceptance matrix

| Dimension | Expected behavior | Evidence | Owner |
|---|---|---|---|
| Correctness | Stable block ordering and deterministic anchors | fixture snapshot | ${chapter.owner} |
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

For a document with \(n\) parsed blocks and a visible window containing \(v\)
blocks, the target steady-state cost is:

$$
T_{frame} = T_{layout}(v) + T_{enhance}(v) + \\epsilon,
\\qquad v \\ll n
$$

The weighted readiness score for this scenario is:

$$
R = 0.35C + 0.25S + 0.20P + 0.10A + 0.10D
$$

where \(C\) is correctness, \(S\) security, \(P\) performance, \(A\)
accessibility, and \(D\) distribution confidence.

### ${language} implementation sample

\`\`\`${language}
${code}
\`\`\`

### Checkpoint ${number}

<a id="checkpoint-${number}"></a>

The checkpoint captures the operational contract:

1. Parse and sanitize before HTML reaches the document surface.
2. Preserve plain text and source code while enhancements are pending.
3. Resolve navigation through stable document-model identifiers.
4. Keep filesystem paths behind the backend trust boundary.
5. Verify the same behavior in a packaged build.

The expected result is measurable: **${chapter.metric}** should remain within its
budget while the reader scrolls continuously through adjacent sections.

[^scenario-${number}]: Scenario ${number} is generated deterministically from the approved Maakdown design and implementation plan.
`;
}

const header = `---
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

\`\`\`mermaid
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
\`\`\`

### Open and reload sequence

\`\`\`mermaid
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
\`\`\`

### Document lifecycle

\`\`\`mermaid
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
\`\`\`

## Performance budgets

| Fixture | macOS target | Windows target | Linux target |
|---|---:|---:|---:|
| Small README first meaningful paint | 200 ms | 150 ms | 250 ms |
| Medium technical document | 350 ms | 250 ms | 450 ms |
| This evaluation dossier | responsive scroll | responsive scroll | responsive scroll |
| Anchor correction | <= 8 px | <= 8 px | <= 8 px |

The frame budget at 60 Hz is approximately:

$$
\\Delta t = \\frac{1000\\text{ ms}}{60} \\approx 16.67\\text{ ms}
$$

`;

const diagrams = `
## Cross-service dependency model

\`\`\`mermaid
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

\`\`\`

## Release timeline

\`\`\`mermaid
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
\`\`\`

## Security data model

\`\`\`mermaid
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
\`\`\`
`;

const footer = `
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
`;

const body = Array.from({ length: 10 }, (_, cycle) =>
  chapters.map((chapter, index) => chapterSection(chapter, index, cycle)).join('\n')
).join('\n');

await mkdir(fixtureDir, { recursive: true });
await writeFile(outputPath, `${header}${diagrams}${body}${footer}`, 'utf8');

console.log(outputPath);

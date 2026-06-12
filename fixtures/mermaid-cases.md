---
title: Mermaid rendering cases
summary: Minimal set of every Mermaid diagram type from the reader evaluation dossier, for isolating WebView2 rendering issues.
---

# Mermaid rendering cases

Minimal reproduction document: one of each Mermaid diagram type used in the
reader evaluation dossier. Use this to iterate on Windows/WebView2 rendering
(label clipping, diagram sizing, edge-label overflow) without scrolling through
the full document.

## 1. Flowchart (flowchart LR)

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

## 2. Sequence diagram (sequenceDiagram)

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

## 3. State diagram (stateDiagram-v2)

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

## 4. Class diagram (classDiagram)

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

## 5. Gantt chart (gantt)

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

## 6. Entity-relationship diagram (erDiagram)

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

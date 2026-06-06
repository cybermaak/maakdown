// Sample vault for the Maakdown redesign prototype.
// Documents are block arrays rendered by reader.jsx (no real Markdown pipeline).
// Block types: h1/h2/h3, p (spans), callout, code, quote, mermaid, table,
// tasklist, hr, footnote.
window.MAAKDOWN_VAULT = {
  "Architecture Overview": {
    path: "~/vault/engineering/Architecture Overview.md",
    frontmatter: {
      title: "Architecture Overview",
      tags: ["spec", "architecture", "desktop"],
      status: "published",
      updated: "2026-06-04",
      owners: "Frontend Platform",
    },
    blocks: [
      { type: "h1", id: "architecture-overview", text: "Architecture Overview" },
      {
        type: "p",
        spans: [
          { t: "Maakdown opens a folder of Markdown notes — a " },
          { t: "vault", em: true },
          { t: " — and renders it as a calm reading surface. The frontend owns parsing; the Go backend owns file I/O, watching, and the bounded asset server. See the " },
          { link: "Security Model" },
          { t: " for the trust boundary." },
        ],
      },
      { type: "callout", calloutType: "tip", title: "Keyboard", text: "Press ⌘K for the command palette, ⌘F to find in the document, ⌘O to open a file." },
      { type: "h2", id: "rendering-pipeline", text: "Rendering pipeline" },
      {
        type: "p",
        spans: [
          { t: "Parsing runs in a worker on the " },
          { code: "unified" },
          { t: " stack. Sanitization happens inside the worker before any HTML crosses to the main thread — the reader never appends unsanitized markup during enhancement." },
        ],
      },
      {
        type: "mermaid",
        id: "pipeline-diagram",
        title: "Parse + enhance flow",
        nodes: [
          { id: "src", label: "Markdown source", col: 0, row: 0 },
          { id: "worker", label: "Parser worker", col: 1, row: 0 },
          { id: "model", label: "DocumentModel", col: 2, row: 0 },
          { id: "virt", label: "Virtualizer", col: 2, row: 1 },
          { id: "enh", label: "Enhance (code · math · mermaid)", col: 3, row: 1 },
        ],
        edges: [["src", "worker"], ["worker", "model"], ["model", "virt"], ["virt", "enh"]],
      },
      { type: "h2", id: "block-model", text: "Block model" },
      {
        type: "p",
        spans: [{ t: "The parser returns ordered block records with stable ids and per-block enhancement flags. Only mounted blocks run enhancement work." }],
      },
      {
        type: "table",
        head: ["Flag", "Engine", "Scheduling"],
        rows: [
          ["none", "—", "rendered with text"],
          ["code", "highlight.js", "idle callback, visible only"],
          ["mermaid", "mermaid", "lazy, on viewport entry"],
        ],
      },
      { type: "h3", id: "enhancement-budget", text: "Enhancement budget" },
      {
        type: "tasklist",
        items: [
          { done: true, text: "First meaningful paint before enhancement" },
          { done: true, text: "Highlight visible code on idle" },
          { done: false, text: "Pre-warm the next viewport of diagrams" },
        ],
      },
      { type: "code", language: "ts", code: "export interface BlockRecord {\n  id: string;\n  html: string;        // sanitized in-worker\n  enhance: 'none' | 'code' | 'mermaid';\n  sourceLine?: number;\n}" },
      { type: "callout", calloutType: "warning", title: "Trusted root", text: "Images referenced outside the vault's trusted root are blocked and render a placeholder. SVGs are served as sanitized bytes, never executable HTML." },
      { type: "quote", text: "Reading is the product. The chrome should disappear." },
      { type: "h2", id: "open-questions", text: "Open questions" },
      {
        type: "p",
        spans: [
          { t: "Transclusion (" },
          { code: "![[Note]]" },
          { t: ") stays out of v1. Vault-wide search is deferred to the notes index — tracked in " },
          { link: "Roadmap", unresolved: true },
          { t: "." },
        ],
      },
      { type: "footnote", id: "fn-1", text: "Linux WebKitGTK is treated as the performance floor for all targets." },
    ],
  },

  "Security Model": {
    path: "~/vault/engineering/Security Model.md",
    frontmatter: {
      title: "Security Model",
      tags: ["spec", "security"],
      status: "published",
      updated: "2026-06-02",
      owners: "Desktop Integration",
    },
    blocks: [
      { type: "h1", id: "security-model", text: "Security Model" },
      { type: "p", spans: [{ t: "Every rendered surface is constrained: HTML is sanitized, links are scheme-allowlisted, and local assets stream only through tokenized loopback URLs." }] },
      { type: "h2", id: "trusted-root", text: "Trusted root" },
      {
        type: "p",
        spans: [
          { t: "Resolution precedence: configured vault, then Git worktree root, then the file's parent directory. Linked from " },
          { link: "Architecture Overview" },
          { t: "." },
        ],
      },
      { type: "callout", calloutType: "important", title: "Token rotation", text: "Each process gets an unguessable token; ids are invalidated on close, vault switch, or shutdown." },
      { type: "code", language: "go", code: "// loopback asset URL\nhttp://127.0.0.1:<port>/assets/<token>/<assetId>" },
      { type: "h2", id: "link-policy", text: "Link policy" },
      { type: "p", spans: [{ t: "External links open in the system browser after scheme allowlisting. The WebView itself never navigates away from the app shell." }] },
    ],
  },

  "Release Timeline": {
    path: "~/vault/planning/Release Timeline.md",
    frontmatter: {
      title: "Release Timeline",
      tags: ["planning"],
      status: "draft",
      updated: "2026-06-05",
      owners: "Release Engineering",
    },
    blocks: [
      { type: "h1", id: "release-timeline", text: "Release Timeline" },
      { type: "p", spans: [{ t: "v1 delivery path across foundations, rich rendering, and release hardening." }] },
      { type: "h2", id: "phases", text: "Phases" },
      {
        type: "tasklist",
        items: [
          { done: true, text: "P1–P6 feature work complete" },
          { done: false, text: "P7 cross-platform signing verification" },
          { done: false, text: "P8 desktop workspace (tabs, sessions)" },
        ],
      },
    ],
  },
};

// Recent files for the empty state (some intentionally "missing" to show error tabs).
window.MAAKDOWN_RECENTS = [
  { name: "Architecture Overview", path: "~/vault/engineering/Architecture Overview.md", when: "2 min ago" },
  { name: "Security Model", path: "~/vault/engineering/Security Model.md", when: "1 hr ago" },
  { name: "Release Timeline", path: "~/vault/planning/Release Timeline.md", when: "yesterday" },
  { name: "Onboarding", path: "~/vault/Onboarding.md", when: "3 days ago", missing: true },
];

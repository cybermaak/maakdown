# Launch post — draft

Per the discoverability playbook: one honest, problem-first post per community.
Candidate venues (pick per fit, don't cross-post-spam): r/Markdown, r/ObsidianMD
(wikilink users), r/golang or the Wails Discord (build story angle), Hacker News
only with the build-story framing.

Post AFTER the first tagged release exists, so the download link works.

---

## Title options

- I kept reading rendered Markdown in my code editor, so I built a dedicated desktop reader
- Maakdown — a free, local-first desktop Markdown reader (macOS/Windows/Linux, open source)
- Show HN: Maakdown – a Wails desktop Markdown reader that stays fast on 10k-line files

## Body (general-community version)

I read a lot of Markdown — technical docs, runbooks, personal notes — and I was
always viewing it in one of two bad places: a code editor's preview pane, or a
heavyweight notes app that wants to own my files.

So I built **Maakdown**: a desktop app that does one thing — read Markdown
beautifully.

- Warm, book-like light/dark themes and real typography controls
- Code highlighting, KaTeX math, Mermaid diagrams, GFM tables/callouts/footnotes
- Wikilinks between notes, tabs, full-document search, a command palette
- Stays fast on 10,000-line files (virtualized rendering — text appears
  instantly, the rich stuff fills in as you read)
- Local-first: no account, no telemetry, works offline. It's a reader, not a
  platform.

Free and MIT-licensed. macOS build is signed and notarized; Windows and Linux
builds are on the releases page.

Homepage: https://cybermaak.github.io/maakdown/
GitHub: https://github.com/cybermaak/maakdown

I'd genuinely love feedback — especially on what's missing for your reading
workflow. (Embed the demo GIF/screenshot here.)

## Build-story angle (HN / dev communities)

Lead with the interesting engineering instead of the product:
how a Go (Wails v2) + Svelte 5 app keeps a 10k-line Markdown document smooth —
a dynamic-height block virtualizer, a worker-based unified/remark parser,
progressive enhancement for highlighting/KaTeX/Mermaid, and a tokenized loopback
asset server instead of file:// image access. Link the repo; let the product
sell itself from the README.

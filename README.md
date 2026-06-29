<div align="center">

<img src="docs/design-system/maakdown.icon/Assets/maakdown_light.png" alt="Maakdown Icon" width="128" />

# Maakdown

**A beautiful, distraction-free desktop app for reading your Markdown.**

[![Build Status](https://img.shields.io/github/actions/workflow/status/cybermaak/maakdown/ci.yml?branch=main&style=flat-square)](https://github.com/cybermaak/maakdown/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Platforms](https://img.shields.io/badge/Platforms-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=flat-square)](#download)

Maakdown is a fast, local-first Markdown viewer designed for technical documents, personal notes, and knowledge bases. Open any Markdown file and see it the way you meant it — clean typography, rich code formatting, math, and diagrams, all in a calm workspace.

<br />

<img src="docs/assets/maakdown_demo.webp" alt="Animated demo: reading a technical document, jumping via the outline minimap, running focus mode from the command palette, and switching to the dark theme with a rendered Mermaid diagram" width="900" />

</div>

---

## 🌟 Why Maakdown?

We built Maakdown because reading Markdown shouldn't feel like staring at a raw code editor, nor should it require a heavyweight, slow electron app. 

- **A Genuinely Nice Reading Experience**: Warm, book-like themes, careful typography, and a focus mode that clears everything but the words. Tune the font, size, line height, and width to taste.
- **Lightning Fast on Massive Files**: Open a 10,000-line document and it still scrolls smoothly and stays light on memory. Text appears instantly, and richer details fill in as you read.
- **Built for Technical Minds**: Syntax-highlighted code, KaTeX math, Mermaid diagrams, tables, task lists, callouts, footnotes, and local images all just work.
- **Local-First & Private**: Your files never leave your machine. Work offline across many notes using tabs, recent files, and a session that restores itself perfectly the next time you open the app.
- **Keyboard & Navigation Ready**: Search the current document, navigate with a command palette, jump between notes via wikilinks, and print or export to PDF whenever you need a copy.

---

## ✨ Features at a Glance

| Feature | Details |
|---|---|
| **Standard Markdown** | Full support for CommonMark + GFM tables, task lists, strikethrough, autolinks, and footnotes. |
| **Code & Syntax** | Fenced-code highlighting via highlight.js (default), with optional Shiki integration. |
| **Math & Diagrams** | Inline and block math rendered with KaTeX. Mermaid diagrams lazy-load on viewport entry. |
| **Metadata & Callouts** | YAML frontmatter surfaces as a clean document masthead. Full support for GitHub/Obsidian-style callouts. |
| **Seamless Navigation** | Hover-revealed outline with scroll-spy, internal `#anchors`, and per-tab history. |
| **Wikilinks** | Native `[[Note Name]]` support resolved through a blazing-fast Go-built vault index. |
| **Workspace & Output** | Tabbed documents, drag-and-drop, native print, and system print-to-PDF support. |
| **Custom Appearance** | Light/dark themes, focus mode, and highly configurable typography settings. |

---

## 📸 Screenshots

<table>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/reading-dark.png" alt="Dark theme showing rendered Mermaid diagrams" />
      <p align="center"><em>Dark theme with rendered Mermaid diagrams</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/code-and-math.png" alt="Syntax-highlighted code and KaTeX math" />
      <p align="center"><em>Syntax-highlighted code and KaTeX math</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/command-palette.png" alt="Command palette open over a document" />
      <p align="center"><em>Command palette for fast keyboard navigation</em></p>
    </td>
    <td width="50%" valign="top">
      <p><em>Note: Every screenshot above is generated from the real app rendering sample documents. You can regenerate them at any time in development.</em></p>
    </td>
  </tr>
</table>

---

## 🚀 Download & Installation

Grab the latest build for your OS from the [GitHub Releases](https://github.com/cybermaak/maakdown/releases) page — or visit the [project homepage](https://cybermaak.github.io/maakdown/):

| Platform | Artifact | Notes |
|---|---|---|
| **macOS** (Apple silicon) | `.dmg` or `.zip` | **Signed & notarized** — opens without Gatekeeper warnings |
| **Windows** (x64) | `.zip` | Native Windows build with Markdown file association. Unsigned (SmartScreen may warn) |
| **Linux** (x64) | `.tar.gz` | Requires WebKit2GTK (preinstalled on most desktop distros) |

Extract (or drag the dmg's app to Applications) and launch.

---

## 🛠️ For Developers & Contributors

Maakdown is an open-source project built with performance and simplicity in mind. We use a **Go backend** via [Wails v2](https://wails.io/) paired with a **Svelte 5 + TypeScript** frontend.

### Architecture Highlights
- **Go Backend**: Handles file operations, safe-save watcher debounce, tokenized loopback asset server, and blazing-fast wikilink indexing.
- **Svelte 5 Frontend**: A framework-agnostic core running a unified/remark/rehype pipeline, with a fully virtualized reader UI.

### Getting Started

Prerequisites: **Go 1.22+**, **Node.js 20.19+**, and the **Wails CLI v2.12.x**.

```bash
# Clone the repository
git clone https://github.com/cybermaak/maakdown.git
cd maakdown

# Install frontend dependencies
cd frontend && npm install && cd ..

# Start the dev server (hot-reloads frontend in a native WebView)
wails dev
```

For comprehensive documentation on the codebase, project rules, and contributing guidelines, please refer to:
- [`docs/markdown-viewer-design-spec.md`](docs/markdown-viewer-design-spec.md) — Product & Technical Spec
- [`AGENTS.md`](AGENTS.md) — Repo Operating Rules
- [`DEV_CONTEXT.md`](DEV_CONTEXT.md) — Current Project State & Completed Tasks

---

## 📜 License

Maakdown is open-source software licensed under the [MIT License](LICENSE).

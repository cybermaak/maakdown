# Performance Baseline

**Date:** 2026-06-05
**Platform:** macOS arm64, Playwright Chromium
**Command:** `cd frontend && npm run benchmark`

The benchmark runs the named fixture corpus through the same Svelte parser,
virtualizer, navigation, KaTeX, highlight.js, Shiki JavaScript-regex, and
Mermaid paths used by the application.

| Fixture | Open to text | Mounted blocks | Anchor error | Enhancements |
|---|---:|---:|---:|---|
| `small-readme.md` | 641 ms | 26 | n/a | highlight.js, Shiki, Mermaid, KaTeX |
| `medium-technical-doc.md` | 226 ms | 38 | n/a | highlight.js, Shiki, Mermaid, KaTeX |
| `large-10k-lines.md` | 1,318 ms | 38 | 0.19 px | highlight.js, Shiki, Mermaid, KaTeX |

Scroll-position assignment stayed below the timer's meaningful resolution in
the recorded run. The large fixture contains 10,726 lines and 61,672 words.

These values are development-machine baselines, not release guarantees. Native
macOS WebKit, Windows WebView2, and Linux WebKitGTK runs remain required before a
signed release. The committed GitHub Actions workflow records the Chromium/Linux
baseline on every main-branch and pull-request run.

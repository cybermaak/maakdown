# Maakdown Design System Reference

This directory preserves the reviewed design-system and UX mock artifacts that
define the visual direction for P8-P11.

## Authority

Use the sources in this order:

1. `docs/markdown-viewer-design-spec.md` for product behavior and constraints.
2. This document for production design-system adoption rules.
3. `reference/design-guide.md` and `reference/tokens/` for visual values.
4. `reference/mock/` and `reference/screenshots/` for composition and interaction
   intent.

The mock is a React prototype. Its state shape, inline styles, SVG diagram
placeholder, and CDN dependencies are not production architecture. Production
work must recreate the behavior in Svelte and continue using the existing
Markdown, Mermaid, virtualization, security, and Wails service boundaries.

## Accepted Direction

- Native-editorial desktop reader with warm paper and ink surfaces.
- Flat fills and hairline borders; shadows only for floating UI.
- Inter for UI and default reading text; JetBrains Mono for code.
- Light, dark, and system themes driven by semantic CSS custom properties.
- Lucide icons through a pinned local Svelte dependency, never a runtime CDN.
- Two-row top chrome: compact toolbar followed by the document tab strip.
- Branded outline rail, centered document surface, and metadata inspector.
- Status badges and tags in metadata; visible per-document watch state.
- Unified command palette across commands, tabs, recents, and headings.
- Purposeful empty state with drop target, open command, recents, and missing
  file treatment.
- Minimal 120-180 ms motion with reduced-motion overrides.

## Production Token Rules

- Preserve a raw palette layer and semantic alias layer.
- Components consume semantic tokens such as `--surface-bg`, `--text`,
  `--border`, `--active`, and `--link`; they do not consume raw color values.
- Component dimensions, radius, spacing, typography, and elevation use tokens.
- Reader appearance settings override reader-specific semantic properties
  without changing application chrome.
- Theme changes update semantic aliases and must not reparse documents.
- Hard-coded colors are limited to syntax themes or documented exceptional
  states that cannot use the shared palette.

## Initial Production Primitives

- `Button`
- `IconButton`
- `SegmentedControl`
- `Badge`
- `Tag`
- `TocItem`
- `Callout`
- `CodeBlockChrome`
- `Wikilink`
- `Dialog`
- `Popover`
- `Toolbar`
- `Tab`
- `StatusIndicator`

Every interactive primitive requires keyboard behavior, a visible focus state,
an accessible name, disabled handling, and light/dark coverage.

## Handoff Caveats

- The supplied React components are reference-only.
- The prototype uses CDN React, Babel, Lucide, and a generated global bundle;
  none of these runtime loading patterns may enter the product.
- The prototype diagram is a custom SVG placeholder. Production continues to
  use Mermaid.
- The supplied Inter files for weights 400, 500, 600, and 700 have identical
  SHA-256 hashes. The supplied JetBrains Mono 400 and 500 files are also
  identical. P8 must verify licenses and replace these with genuine,
  weight-specific self-hosted assets before production use.
- The square `M` mark is accepted as a provisional application mark, not a
  finalized logo. Keep it easy to replace.
- The two exported `01-diagram.png` and `02-diagram.png` images were identical;
  only one is retained here.

## Reference Contents

- `reference/design-guide.md`: full exported design-system guide.
- `reference/manifest.json`: generated token/component inventory.
- `reference/tokens/`: exported color, font, spacing, and typography tokens.
- `reference/components/`: component behavior prompts.
- `reference/mock/`: exported interactive mock source.
- `reference/screenshots/reader-dark.png`: reviewed dark reader shell.
- `reference/screenshots/palette-light.png`: reviewed light command palette.
- `reference/screenshots/palette-dark.png`: reviewed dark command palette.
- `mock-review.md`: incorporated decisions, adaptation rules, and open risks.

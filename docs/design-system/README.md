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
5. `reviews/Maakdown-Design-Product-Review.pdf` for the accepted supplemental
   product/UX critique incorporated into specification v0.6.

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
- `Toggle`
- `Checkbox`
- `Chip`
- `Field`
- `SettingRow`
- `Stepper`
- `CommandSurface`
- `CommandItem`
- `Menu`

Every interactive primitive requires keyboard behavior, a visible focus state,
an accessible name, disabled handling, and light/dark coverage.

## 2026-07 Selective Consolidation

The downloaded reference at `/Users/maak/Downloads/Maakdown Design System` was
scanned during the design-system consolidation pass. Its exported color,
spacing, and typography tokens matched the preserved repo reference tokens, so
production tokens were not rewritten globally.

The pass selectively adopted missing/refined controls from the reference into
native Svelte primitives: toggle switches, checklist checkboxes, active chips,
labelled fields, settings rows, a small stepper, command-palette item rows, and
menu rows. `Popover` now supports titles, header/footer slots, sizing, and
section grouping, while `Dialog` supports large canvas-oriented dialogs and
custom header actions. These are production Svelte components and must not copy
the reference React bundle, CDN dependency loading, or generated global bundle
patterns.

Feature code should compose these primitives first. If a reusable control is
missing, add it under `frontend/src/design-system/`, export it from
`index.ts`, show it in `DesignSystemGallery.svelte`, and document the behavior
here before using it in feature code.

## Handoff Caveats

- The supplied React components are reference-only.
- The prototype uses CDN React, Babel, Lucide, and a generated global bundle;
  none of these runtime loading patterns may enter the product.
- The prototype diagram is a custom SVG placeholder. Production continues to
  use Mermaid.
- The supplied Inter files for weights 400, 500, 600, and 700 have identical
  SHA-256 hashes. The supplied JetBrains Mono 400 and 500 files are also
  identical. They remain reference-only; production uses genuine,
  weight-specific assets from pinned local Fontsource packages.
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
- `reader-token-contract.md`: production token contract for rendered Markdown,
  line gutters, minimap marks, print styling, and high-contrast preset behavior.
- `reviews/Maakdown-Design-Product-Review.pdf`: supplemental product and UX
  review covering chrome, formatting, search, print, accessibility, and sequencing.

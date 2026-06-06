# Maakdown Design System

A design system for **Maakdown** — a calm, local-first desktop Markdown reader.
Maakdown opens a folder of `.md` notes (a "vault") and renders them as a clean,
fast reading surface: a table-of-contents sidebar on the left, the document in
the middle, and a frontmatter metadata panel on the right. It understands
Obsidian-flavoured Markdown — `[[wikilinks]]`, typed `> [!note]` callouts, YAML
frontmatter — plus math (KaTeX), Mermaid diagrams, and syntax-highlighted code.

Maakdown is a **reading tool, not an editor**. Everything in the visual language
serves legibility and calm: warm paper, ink-on-paper contrast, hairline borders
instead of shadows, and a single restrained accent (ink-blue) for links.

---

## Sources

This system was reverse-engineered from the product's frontend codebase:

- **Codebase:** the attached `src/` SvelteKit/Vite frontend (read-only mount).
  Key files:
  - `src/styles/global.css` — the canonical color, layout, and component values
    (the source of truth for every token here).
  - `src/App.svelte` — the three-pane shell (sidebar · reader · metadata).
  - `src/components/{DocumentView,BlockView,TocSidebar,MetadataPanel}.svelte`
  - `src/core/pipeline/parseDocument.ts` — wikilinks, callouts, frontmatter,
    KaTeX, Mermaid, sanitization.
  - `src/core/theme/theme.ts` — `system | light | dark` theme switching via
    `:root[data-theme]`.

No Figma file, brand book, or slide template was provided. The wordmark,
iconography, and component states below are extrapolated faithfully from the
codebase's existing visual decisions — see **Caveats** for substitutions.

---

## Content fundamentals

Maakdown's own UI copy is **terse, literal, and lowercase-leaning** — it labels
state rather than narrating it.

- **Voice:** plain and mechanical. Buttons are verbs or state read-outs:
  `Open`, `Theme: system`, `Metadata: panel`, `highlightjs`. No marketing tone,
  no exclamation, no personality.
- **Person:** neutral/imperative. The product addresses the reader through
  actions ("Open a Markdown file to start reading."), not "we" or "you".
- **Casing:** Sentence case for prose; bare lowercase for engine/state values
  (`shiki-js-regex`). Metadata panel labels are **UPPERCASE** with letter-spacing
  (`METADATA`). Tags are lowercase with a leading `#`.
- **Empty/again states:** short and factual — "No document open", "No headings",
  "No frontmatter", "Blocked local image".
- **Errors:** direct and blameless — "Could not open document", then the reason.
- **Emoji:** none. The product uses no emoji anywhere.
- **Vibe:** a quiet desk lamp. Documentation-grade. Gets out of the way.

When writing for Maakdown: prefer the shortest true label, keep state strings
lowercase, reserve uppercase for metadata labels, and never editorialize.

---

## Visual foundations

**Overall feel.** Warm paper and ink. A light, off-white reading surface in the
default theme; a sage-tinted charcoal in dark. Flat fills separated by hairline
borders — the chrome has almost no shadow. Nothing glossy, no gradients.

- **Color.** Neutrals are *warm* (paper `#f7f7f4`→`#ffffff`, ink `#232320`),
  never pure grey. Exactly one functional accent: ink-blue links
  (`#075cc7` light / `#75b4ff` dark). A small set of callout accent hues
  (note/tip/important/warning/caution) appears only inside callouts. Errors are
  a muted oxblood red. See `tokens/colors.css`.
- **Type.** Inter for everything UI and reading; JetBrains Mono for code.
  Reading body is 15px at **1.65 line-height**, capped to an **860px measure**.
  The scale is modest and functional (12–30px); large display sizes are rare.
  Metadata labels are 11px uppercase with `0.06em` tracking.
- **Spacing.** An 18px panel-padding rhythm, 8px control gaps, 36/48px document
  padding. Layout rails are fixed: **280px** sidebar, fluid reader, **260px**
  metadata.
- **Backgrounds.** Solid flat fills only. No imagery, no patterns, no gradients,
  no texture. Surfaces are distinguished by ~2–4% warm-value steps
  (app → panel → surface → metadata).
- **Borders & rules.** 1px hairline (`--border`) is the primary separator.
  Callouts and blockquotes use a **4px left accent rule** over a tinted inset
  fill. Corner radius is small and consistent: **6px** is the workhorse
  (buttons, TOC rows, code blocks), 4px for chips, 10px for cards/dialogs.
- **Elevation.** Borders first; shadows are reserved for things that truly float
  (dialogs, popovers, command menu → `--shadow-pop`). Cards in-app are
  border-defined and flat.
- **Cards.** Flat surface fill + 1px border + 6–10px radius. No drop shadow at
  rest; an optional faint `--shadow-sm` on hover at most.
- **Animation.** Minimal and quick. ~120–180ms transitions on
  `cubic-bezier(0.2,0,0,1)` for background/border changes (hover, active).
  No bounces, no parallax, no decorative motion. Respect reduced-motion.
- **Hover states.** Quiet fills, not color shifts: ghost controls and TOC rows
  fill to `--active`; bordered controls lift from surface to `--panel-bg`.
  Links thicken their dotted underline rather than changing color.
- **Press states.** A 0.5px downward nudge plus the `--active` fill. No scaling.
- **Transparency & blur.** Used sparingly — `color-mix` tints for callout fills
  and badge backgrounds. No frosted-glass blur in the core chrome.
- **Imagery mood.** N/A by default (a text reader). User images render at the
  document's natural warmth; the app adds no filter or grain.
- **Focus.** A soft ink-blue ring (`--ring`) — keyboard-first product.

---

## Iconography

The shipping product uses **no icon set at all** — its toolbar controls are
plain **text-label buttons** (`Open`, `Theme: system`, `Metadata: panel`). The
only "icons" in rendered documents are the typed callout markers.

For this design system (and the UI-kit chrome), we adopt **[Lucide](https://lucide.dev)**
— thin, 2px-stroke line icons whose quiet geometry matches Maakdown's calm. This
is an **addition/substitution**, not something pulled from the codebase (see
Caveats). Load it from CDN and call `lucide.createIcons()` after render:

```html
<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
```

Conventions: 16px icons inline with controls, ~18–22px standalone; stroke
matches text color, `currentColor`. Common glyphs: `file-text`, `folder`,
`hash`, `link`, `search`, `sun`/`moon`, `panel-right`, `list`, `settings`,
plus the callout markers `info`, `lightbulb`, `triangle-alert`, `octagon-alert`.
No emoji, ever. Unicode is used only incidentally (the `#` on tags, `×` on
removable chips, `⌘` in shortcuts).

---

## Using this system

- **Global CSS:** link `styles.css` (it `@import`s `tokens/fonts.css`,
  `colors.css`, `typography.css`, `spacing.css`). Self-hosted Inter + JetBrains
  Mono woff2 live in `assets/fonts/`.
- **Theme:** default `:root` is light; set `document.documentElement.dataset.theme
  = "dark"` for the dark theme. Tokens are aliased so components follow
  automatically.
- **Components:** load the generated bundle and read from the namespace —
  `const { Button } = window.MaakdownDesignSystem_bbc01a` (run
  `check_design_system` to confirm the namespace if it changes).

---

## Index / manifest

**Root**
- `styles.css` — global entry point (`@import`s only)
- `readme.md` — this guide
- `SKILL.md` — Agent-Skill front-matter for downloadable use

**`tokens/`** — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`

**`assets/fonts/`** — Inter 400/500/600/700, JetBrains Mono 400/500 (woff2)

**`guidelines/`** — foundation specimen cards (Design System tab)
- Colors: `colors-paper`, `colors-ink`, `colors-functional`, `colors-callouts`,
  `colors-dark`
- Type: `type-scale`, `type-body`, `type-mono`, `type-weights`
- Spacing: `spacing-scale`, `radius`, `borders`, `elevation`, `layout-rails`
- Brand: `brand-wordmark`, `iconography`

**`components/`** — reusable React primitives (each with `.jsx` + `.d.ts` +
`.prompt.md`, one card per directory)
- `controls/` — `Button`, `IconButton`, `Tag`, `Badge`
- `reader/` — `Callout`, `Wikilink`, `TocItem`, `CodeBlock`

**`ui_kits/`**
- `reader/` — the full Maakdown three-pane reader (interactive recreation)

---

## Caveats

- **Fonts:** Inter is the product's real UI face. **JetBrains Mono is a chosen
  default** for code — the codebase specifies no mono family. Swap if you have a
  preferred one.
- **Iconography:** Lucide is an **addition** — the product ships text-label
  controls and no icon set. Flagged for review.
- **Wordmark:** Maakdown ships a plain bold-text wordmark in the sidebar; the
  small "M" mark in `brand-wordmark` is a light extrapolation, not an official
  logo.
- **Component states** (hover/press/focus, primary/danger buttons, badges):
  extrapolated from the codebase's hover/active conventions, since the product's
  own buttons are nearly unstyled.

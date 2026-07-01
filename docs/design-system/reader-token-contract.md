# Reader Token Contract

Maakdown reader UI consumes semantic reader tokens. Future reader themes should
change these aliases rather than component CSS.

## Theme Surface

Reader mode is represented on `html`:

- `data-reader-theme="editorial"`: default editorial reader.
- `data-reader-theme="high-contrast"`: higher contrast preset for long reading
  and accessibility checks.
- `data-reader-mode="light"` or `data-reader-mode="dark"`: resolved OS/app
  mode used by Mermaid and syntax colors.

## Required Reader Tokens

| Token | Purpose |
|---|---|
| `--reader-bg` | document surface background |
| `--reader-ink` | primary rendered Markdown text |
| `--reader-muted` | secondary rendered Markdown text |
| `--reader-heading` | rendered Markdown headings and viewport indicator |
| `--reader-link` | body links and wikilink affordances |
| `--reader-rule` | tables, block borders, and subtle separators |
| `--reader-inline-code-bg` | inline code background |
| `--reader-code-bg` | fenced code, Mermaid, and code toolbar background |
| `--reader-code-text` | fenced code foreground |
| `--reader-quote` | blockquote foreground |
| `--reader-selection` | selection and table hover wash |
| `--reader-gutter` | document and code line-number text |
| `--reader-gutter-rule` | document and code line-number separator |
| `--reader-minimap-heading` | minimap heading marks |
| `--reader-minimap-search` | minimap search marks |
| `--reader-minimap-structure` | minimap code, diagram, and table marks |

## Component Contracts

- Document line gutters use `--reader-gutter` and `--reader-gutter-rule`.
- Code line gutters use the same gutter tokens and must not duplicate code text
  into the clipboard.
- Minimap marks use reader minimap tokens and are projected from the parsed
  document/search models.
- Print styles hide interactive chrome and visual gutters while preserving the
  readable document, tables, code, callouts, diagrams, and optional metadata.
- Mermaid variables continue to come from `readerTheme.ts` using resolved
  light/dark mode. Reader theme presets should not force a Mermaid reparse by
  changing non-semantic chart behavior.

## Extension Rules

- Add a new reader preset only when it can be expressed by semantic aliases.
- Do not introduce user-authored custom theme UI until the product scope is
  reopened.
- Keep theme changes independent from parsing and document model generation.
- Any new rendered Markdown affordance must document the token it consumes here.

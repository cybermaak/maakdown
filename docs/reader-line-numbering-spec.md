# Reader Line Numbering Specification

**Version:** 0.1 draft
**Status:** Pending review
**Owner:** Frontend/Reader Experience
**Last updated:** 2026-07-02

## Purpose

Maakdown's document line numbers should help a reader orient themselves in the
rendered document. They are not an editor feature and they are not exact
physical source-file line numbers.

The current implementation mixes physical Markdown source positions with
rendered layout. That produces visible reader bugs:

- Blank source lines create apparent numbering gaps, for example heading `299`
  followed by paragraph `301`.
- Raw anchors or invisible nodes can shift source metadata and place two labels
  on top of each other.
- Lists, code blocks, diagrams, and tables need repeated one-off positioning
  fixes because the numbering model is not defined independently from the
  rendered surface.

This spec resets the feature around a single rule:

> Document line numbers label visible rendered content lines. Structural
> spacing, source-only blank lines, and invisible anchors do not get labels and
> do not increment the counter.

## Product Decision

Use **reader content line numbers**, not physical source line numbers.

This means the displayed numbers are continuous over the rendered document body.
They intentionally skip source-only blank lines and invisible Markdown syntax.

Example:

```text
N     2. Navigation and Reader Position: Evaluation Scenario 1

N+1   This scenario examines Making anchors reliable...
```

Even if the Markdown file has an empty physical line between the heading and the
paragraph, the rendered document shows a heading, vertical spacing, and then
paragraph text. The spacing is not content, so it is not numbered.

### Consequence

Line numbers will no longer be reliable coordinates for opening the same line in
an external source editor. If exact source navigation becomes a future feature,
it should be a separate source-position affordance, such as "Copy source line"
or "Reveal source line", not the reader gutter.

## Vocabulary

| Term | Meaning |
|---|---|
| Physical source line | A literal newline-delimited line in the Markdown file. |
| Source-only blank line | A physical source line containing only whitespace and used for Markdown spacing or block separation. |
| Rendered content line | A logical line of content visible in the reader. This is what the gutter numbers. |
| Structural spacing | Margins, padding, loose-list spacing, blank lines between Markdown blocks, and other visual breathing room. |
| Hard line break | An explicit rendered line break, such as Markdown hard break syntax or `<br>`. |
| Soft wrap | A visual wrap caused only by the window width or reader measure. |
| Local numbering | Numbering inside a rendered object, such as code block line numbers or table row numbers. |

## Counting Model

The reader builds a **Line Map** from the final rendered document model. The map
is an ordered list of visible content line entries:

```text
lineNumber, targetBlock, targetSubpart, visualAnchor, copyBehavior
```

The counter starts at `1` for the first visible rendered document-body content.
For every eligible rendered content line, increment by `1`. For every ineligible
spacing or invisible item, increment by `0`.

The Line Map is the only source of truth for the gutter. The gutter renderer
must not infer numbers independently from source offsets, block indexes, or DOM
positions.

## Global Rules

1. **No source-only blank lines.** Blank Markdown lines used to separate blocks
   never receive a label and never increment the counter.
2. **No invisible content.** Raw anchors, invisible HTML, hidden table rows,
   hidden metadata, comments, and sanitized-away content do not receive labels.
3. **One visible content unit, one counter step.** Headings, paragraphs, list
   items, table rows, diagrams, and other visible units increment the counter
   according to the element-specific policy below.
4. **Hard breaks count.** Explicit rendered line breaks inside text create
   additional content lines.
5. **Soft wraps do not count.** If the same paragraph wraps differently because
   the window is narrower, the line numbers remain stable. The first visual row
   of the logical line receives the label; wrapped continuation rows do not.
6. **Large framed blocks use outer numbering.** Code blocks, diagrams, images,
   and tables are numbered as document objects in the outer gutter. Their
   internal lines, if any, use local numbering.
7. **Generated controls do not count.** Toolbar buttons, table filter controls,
   diagram inspection controls, settings chrome, minimap marks, and metadata
   side panels are not document content.
8. **Copy excludes numbers.** Selecting and copying reader text must not include
   gutter numbers or local row/line numbers.
9. **Accessibility excludes decoration.** Gutter labels are `aria-hidden` and do
   not enter the tab order.
10. **No overlaps.** The rendered gutter must have at most one label at a given
    visual anchor. If two model entries resolve to the same visual position, the
    Line Map is invalid and the renderer should fail the test rather than stack
    labels.

## Element Policies

### Document Masthead And Metadata

The document masthead, file title, generated metadata panel, and application
chrome are outside the Markdown body.

Policy:

- Count: `0`
- Display: no document gutter labels
- Reason: these surfaces are reader workspace chrome, not document content

### YAML Frontmatter

If frontmatter is shown as metadata rather than Markdown body content, it does
not contribute to reader line numbers.

Policy:

- Count: `0`
- Display: no document gutter labels
- Reason: frontmatter is metadata, and the body starts after it

If a future mode renders frontmatter inline as document content, that mode must
define its own frontmatter line policy before implementation.

### Headings

Each rendered Markdown heading is one content line.

Policy:

- Count: `1`
- Soft wrap: does not add lines
- Hard break inside heading: discouraged, but if rendered, adds one line per
  hard break
- Gutter anchor: first visual row of the heading text

Example:

```text
N     2. Navigation and Reader Position
```

### Paragraphs

Each paragraph is one content line unless it contains explicit rendered hard
line breaks.

Policy:

- Count: `1 + hardBreakCount`
- Soft source newlines inside a Markdown paragraph: count `0`; Markdown renders
  them as spaces
- Soft visual wraps caused by measure/window width: count `0`
- Gutter anchor: first visual row of each logical paragraph/hard-break segment

Example:

```markdown
First line
still same paragraph in Markdown.
```

Rendered and counted as:

```text
N     First line still same paragraph in Markdown.
```

Example with hard break:

```markdown
First line<br>
Second line
```

Rendered and counted as:

```text
N     First line
N+1   Second line
```

### Source-Only Blank Lines

Markdown blank lines that separate blocks are structural spacing.

Policy:

- Count: `0`
- Display: no label
- The next visible content line receives `previous + 1`, not the next physical
  file line number

Example:

```markdown
## Heading

Paragraph.
```

Rendered and counted as:

```text
N     Heading

N+1   Paragraph.
```

### Thematic Breaks

A visible thematic break is document content because it is an authored divider.

Policy:

- Count: `1`
- Gutter anchor: vertical center or top edge of the divider, whichever aligns
  more consistently with surrounding text

### Blockquotes

Blockquotes count their visible inner content using normal text/list rules. The
quote rail itself does not count.

Policy:

- Paragraph inside quote: same as paragraph
- List inside quote: same as list
- Blank quoted lines used for spacing: count `0`
- Gutter anchor: visible inner content line, aligned to the document gutter

### Callouts

Callouts are blockquotes with semantic styling. Count the visible callout title
and body content, not the box chrome.

Policy:

- Callout title: `1`
- Body paragraph: paragraph policy
- Body list: list policy
- Empty spacing between title and body: `0`
- Gutter anchor: title/body content rows, aligned to the document gutter

Example:

```text
N     NOTE: Reader line numbers skip source-only blank lines.
N+1   The body starts here.
```

### Unordered Lists

Each top-level list item is a content line. The bullet marker is part of the
item's visual row, but it does not create a separate line.

Policy:

- Count: `1` per item
- Hard break inside item text: adds one line per hard break
- Loose-list blank spacing: count `0`
- Soft wrap: count `0`
- Gutter anchor: first visual row of the item marker/text

Example:

```text
N     - First item
N+1   - Second item
N+2   - Third item
```

### Ordered Lists

Ordered lists follow unordered-list counting. The rendered ordered marker does
not affect the document line number.

Policy:

- Count: `1` per item
- Hard break inside item text: adds one line per hard break
- Loose-list blank spacing: count `0`
- Nested blocks: count in visual reading order

Example:

```text
N     1. Parse and sanitize before HTML reaches the document surface.
N+1   2. Preserve plain text and source code while enhancements are pending.
N+2   3. Resolve navigation through stable document-model identifiers.
```

### Task Lists

Task lists are lists with checkbox affordances. The checkbox is part of the item
row and does not affect counting.

Policy:

- Count: `1` per task item
- Checked/unchecked state: no effect
- Disabled checkbox control: not separately counted
- Hard break inside item: adds one line per hard break

Example:

```text
N     - [x] Define the scenario and its observable outcome.
N+1   - [x] Identify the trusted boundary and failure behavior.
N+2   - [ ] Capture performance values on macOS WebKit.
```

### Nested Lists

Nested list items count in visual reading order.

Policy:

- Parent item first line: `1`
- Nested child item: `1` each
- Blank spacing between parent and nested list: `0`
- Gutter labels remain in the global document gutter, not inside the nested
  indentation

Example:

```text
N     - Parent
N+1     - Child one
N+2     - Child two
N+3   - Next parent
```

### List Items With Multiple Blocks

A list item can contain a paragraph, nested list, code block, quote, or other
block. Count the first item line and then count nested visible blocks in the
order they appear.

Example:

```text
N     1. Parent item summary.
N+1      Additional paragraph inside the same item.
N+2      Nested diagram block.
N+3   2. Next item.
```

Blank spacing used to make a Markdown loose list remains `0`.

### Tables

Tables are dense structured objects. The outer document gutter counts the table
as a document object, while the table component owns row-level orientation.

Policy:

- Outer document count: `1` for the table block
- Local table row numbers: optional and independent
- Header shading/filter/sort controls: count `0`
- Hidden rows caused by filtering: do not affect outer document numbering
- Wrapped cell content: does not add outer document lines

Example:

```text
N     [table block]
```

Inside the table, optional row numbers may show visible row `1`, `2`, `3`, but
those are not document gutter numbers.

Rationale: table row numbering and sorting/filtering are already table-local
features. Counting each row in the outer document gutter would make document
numbers change under table filtering and would duplicate row-number UI.

### Code Blocks

Code blocks are framed reader objects. The outer document gutter counts the code
block once. Code line numbers are local to the code block.

Policy:

- Outer document count: `1` for the code block
- Local code lines: controlled by the code-line-number setting
- Blank lines inside code: count in local code numbering, not the outer document
  gutter
- Wrapped code lines: local display concern only

Example:

```text
N     [typescript code block]
```

Inside the code block:

```text
1     export async function openAndParse(...)
2       const document = ...
3
4       return ...
```

### Mermaid Diagrams

Mermaid diagram blocks are visual objects. The outer document gutter counts the
diagram once.

Policy:

- Rendered diagram mode: `1`
- Mermaid source mode: outer count remains `1`
- Mermaid source local code lines: use code-block local numbering if enabled
- Inspect modal: count `0`; it is not part of the document flow

Example:

```text
N     [diagram block]
```

### Images

Images count as one document object when they are visible.

Policy:

- Image block: `1`
- Image inside paragraph with text: paragraph policy; image does not add a
  separate line unless it renders as its own block
- Missing-image placeholder: `1`, because it is visible document content

### Math

Inline math follows its parent paragraph/list item and does not change counting.
Display math is a rendered block and counts once.

Policy:

- Inline math: parent policy
- Display math block: `1`
- Explicit multi-line equation environments: count as `1` unless the renderer
  exposes intentional separate equation rows in a future design

### Raw HTML

Raw HTML is counted by what remains visible after sanitization and rendering.

Policy:

- Invisible anchors: `0`
- Sanitized-away content: `0`
- Visible block-level HTML: `1` per visible rendered object unless it maps
  cleanly to known text/list/table/code policies
- Visible inline HTML: parent policy

Raw HTML must never be allowed to shift nearby content numbers.

### Footnotes

Footnotes count like a generated ordered list at the point they are rendered in
the document body.

Policy:

- Footnote item: `1`
- Hard break inside footnote: adds lines
- Backreference controls: count `0`

### Links, Wikilinks, Emphasis, Inline Code, And Badges

Inline decorations do not affect document line numbers.

Policy:

- Count: parent text policy
- Unresolved wikilink styling: no effect
- Inline code: no effect
- Tags/badges rendered inline: no effect

## Visual Layout Requirements

The gutter is a dedicated visual layer generated from the Line Map.

Requirements:

- Labels align to one global left gutter column for the document body.
- Labels are right-aligned with tabular numerals.
- The gutter rule is continuous through visible content and spacing.
- The gutter layer is not selectable and is excluded from copy.
- Labels do not move horizontally based on block indentation. List nesting,
  table width, code block chrome, and diagram framing do not shift the gutter.
- A label is anchored to the first visual row of the content line it represents.
- If a block has top margin, the label aligns to the content, not the margin.
- If content is filtered or hidden, no label is rendered for it.
- The gutter recalculates after layout-affecting changes such as typography,
  measure, line height, table filter state, Mermaid source toggle, or window
  resize.

## Numbering Examples

### Heading Followed By Paragraph With Source Blank Line

Markdown:

```markdown
## Navigation and Reader Position

This scenario examines anchors.
```

Reader:

```text
N     Navigation and Reader Position

N+1   This scenario examines anchors.
```

### Heading, Paragraph, Ordered List

Reader:

```text
N     Checkpoint 1

N+1   The checkpoint captures the operational contract:

N+2   1. Parse and sanitize before HTML reaches the document surface.
N+3   2. Preserve plain text and source code while enhancements are pending.
N+4   3. Resolve navigation through stable document-model identifiers.
N+5   4. Keep filesystem paths behind the backend trust boundary.
N+6   5. Verify the same behavior in a packaged build.
```

There are no labels on the blank spacing rows. There are no stacked labels.

### Task List Followed By Heading

Reader:

```text
N     Delivery checklist

N+1   - [x] Define the scenario and its observable outcome.
N+2   - [x] Identify the trusted boundary and failure behavior.
N+3   - [ ] Capture performance values on macOS WebKit.

N+4   Quantitative model
```

The heading after the list receives the next content number. It does not inherit
the first list item's number.

### Long Paragraph With Soft Wrap

Reader at wide width:

```text
N     This is a long paragraph that fits on one visual row.
```

Reader at narrow width:

```text
N     This is a long paragraph that wraps onto
      another visual row because the window is narrow.
```

The number remains `N`; soft wrap does not create `N+1`.

### Paragraph With Explicit Hard Break

Reader:

```text
N     First rendered line
N+1   Second rendered line after a hard break
```

Hard breaks are content.

### Code Block

Reader:

```text
N     [code block frame]
```

Code-local numbering:

```text
1     export function parse()
2
3     return model
```

The blank code line is local code content. It does not affect the outer document
line counter.

## Interaction Rules

### Copy

When a user copies selected document content:

- Document gutter labels are excluded.
- Code block local line numbers are excluded.
- Table row numbers are excluded.
- The copied content should match the visible text content as closely as
  possible without reader-only numbering chrome.

### Search

Document line numbers do not participate in search indexing or highlighting.

Search result navigation may scroll to a content block or line-map target, but
the result count is based on document text, not line labels.

### Table Sort And Filter

Table sorting and filtering are ephemeral reader projections. Because the outer
document gutter counts the table as one block, changing sort/filter state does
not renumber the surrounding document.

Table-local row numbers may update to reflect the visible sorted/filtered row
order.

### Print

Default print output should omit reader line numbers unless a future print
setting explicitly includes them.

Rationale: line numbers are reader navigation chrome, and print layout can
change page wrapping.

## Failure Cases To Prevent

The implementation must reject or test against these visible failures:

- A source-only blank line creates a numeric gap between adjacent rendered
  content lines.
- A raw anchor, footnote backlink, hidden element, or sanitized element consumes
  a reader line number.
- Two labels render on top of each other.
- A list renders one label for the whole list instead of one label per item.
- A label's horizontal position changes because a list is indented or a block is
  centered.
- Copying selected text includes document line numbers, code line numbers, or
  table row numbers.
- Resizing the window changes line numbers because of soft wrapping.
- Table filtering renumbers the surrounding document.
- Virtualization remounts a block with different line numbers.

## Implementation Direction

This section intentionally stays above concrete HTML details, but it constrains
the architecture:

1. Build a document-level Line Map from the rendered document model before
   drawing labels.
2. Count only rendered content units according to this spec.
3. Store stable line-map entries by document block id plus subpart id.
4. Render gutter labels from the Line Map in one dedicated layer.
5. Measure visual anchors after layout, but do not derive counting from layout
   geometry.
6. Keep local numbering systems separate:
   - code block line numbers
   - table row numbers
   - ordered-list markers
7. Treat physical source positions as optional debugging metadata, not the
   displayed reader line number.

## Test Plan For Implementation

Implementation should not proceed without these tests:

1. **Line-map unit tests:** Given a document model, produce the expected
   continuous reader line numbers for headings, paragraphs, blank source lines,
   hard breaks, ordered lists, task lists, nested lists, code, Mermaid, tables,
   blockquotes, callouts, images, math, raw anchors, and footnotes.
2. **Fixture test:** Add a dedicated fixture that includes every policy case in
   this spec.
3. **Large fixture regression:** Verify `fixtures/large-10k-lines.md` has no
   numeric gaps caused only by blank source lines and no stacked labels around
   Checkpoint and Delivery sections.
4. **Visual UAT:** Enable document line numbers, scroll through representative
   sections, and assert:
   - no duplicate/stacked labels at the same position
   - no labels on blank spacing
   - list items each have labels
   - code/table/Mermaid outer labels remain block-level
5. **Copy UAT:** Selecting text across labels copies only document text.
6. **Resize UAT:** Narrow and wide windows keep the same logical numbers for
   soft-wrapped paragraphs.
7. **Table UAT:** Sorting/filtering table rows does not renumber surrounding
   document content.
8. **Virtualization UAT:** Scroll away and back; line numbers are unchanged.

## Open Questions For Review

1. Should the UI label remain **Document line numbers**, or should it become
   **Reader line numbers** to make the non-source semantics explicit?
2. Should display math with explicit multi-line equation environments count as
   one block or multiple equation rows?
3. Should print ever include reader line numbers, or should they remain
   screen-only?

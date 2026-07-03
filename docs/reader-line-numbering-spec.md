# Reader Line Numbering Specification

**Version:** 0.2 draft
**Status:** Pending user review
**Owner:** Frontend/Reader Experience
**Last updated:** 2026-07-03

## Purpose

Maakdown's line numbers are a reader-orientation feature. They should help a
reader say "go back to line 340" inside the rendered document.

They are not source-file coordinates, and they are not visual wrap rows. The
reader never sees the Markdown source, and the app window is resizable, so both
physical source numbering and browser visual-line numbering create confusing
behavior.

The feature is therefore defined as:

> Line numbers label logical rendered content lines in the reader. Source-only
> blank lines, invisible anchors, hidden content, and structural spacing do not
> receive labels and do not increment the counter.

## Research Basis

The web and Markdown ecosystem has several related mechanisms, but no single
standard for "rendered Markdown document line numbers":

- CommonMark/cmark/commonmark.js can emit source positions such as
  `data-sourcepos`. These are physical source ranges. They are useful for
  source navigation, but they naturally include source-only blank-line effects
  and list range quirks that are not visible to the reader.
- Unified/remark/micromark preserve parser positions on syntax nodes. These
  positions are also source coordinates, not reader line numbers.
- Markdown-it exposes token source maps with source line ranges. Again, these
  map source to tokens, not rendered reader lines.
- Browser `Range`/`getClientRects()` can detect rendered visual line boxes, but
  those boxes change with width, font loading, zoom, theme, and platform text
  layout. They are appropriate for measuring placement, not for deciding the
  logical numbering.
- CSS counters can number elements that generate boxes, but they cannot encode
  Maakdown's Markdown-specific policies for hard breaks, lists, framed objects,
  virtualization, table filtering, copy exclusion, and enhancement swaps.

The practical design is therefore a custom semantic **Line Map** built from the
sanitized rendered document tree. The Line Map owns the numbers; layout code
only places labels for those already-decided numbers.

## Product Decisions

### D1. Logical Reader Lines, Not Physical Source Lines

Displayed numbers are continuous over visible rendered content. Physical blank
lines in the Markdown source do not create gaps.

Example:

```text
N     2. Navigation and Reader Position: Evaluation Scenario 1

N+1   This scenario examines Making anchors reliable...
```

If the Markdown file has one blank line, five blank lines, or an invisible raw
anchor between those two blocks, the reader still sees one heading followed by
one paragraph. The paragraph is numbered `N+1`.

### D2. Logical Lines, Not Visual Wrap Rows

Soft wrapping does not create new line numbers. A long paragraph keeps the same
logical line number at every window width.

Example at a narrow width:

```text
N     This paragraph wraps onto
      another visual row because the window is narrow.
```

Only the first visual row receives label `N`. The continuation row has no
separate label.

### D3. Physical Source Positions Stay Separate

Physical source positions may remain in the model for debugging or future
"Reveal source line" commands. They must not drive the reader gutter.

If exact source navigation becomes a product feature, it is a separate
affordance from reader line numbers.

### D4. Current UI Label Can Stay Simple

The Settings label can remain **Document line numbers** or **Line numbers**.
The semantics belong in this specification and tests, not in a long settings
label.

### D5. Print Is Default-Off

Reader line numbers are screen navigation chrome. Print output omits them by
default unless a future print setting explicitly adds them.

## Vocabulary

| Term | Meaning |
|---|---|
| Physical source line | A literal newline-delimited line in the Markdown file. |
| Source-only blank line | A physical source line containing only whitespace and used for Markdown spacing or block separation. |
| Logical reader line | A visible rendered content unit counted by the reader gutter. |
| Visual wrap row | A browser-created row caused by text wrapping to the current width. |
| Structural spacing | Margins, padding, loose-list spacing, blank lines between Markdown blocks, and other visual breathing room. |
| Hard line break | An authored rendered line break, such as Markdown hard-break syntax or `<br>`. |
| Framed object | A rendered content object with its own internal structure, such as code, Mermaid, table, image, or display math. |
| Local numbering | Numbering inside a framed object, such as code block line numbers or table row numbers. |
| Line Map | Parser-produced ordered list of logical reader lines and their anchors. |
| Anchor | Stable target inside a rendered block where the gutter label should align. |

## Counting Architecture

### Source Of Truth

The parser worker builds the Line Map from the post-sanitize rendered document
tree. In the current implementation this tree is the sanitized HAST tree, but
the architectural requirement is broader: count from the sanitized semantic
render tree before it reaches the UI.

The UI renderer must never infer numbers from:

- physical source line offsets
- DOM child indexes
- block source ranges
- pixel positions
- CSS counters
- already-rendered gutter labels

### Line Map Shape

The model exposes one document-level total and per-block line entries. Do not
ship a separate side-table unless implementation proves it is required.

Conceptual shape:

```text
DocumentModel.readerLineCount: number
Block.readerLines:
  - lineNumber: number
    anchorId: string
    kind: "block" | "list-item" | "hard-break-segment" | "callout-title"
```

Each entry represents exactly one logical reader line. `anchorId` is stable
within the rendered block and is emitted by the parser when the block needs
subpart anchors, such as list items or hard-break segments.

`textPreview` and other display-only metadata should be omitted until a UI
needs them. If a future feature needs previews, cap their length so the parser
worker transfer payload stays within the P13/P20 budget.

### Counting Flow

1. Parse Markdown into the Markdown syntax tree.
2. Convert to the rendered semantic tree.
3. Apply raw HTML handling, GFM transforms, KaTeX/callout transforms, and
   sanitization.
4. Walk the post-sanitize tree in rendered reading order.
5. Emit Line Map entries according to this spec.
6. Inject trusted reader-line anchor attributes into the already-sanitized tree
   and emit matching model metadata needed by the UI to place labels.
7. Store `readerLineCount` on the document model.
8. Store per-block line entries on each block.

Reader-line anchor attributes are injected after sanitization. Their attribute
names must not be added to the sanitize schema allow-list. This guarantees
author-supplied raw HTML cannot forge anchors, create labels, shift numbering,
or relabel nearby content.

### Renderer Responsibility

The renderer places labels for the Line Map. It does not decide which numbers
exist.

Renderer responsibilities:

- find the anchor for each mounted line entry
- position the label in the global gutter
- keep labels out of selection, copy, and the accessibility tree
- re-place labels after layout-affecting changes
- remain idempotent when run repeatedly

### Layout Measurement Rule

Layout measurement may determine where a known label is drawn. It must not
determine whether a line exists or what number it receives.

`getClientRects()` and similar APIs are allowed for placement checks only, not
for counting.

## Global Counting Rules

1. **Source-only blank lines do not count.** Blank Markdown lines used to
   separate blocks never receive labels and never increment the counter.
2. **Invisible content does not count.** Raw anchors, hidden nodes,
   sanitized-away content, comments, and generated controls do not receive
   labels.
3. **Content counts in rendered reading order.** The Line Map follows the
   order a reader encounters content in the rendered document body.
4. **Hard breaks count.** Authored hard breaks inside textual content create
   additional logical reader lines.
5. **Soft wraps do not count.** Browser wrapping is a display artifact.
6. **Framed objects count once.** Code, Mermaid, tables, images, and display
   math each count as one outer document line.
7. **Local numbering stays local.** Code line numbers, table row numbers, and
   ordered-list markers are not document line numbers.
8. **Controls do not count.** Toolbars, filter inputs, sort buttons, diagram
   controls, metadata panels, minimap marks, and settings chrome are app UI.
9. **No duplicate anchors.** The Line Map builder must emit at most one entry
   for a given block id plus anchor id. Overlaps should be impossible by
   construction, not merely cleaned up by the renderer.
10. **Copy excludes numbering.** Reader line numbers and local numbering chrome
    are decorative and never copied with document text.

## Element Policies

### Application Chrome, Masthead, And Metadata

App chrome, title bars, tabs, the generated masthead, and metadata side panels
are outside the Markdown body.

Policy:

- Count: `0`
- Gutter: no label

### YAML Frontmatter

Frontmatter displayed as metadata does not contribute to reader line numbers.

Policy:

- Count: `0`
- Gutter: no label

If a future mode renders frontmatter inline as document body content, that mode
must define a separate frontmatter policy before implementation.

### Headings

Each rendered heading is one logical reader line.

Policy:

- Count: `1`
- Soft wrap: no extra lines
- Hard break inside heading: count each hard-break segment
- Anchor: heading text start, or parser-emitted hard-break segment anchor

Example:

```text
N     2. Navigation and Reader Position
```

### Paragraphs

Each paragraph is one logical reader line unless it contains authored hard
breaks.

Policy:

- Count: `1 + hardBreakCount`
- Soft source newline inside a Markdown paragraph: `0`
- Soft visual wrap: `0`
- Anchor: first segment starts at the paragraph; later hard-break segments use
  parser-emitted segment anchors

Example:

```markdown
First line
still same paragraph in Markdown.
```

Rendered and counted as:

```text
N     First line still same paragraph in Markdown.
```

Hard-break example:

```markdown
First line<br>
Second line
```

Rendered and counted as:

```text
N     First line
N+1   Second line
```

Implementation requirement:

- The parser must emit stable anchors for hard-break segments.
- The UI must not discover those segments by scanning text nodes with
  `Range.getClientRects()`.

### Source-Only Blank Lines

Markdown blank lines used to separate blocks are structural spacing.

Policy:

- Count: `0`
- Gutter: no label
- Effect on numbering: none

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

A visible thematic break is authored document content.

Policy:

- Count: `1`
- Anchor: the divider block

### Blockquotes

Blockquotes count visible inner content using the same policies as normal
content. The quote rail and quote spacing do not count.

Policy:

- Quote rail: `0`
- Paragraph inside quote: paragraph policy
- List inside quote: list policy
- Blank quoted spacing: `0`
- Anchor: visible inner content, aligned to the global gutter

### Callouts

Callouts are semantic blockquotes with styled chrome. Count the visible title
and body content, not the box.

Policy:

- Callout title: `1`
- Body paragraph: paragraph policy
- Body list: list policy
- Empty spacing between title and body: `0`
- Callout box/border/icon chrome: `0`

Example:

```text
N     NOTE: Reader line numbers skip source-only blank lines.
N+1   The body starts here.
```

### Unordered Lists

Each list item is a logical reader line. The bullet marker is part of the item
row but not a separate line.

Policy:

- Count: `1` per item
- Hard break inside item text: count each hard-break segment
- Loose-list spacing: `0`
- Soft wrap: `0`
- Anchor: parser-emitted list-item anchor, not indentation-dependent geometry

Example:

```text
N     - First item
N+1   - Second item
N+2   - Third item
```

### Ordered Lists

Ordered lists follow the same document-line policy as unordered lists. The
ordered marker is local list presentation.

Policy:

- Count: `1` per item
- Hard break inside item text: count each hard-break segment
- Loose-list spacing: `0`
- Ordered marker: local presentation, not the document line number

Example:

```text
N     1. Parse and sanitize before HTML reaches the document surface.
N+1   2. Preserve plain text and source code while enhancements are pending.
N+2   3. Resolve navigation through stable document-model identifiers.
```

### Task Lists

Task lists are lists with checkbox affordances.

Policy:

- Count: `1` per task item
- Checkbox control: `0`
- Checked/unchecked state: no effect
- Hard break inside item text: count each hard-break segment

Example:

```text
N     - [x] Define the scenario and its observable outcome.
N+1   - [x] Identify the trusted boundary and failure behavior.
N+2   - [ ] Capture performance values on macOS WebKit.
```

### Nested Lists

Nested list items count in rendered reading order. Their labels stay in the
global gutter.

Policy:

- Parent item first line: `1`
- Nested child item: `1`
- Blank spacing between parent and nested list: `0`
- Gutter x-position: global, not nested indentation

Example:

```text
N     - Parent
N+1     - Child one
N+2     - Child two
N+3   - Next parent
```

### List Items With Multiple Blocks

A list item may contain paragraphs, nested lists, code, Mermaid, tables, images,
blockquotes, callouts, or math. Count the first item line and then count nested
visible blocks in rendered reading order.

Framed objects inside list items keep their framed-object policy: one outer
document line each, with any local numbering remaining inside the object.

Example:

```text
N     1. Parent item summary.
N+1      Additional paragraph inside the same item.
N+2      Nested diagram block.
N+3   2. Next item.
```

Loose-list spacing still counts `0`.

### Tables

Tables are framed objects. The outer document gutter counts a table once.
Table-local row numbers remain separate.

Policy:

- Outer document count: `1`
- Header row: included in the table object, not a separate document line
- Body rows: table-local only
- Table row numbers: local and optional
- Header controls, filter popovers, sort controls: `0`
- Hidden rows caused by filtering: no effect on outer document numbering
- Wrapped cell content: no effect on outer document numbering

Example:

```text
N     [table block]
```

Rationale:

Sorting and filtering are reader projections. If every visible row changed the
outer document count, table interaction would renumber the surrounding document.
That would make the gutter worse as an orientation tool.

### Code Blocks

Code blocks are framed objects. The outer document gutter counts the code block
once. Code line numbers are local to the code block.

Policy:

- Outer document count: `1`
- Code line numbers: local setting
- Blank lines inside code: local code numbering only
- Wrapped code lines: local display concern only
- Enhancement/highlighting completion: must not change the outer line entry

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

Mermaid diagrams are framed objects.

Policy:

- Rendered diagram mode: `1`
- Mermaid source mode: still `1` outer document line
- Mermaid source local code lines: use local code numbering if enabled
- Inspect modal: `0`
- Enhancement completion: must not lose, duplicate, or renumber the outer line
  label

Example:

```text
N     [diagram block]
```

### Images

Visible block images count as one framed object.

Policy:

- Block image: `1`
- Inline image inside paragraph: parent paragraph policy
- Missing-image placeholder: `1`, because it is visible document content

### Math

Inline math follows its parent text policy. Display math is a framed object.

Policy:

- Inline math: parent policy
- Display math block: `1`
- Multi-line equation environments: still `1` unless a future design exposes
  intentional per-equation rows

### Raw HTML

Raw HTML is counted by what remains visible after sanitization.

Policy:

- Invisible anchors: `0`
- Sanitized-away content: `0`
- Hidden elements: `0`
- Visible inline HTML: parent policy
- Visible block-level HTML: `1` per visible rendered object unless it maps
  cleanly to a known policy above

Raw HTML must never shift nearby content numbers by consuming hidden entries.

### Footnotes

Footnotes count like generated ordered-list content at the point they are
rendered in the document body.

Policy:

- Footnote item: `1`
- Hard break inside footnote: count each hard-break segment
- Backreference controls: `0`

### Links, Wikilinks, Emphasis, Inline Code, Tags, And Badges

Inline decorations do not affect line numbers.

Policy:

- Count: parent text policy
- Unresolved wikilink styling: no effect
- Inline code: no effect
- Tags/badges rendered inline: no effect

## Visual Layout Requirements

The gutter is generated from the Line Map and must read as one continuous visual
column. That does not mean it is one detached overlay DOM layer.

Recommended architecture:

- Each mounted `BlockView` owns the labels for its own `Block.readerLines`.
- Labels live in a wrapper controlled by `BlockView`, outside enhancement-owned
  inner content.
- CSS pins every label to the same global gutter column.
- Vertical placement is measured from parser-emitted anchors within the block.
- Labels ride the existing virtualizer. Scrolling should not require measuring
  or moving every label in the document.

Avoid a detached overlay that positions every label from document-level absolute
scroll offsets. That approach fights virtualization, requires remeasurement on
scroll/remount/height changes, and recreates the geometry-tracking fragility
this redesign is meant to remove.

Requirements:

- Labels align to one global left gutter column for the document body.
- Labels are right-aligned with tabular numerals.
- The gutter rule is continuous through visible content and spacing.
- The gutter layer is not selectable and is excluded from copy.
- Labels do not move horizontally based on block indentation, table width, code
  chrome, diagram framing, or nested-list indentation.
- A label is anchored to the first visual row of the logical content line.
- If a block has top margin, the label aligns to content, not margin.
- If content is filtered or hidden, no label is rendered for it.
- Renderer passes are idempotent. Running placement again removes stale labels
  or updates positions without duplicating labels.
- The gutter recalculates label placement after layout-affecting changes:
  typography, measure, line height, table filter state, Mermaid source toggle,
  window resize, virtualizer remount, font readiness, and progressive
  enhancement completion.

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

There are no labels on blank spacing rows. There are no stacked labels.

### Task List Followed By Heading

Reader:

```text
N     Delivery checklist

N+1   - [x] Define the scenario and its observable outcome.
N+2   - [x] Identify the trusted boundary and failure behavior.
N+3   - [ ] Capture performance values on macOS WebKit.

N+4   Quantitative model
```

The heading after the list receives the next logical reader line. It does not
inherit the first list item's number.

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

Hard breaks are authored content lines. The parser emits an anchor for the
second segment.

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

## Reader Interactions

### Copy

When a user copies selected document content:

- Document gutter labels are excluded.
- Code block local line numbers are excluded.
- Table row numbers are excluded.
- The copied content should match the visible document text as closely as
  possible without reader-only numbering chrome.

### Search

Line numbers do not participate in search indexing or highlighting.

Search result navigation may scroll to a Line Map target, but result counts are
based on document text, not line labels.

### Go To Line

The Line Map enables a `Go to line...` command.

Policy:

- Input is a logical reader line number.
- The command scrolls to the mapped block/subpart anchor.
- The mapped target may be outside the current virtualized range; navigation
  must perform the same kind of multi-pass settle used by heading navigation.
- Invalid values report the valid range.
- The command does not search physical source lines.

This should be part of P20 implementation scope because it turns the gutter from
passive decoration into an orientation workflow.

### Masthead And Stats

Any user-facing stat labeled "lines" should use the Line Map total once P20
lands. Physical source line count can remain internal metadata or be shown only
with explicit source-oriented copy.

The gutter digit width should also derive from `readerLineCount`, not physical
`sourceLineCount`.

### Table Sort And Filter

Table sorting and filtering are ephemeral reader projections. Because the outer
document gutter counts the table as one framed object, changing sort/filter
state does not renumber the surrounding document.

Table-local row numbers may update to reflect visible sorted/filtered row order.

### Print

Default print output omits reader line numbers. A future explicit print setting
may include them, but that setting must be designed separately.

## Failure Cases To Prevent

Implementation must reject or test against these visible failures:

- A source-only blank line creates a numeric gap between adjacent rendered
  content lines.
- A raw anchor, footnote backlink, hidden element, or sanitized element consumes
  a reader line number.
- Author-supplied raw HTML carrying reader-line anchor attribute names creates,
  shifts, or relabels Line Map entries.
- Two labels render on top of each other.
- A list renders one label for the whole list instead of one label per item.
- A label's horizontal position changes because a list is indented or a block is
  centered.
- Copying selected text includes document line numbers, code line numbers, or
  table row numbers.
- Resizing the window changes logical line numbers because of soft wrapping.
- Table filtering renumbers the surrounding document.
- Virtualization remounts a block with different line numbers.
- Progressive enhancement replaces block HTML and loses, duplicates, or shifts
  the label.
- A hard-break segment requires Range-based text measurement to determine its
  number.

## Implementation Direction

### Parser Worker

Implement Line Map construction in the parser worker, after sanitization.

The parser worker must:

- walk the post-sanitize rendered semantic tree in reading order
- apply this spec's element policies
- emit the Line Map as model data
- emit stable anchors for sub-block entries such as list items and hard-break
  segments
- emit `readerLineCount`
- avoid using physical source ranges for displayed line numbers

Anchor trust rule:

- Strip any author-supplied reader-line anchor attributes during sanitization by
  leaving those names out of the sanitize allow-list.
- Inject reader-line anchor attributes only after sanitization, inside the
  parser-controlled pipeline.
- Treat the injected anchors and `Block.readerLines` model entries as the only
  trusted inputs for gutter placement.

### Document Model

Add explicit reader-line data to the document model rather than overloading
source-position fields.

Conceptual additions:

```text
DocumentModel.readerLineCount
Block.readerLines[]
ReaderLine.lineNumber
ReaderLine.anchorId
ReaderLine.kind
```

Physical source data can continue to exist under source-specific names. It must
not be consumed by the gutter renderer.

### Gutter Renderer

The renderer must:

- render from `Block.readerLines`
- place labels in per-block wrappers that align to one global gutter column
- align labels to anchors emitted by the parser
- keep label wrappers outside enhancement-owned inner content
- be idempotent across repeated placement passes
- keep labels `aria-hidden`
- exclude labels from copy
- rerun placement after layout changes and enhancement completion

The renderer must not use a detached document-wide overlay that tracks all label
positions from scroll offsets.

### Hard-Break Anchors

Hard-break support uses parser-emitted anchors.

Allowed approach:

- During parsing, insert an empty trusted anchor marker after each rendered
  `<br>` so the marker represents the start of the next hard-break segment.
- If marker insertion is insufficient for a future case, parser-side segment
  wrapping is allowed, but only if it preserves sanitized inline markup.
- Preserve safe/sanitized markup.
- Use those anchors for label placement.

Disallowed approach:

- Measuring raw text nodes with `Range.getClientRects()` to discover hard-break
  or wrap-derived "lines" at runtime.

### Enhancement Swaps

Code highlighting, Mermaid rendering, KaTeX, image resolution, and other
progressive enhancements may replace or resize block content. The label layer
must survive these swaps.

Preferred approach:

- Keep outer block anchors stable outside enhancement-replaced inner content
  when possible.
- Re-run placement after enhancement completion.
- Never store labels inside a subtree that enhancement code owns and replaces.

### Local Numbering Systems

Keep these systems separate:

- reader line numbers
- code block line numbers
- table row numbers
- ordered-list markers
- physical source positions

They may coexist visually, but they must not share counters or copy behavior.

## Test Plan For Implementation

Implementation should not proceed without these tests:

1. **Line-map unit tests:** Given parser output, produce expected logical reader
   numbers for headings, paragraphs, source-only blank lines, hard breaks,
   ordered lists, task lists, nested lists, multi-block list items, code,
   Mermaid, tables, blockquotes, callouts, images, math, raw anchors, and
   footnotes.
2. **Sanitized raw HTML tests:** Verify invisible anchors, hidden content,
   sanitized-away content, and author-supplied reader-line anchor attribute
   names do not create, shift, or relabel Line Map entries.
3. **Hard-break anchor tests:** Verify hard-break segments count and have stable
   anchors without layout measurement, including hard breaks inside inline
   formatting such as `<em>a<br>b</em>`.
4. **Dedicated fixture:** Add a fixture that includes every policy case in this
   spec.
5. **Large fixture regression:** Verify `fixtures/large-10k-lines.md` has no
   numeric gaps caused by blank source lines and no stacked labels around
   Checkpoint, Delivery, Quantitative model, code, Mermaid, and table sections.
6. **Placement fixture test:** Verify label placement is idempotent, list-item
   anchors align to the global gutter, and hard-break segment anchors place
   correctly.
7. **Visual UAT:** Enable line numbers, scroll through representative sections,
   and assert:
   - no duplicate/stacked labels
   - no labels on blank spacing
   - list items each have labels
   - code/table/Mermaid outer labels remain block-level
8. **Copy UAT:** Selecting text across labels copies only document text. The
   renderer, copy sanitizer, and tests should share decoration class names from
   one exported registry rather than duplicating string literals.
9. **Resize UAT:** Narrow and wide windows keep the same logical numbers for
   soft-wrapped paragraphs.
10. **Table UAT:** Sorting/filtering table rows does not renumber surrounding
    document content.
11. **Enhancement UAT:** Highlighting and Mermaid enhancement completion do not
    lose, duplicate, or renumber labels.
12. **Virtualization UAT:** Scroll away and back; line numbers are unchanged.
13. **Go-to-line UAT:** Command palette navigation jumps to the mapped logical
    reader line, including a deep target outside the current virtualized range,
    and reports valid range for invalid input.
14. **Performance gate:** Line Map construction and label placement on
    `fixtures/large-10k-lines.md` stay within the P13/P20 performance budget.

## Review Feedback Disposition

This v0.2 draft incorporates the applicable feedback from
`docs/reader-line-numbering-spec-review.md`:

- R1 accepted: counting happens in the parser worker on the post-sanitize tree.
- R2 accepted with the full policy: hard breaks count, and parser-emitted
  segment anchors are required.
- R3 accepted: progressive enhancement completion is a placement trigger and a
  failure case.
- S1 accepted: masthead/stat line totals and gutter digit width move to the
  Line Map total.
- S2 accepted: `Go to line...` is added to P20 scope.
- S3 accepted: duplicate labels are prevented by Line Map construction.
- S4 accepted: placement tests and performance gates are required.
- N1 accepted: "global gutter layer" means per-block label ownership aligned to
  one visual gutter column, not a detached document-wide overlay.
- N2 accepted: reader-line anchors are injected after sanitization and are not
  sanitize-allow-listed, so author-supplied raw HTML cannot forge them.
- N3 accepted as implementation guidance: hard-break anchors should prefer
  empty marker insertion after `<br>` before considering segment wrapping.
- N4/N5 accepted: the model shape uses `DocumentModel.readerLineCount` plus
  `Block.readerLines[]`; optional previews are omitted until a UI needs them.
- N6 accepted: framed objects count once without a phantom nested-list
  exception.
- N7 accepted: tests include unmounted go-to-line targets and shared decoration
  class names for copy exclusion.

The review's product model approval still applies after the external research.
The research strengthened the same conclusion: source-position APIs solve source
correlation; browser rects solve placement; CSS counters solve simple element
numbering. Maakdown needs a semantic reader Line Map.

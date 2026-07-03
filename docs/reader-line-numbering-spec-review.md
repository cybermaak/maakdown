# Review Notes: Reader Line Numbering Specification

**Reviewed document:** `docs/reader-line-numbering-spec.md` (v0.1 draft)
**Review date:** 2026-07-02
**Reviewer:** Claude Code review pass with user product direction
**Verdict:** Approve the product model and counting policies. Three changes are
required before implementation starts (R1–R3); four are recommended (S1–S4).
The open questions are dispositioned at the end.

## Product Model: Accepted

The spec's core decision — **reader content line numbers, not physical source
line numbers** — is correct for this product, for reasons worth recording so
the debate does not reopen:

1. Maakdown is a viewer. The reader never sees the Markdown source, so source
   coordinates reference an artifact that does not exist in the reader's
   world. A gap like `299 → 301` is not "accurate" from the reader's seat;
   there is nothing visible for `300` to point at.
2. Rendering collapses blank lines: one blank source line and five blank
   source lines produce the same visual gap. Source numbering therefore does
   not even degrade gracefully — identical-looking documents number
   differently.
3. The use case is orientation and return ("remember line 340, scroll back to
   it"), an established affordance in rich text viewers. That requires labels
   that are stable and continuous over rendered content, which is exactly
   what the spec defines.

The spec also implicitly makes a second correct choice that should be stated
explicitly: these are **logical** content lines, not Word-style **visual**
lines. Visual-line numbering renumbers on every window resize and would break
the "return to line N" promise in a resizable window. The soft-wrap rule
(Global Rule 5) is the right rule; this note is its missing rationale.

If exact source navigation ever becomes a feature, it is a separate
affordance ("Copy source line" / "Reveal source line"), as the spec's
Consequence section already says. Physical positions stay in the model as
optional metadata only.

## Approved As-Is

- The per-element policy set: framed objects (code, tables, diagrams, images,
  display math) count once with local numbering kept separate; list items
  count individually; loose-list spacing, quote rails, checkboxes, filter
  chrome, and invisible or sanitized-away HTML count zero; masthead and
  frontmatter sit outside the body counter.
- Table filtering and sorting can never renumber the surrounding document.
- The Failure Cases section maps one-to-one onto real fixed bugs
  (`6a0a848`, `5788706`, `c2748b7`) and should gate implementation as written.
- Copy exclusion, accessibility exclusion, and print default-off.
- The framed-object-inside-list-item case is answered by the "List Items With
  Multiple Blocks" example (a nested diagram gets its own line). Add one
  explicit sentence stating that precedence, but the policy itself is fine.
- Hard breaks survive sanitization (`br` is in the rehype-sanitize default
  schema), so the hard-break policy is implementable as specified.

## Required Changes

### R1. Commit to where counting happens: parser worker, post-sanitize tree

The spec says the Line Map is built "from the final rendered document model"
but stays implementation-agnostic. This is the one place the spec must
commit, because the choice determines whether the redesign removes the old
bug class or reruns it:

- **Count on the post-sanitize HAST tree, inside the parser worker, and emit
  per-block content-line entries in the document model.**
- The raw-HTML rule ("count what remains visible after sanitization") is only
  decidable after sanitize. Counting there makes Global Rule 2 structural
  instead of defensive.
- Numbers ride the model into `BlockView`; the renderer places labels but
  never derives numbers. The old failure mode — DOM-index matching at render
  time — becomes impossible rather than guarded against.
- The Line Map becomes pure data with unit tests in the existing
  `parseDocument.test.ts` harness, and the counting cost stays off the UI
  thread.
- The old dual-path reconciliation (side-band position array plus
  `data-source-*` DOM attributes) disappears for display purposes.

Suggested spec edit: replace Implementation Direction items 1–3 with the
worker/post-sanitize commitment above.

### R2. Hard breaks are the cost center: pick a mechanism or defer

Every other policy anchors labels to a real DOM element (block element or
`<li>`). Hard-break segments are text runs between `<br>` nodes — not
elements — so anchoring labels to them requires either Range-geometry
measurement or wrapping segments in spans inside the rendered `{@html}`
subtree. That is exactly the class of DOM surgery that produced the P19 fix
series. The spec must choose:

- **Option A (phase-1 simplification):** paragraphs count `1` regardless of
  hard breaks. Cheapest; slightly bends the "rendered content line" rule;
  revisit if readers of poetry, lyrics, or addresses report it.
- **Option B (full policy):** the **parser** wraps hard-break segments in a
  sanctioned span during the pipeline (it already annotates nodes), so the
  anchor is an element by the time it renders and the gutter never measures
  text runs. If the policy stays, this mechanism must be named in the spec —
  do not leave the implementer to discover Range rects.

Either option is acceptable; leaving it unspecified is not.

### R3. Enhancement swaps join the recalculation triggers and failure cases

Code and Mermaid blocks replace their HTML asynchronously after mount. Any
label or wrapper living inside that subtree is wiped when enhancement lands.
The search-mark decorator already re-applies for this exact reason. The
spec's recalculation list (typography, measure, line height, table filter,
Mermaid source toggle, resize) omits *enhancement completion*, which is the
most common layout-shift event in the reader.

- Add "progressive enhancement replaces block HTML" to the Visual Layout
  recalculation triggers.
- Add to Failure Cases: "A block that enhances after mount loses its label or
  renders a duplicate label."

## Recommended Changes

### S1. Reconcile the masthead "lines" stat with the new meaning of "line"

The masthead shows `lines` from physical `sourceLineCount`
(`frontend/src/components/Masthead.svelte:55`,
`frontend/src/core/stats/documentStats.ts`). Once the gutter teaches users
that "line" means content line (roughly a few thousand for the large
fixture, versus 10,726 physical), the stat contradicts the gutter. Since the
reader never sees the source, the stat should become the Line Map total. The
gutter digit-width derivation (`documentLineDigits` in
`DocumentView.svelte`, currently from `sourceLineCount`) moves to the Line
Map total for the same reason.

### S2. Add "Go to line" so the numbers do something

The stated user story is "return to some line." Without navigation, that
means scroll-and-scan until the gutter shows N. Once the Line Map exists,
number → block → virtualizer offset is a trivial lookup, and the command
palette already has the infrastructure. A `Go to line…` palette command
converts the feature from passive chrome into the workflow it exists for.
Suggest adding it to P20 scope as an explicit task (for example P20.5) rather
than leaving it unstated.

### S3. State Rule 10's runtime behavior, not just its test behavior

"Fail the test rather than stack labels" is a development-time gate. The spec
should state that overlaps are impossible **by construction**: the Line Map
builder emits at most one entry per visual anchor and dedupes at build time.
Tests then verify the builder, not the renderer.

### S4. Add an anchoring test target and a benchmark gate

The counting model is well covered by the spec's test plan (items 1–3), but
the pixel-anchoring layer — the part with the actual regression history — has
only behavioral UAT. Add:

- a DOM-fixture test for the label-placement decorator (idempotent re-runs,
  correct anchors for list items and hard-break segments if Option B is
  chosen);
- a benchmark assertion that Line Map construction and label placement on
  `fixtures/large-10k-lines.md` stay within the P13 baseline budget, since
  the spec requires recalculation on several high-frequency events.

## Open Questions: Disposition

1. **UI label naming.** Keep **"Line numbers"** (current Settings copy is
   "Document line numbers"; either is fine). The renaming argument cuts both
   ways: a user who never sees the source does not need the label to
   disambiguate against source numbering. Document the semantics in the spec,
   not in the settings panel.
2. **Multi-line display math.** Close as **count `1`** — display math is a
   framed object, consistent with code, tables, and diagrams. Reopen only if
   a future design exposes intentional per-equation rows.
3. **Print.** Keep default-off as specified. Revisit only if a citation use
   case appears; that would be a print setting, not a change to this model.

## Suggested Sequencing Adjustment For P20

- **P20.2** (Line Map model) should explicitly include the parser-side
  emission from R1 — the Line Map is parser output, not a frontend
  post-processing step.
- **P20.3** (gutter renderer) should depend on the R2 decision and include
  the S4 anchoring fixture tests.
- **P20.4** (fixture and regression suite) is right as scoped; add the R3
  enhancement-swap case and, if S2 is accepted, a go-to-line UAT.
- Consider tiering the element policies: core set first (headings,
  paragraphs, lists, framed objects, blank-line suppression), exotic
  combinations (footnote hard breaks, deeply nested multi-block items)
  falling back to parent-block counting until reported. This keeps P20.2–20.4
  from being blocked by corner cases the large fixture does not even contain.

# Review Notes: Reader Line Numbering Specification

**Reviewed document:** `docs/reader-line-numbering-spec.md`
**Review passes:** v0.1 draft on 2026-07-02 (first pass, below); v0.2 draft on
2026-07-03 (second pass, at the end of this document)
**Reviewer:** Claude Code review pass with user product direction
**Current verdict (v0.2):** Approve for implementation once two spec
clarifications land (N1 label-placement architecture, N2 anchor trust and
injection ordering). All seven first-pass items (R1–R3, S1–S4) were verified
as genuinely incorporated, not just claimed. Remaining findings N3–N7 are
recommendations that can be resolved during implementation.

---

# First Pass: v0.1 Draft (2026-07-02)

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

---

# Second Pass: v0.2 Draft (2026-07-03)

## Disposition Verification

The v0.2 "Review Feedback Disposition" section claims all seven first-pass
items were incorporated. Verified against the spec text — each claim is real:

| Item | Verified in v0.2 |
|---|---|
| R1 parser-worker counting | Counting Architecture: post-sanitize tree, worker-owned, eight-step flow; renderer forbidden from inferring numbers from offsets/indexes/pixels/CSS counters |
| R2 hard-break mechanism | Full policy chosen: parser-emitted segment anchors required; `Range.getClientRects()` counting explicitly disallowed and listed as a failure case |
| R3 enhancement swaps | Placement trigger list includes enhancement completion and font readiness; failure case added; "never store labels inside a subtree that enhancement code owns" |
| S1 stats reconciliation | Masthead "lines" and gutter digit width move to the Line Map total |
| S2 go-to-line | Specified with input validation; tracker adds P20.5 |
| S3 overlaps by construction | Global Rule 9: at most one entry per block id plus anchor id at build time |
| S4 placement tests and perf gate | Test plan items 6 and 14 |

The new Research Basis section is accurate: `data-sourcepos`/remark positions
are source coordinates, browser rects are placement-only, CSS counters cannot
encode these policies. It correctly strengthens rather than reopens the
product decision.

## New Findings

### N1 (required): Resolve the "global gutter layer" ambiguity

The spec says labels render in "one dedicated layer" / "one global gutter
layer." Two architectures satisfy that wording, with very different failure
modes:

- **Detached overlay:** one DOM layer beside the scroll content, every label
  absolutely positioned from measured document offsets. This must re-measure
  and re-place on every scroll, virtualizer remount, and block height change —
  it fights the virtualizer and recreates the geometry-tracking fragility the
  redesign exists to remove.
- **Per-block placement, globally aligned (recommended):** each label lives in
  a `BlockView`-owned wrapper *outside* the enhancement-owned inner content,
  horizontally pinned to the global gutter column via CSS, vertically
  positioned from its anchor's offset within the block. Labels then ride the
  virtualizer for free; scroll costs nothing; only intra-block layout changes
  trigger re-placement.

The generalized current design is the second option, and it is consistent
with every v0.2 requirement (including "never store labels inside a subtree
that enhancement code owns" — the BlockView wrapper is outside that subtree).
The spec should state that "layer" means a *visually* unified gutter column
plus an ownership rule, not a physically detached overlay, and name the
recommended placement model. This is the one remaining ambiguity large enough
to send an implementer down the wrong architecture.

### N2 (required): State the anchor trust and injection ordering

The current `dataSourceStart`/`dataSourceEnd`/`dataSourceLines` attributes are
attached in remark (pre-sanitize) and therefore had to be allow-listed in
`frontend/src/core/sanitize/schema.ts`. Because `rehype-raw` parses
author-supplied HTML, an author can forge those attributes today
(`<p data-source-start="999">` survives sanitization, and the reader prefers
element metadata since P19.12). Display-only, so low severity — but the new
design must not inherit the pattern. The spec's counting flow already implies
the fix (anchors are emitted in step 6, after sanitization in step 3); make it
explicit:

- Reader-line anchor attributes are injected by the parser **after**
  sanitization (the post-sanitize tree is available to plugins ordered after
  `rehype-sanitize` and is what `buildBlocks` serializes).
- The anchor attribute names must **not** be added to the sanitize schema
  allow-list, so any author-supplied copies are stripped before injection.
- Add a test: raw HTML carrying the anchor attribute names cannot create,
  shift, or relabel Line Map entries (extends test plan item 2).

### N3 (recommended): Prefer marker insertion over segment splitting for hard breaks

The allowed approach says "split rendered inline content into hard-break
segments." Splitting is real tree surgery when a hard break sits inside
inline formatting — `<em>first<br>second</em>` requires cloning the `<em>`
across segments, and the same applies to links and nested emphasis. A cheaper
mechanism satisfies every stated requirement: **insert an empty anchor span
immediately after each `<br>`** (a line-start marker). Insertion never
restructures author content, is trivially idempotent, contributes nothing to
copy (empty node), and the marker's position *is* the start of the segment's
first visual row. Counting stays "number of `<br>` descendants + 1" on the
post-sanitize tree, uniform across Markdown hard breaks and raw `<br>`. The
spec need not mandate this, but it should permit it explicitly so the
"split into segments" phrasing doesn't force the harder surgery. Either way,
add `<em>a<br>b</em>` (hard break inside inline formatting) to test plan
item 3.

### N4 (recommended): Trim or defer `textPreview`; define or drop `localRole`

`textPreview` on every Line Map entry duplicates document text into the model
that crosses the worker boundary. On the 10k-line fixture (~thousands of
entries) that is a measurable transfer-payload increase, and P13 explicitly
tracks `transferBytes`. No consumer in the spec needs it yet — go-to-line
takes a number, not a preview. Make it optional/omitted until a UI needs it,
or cap its length. `localRole` appears once in the Line Map shape and is
never defined; define it or drop it.

### N5 (recommended): Unify the two model shapes and the two total names

The Line Map Shape section shows a side table (`entriesByBlockId`) while the
Document Model section shows per-block fields (`Block.readerLines[]`); flow
step 8 permits either. Pick one — `Block.readerLines[]` plus a document-level
count is simpler, and go-to-line can resolve a number to a block by scan or
binary search. Likewise `lineMapTotal` (flow step 7) and
`DocumentModel.readerLineCount` (model section) name the same value; use one
name.

### N6 (recommended): Reword Global Rule 6's phantom exception

"Framed objects count once … unless explicitly covered by a nested-list rule"
implies an exception that does not exist — the List Items With Multiple
Blocks policy *confirms* framed objects count once inside list items. Drop
the "unless" clause to avoid an implementer hunting for the override.

### N7 (recommended): Two small test-plan additions

- **Go-to-line to an unmounted target:** the mapped anchor may be far outside
  the virtualized range; navigation needs the same multi-pass settle the
  heading navigation uses. Test a target deep in the large fixture.
- **Shared copy-exclusion constants:** the copy sanitizer strips decoration
  classes by name (`sanitizedSelectionText` in `App.svelte`); the new label
  class must join that list. Export the class names from one constant shared
  by the renderer, the copy sanitizer, and the tests — this is the same
  shared-constants pattern recommended in
  `docs/code-design-stability-proposal.md` (decoration registry).

## Verdict

Approve v0.2 for implementation once N1 and N2 land in the spec text — both
are one-paragraph edits that close the last places where an implementer could
faithfully follow the spec and still rebuild a fragile design. N3–N7 are
recommendations: N3 meaningfully de-risks P20.2/P20.3 and is worth deciding
up front; N4–N7 can be resolved during implementation without spec churn.

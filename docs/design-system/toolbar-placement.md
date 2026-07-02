# Toolbar Placement Decision

**Question:** Is clustering every toolbar action on the far right the best UX, or
is there a better placement? (User request, 2026-06-07.)

## Cross-platform guidance

- **Apple HIG — Toolbars (macOS):** A toolbar runs across the top of a window
  below the title bar. Place the controls people use most often, ordered by
  importance, and group related controls. Navigation and document-level
  controls sit toward the leading (left) edge near the content origin; search
  and view options conventionally sit at the trailing (right) edge. Avoid one
  undifferentiated pile of buttons.
- **Apple HIG — macOS window anatomy:** The window/traffic-light controls own
  the top-leading corner; app controls should not crowd them.
- **Windows Fluent — Command bar:** Primary commands are left-aligned; secondary
  and overflow commands collapse to the right. Reading order (LTR) puts the
  highest-frequency actions first/left.
- **GNOME HIG — Header bar:** Structural/primary actions (back, open, add) go in
  the *start* (left) area; secondary actions (search, view options, menu) go in
  the *end* (right) area. The title stays centered.
- **Frameless reference apps (VS Code, Obsidian, Zed):** Left = structural and
  navigation (sidebar toggle, back/forward), center = title/breadcrumb,
  right = view/search/settings/overflow.

## Finding

A single far-right cluster fights all four guidelines. It pushes navigation
(back/forward/reload) — which users reach for most while reading — to the
farthest, slowest corner, and it mixes structural actions with view toggles so
the group reads as undifferentiated.

## Decision

Split the toolbar into two semantic groups instead of one trailing cluster:

- **Leading (left), `aria-label="Navigation"`:** outline toggle, open, new tab,
  back, forward, reload — structural and document-lifecycle controls, near the
  brand/title and the outline rail they affect.
- **Trailing (right), `aria-label="View and tools"`:** find, reader appearance,
  metadata toggle, command palette, theme — view and meta controls.

The brand mark, document title, and watch status remain at the leading edge.
This matches Apple HIG, Fluent, GNOME HIG, and the frameless-app consensus, and
pairs cleanly with the custom title bar (Item 5) where the same leading/trailing
split spans the window chrome.

Title centering is intentionally deferred to the custom-title-bar work so this
change stays a low-risk regrouping.

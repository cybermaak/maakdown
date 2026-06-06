# UX Mock And Design-System Review

**Reviewed:** 2026-06-06

## Outcome

The mocks are consistent with the reader-first roadmap and are suitable as the
composition and interaction reference for P8-P11. The design system is suitable
as a token and component-contract baseline, but its React implementation and
runtime loading model are prototype-only.

## Decisions Incorporated

- Add P8 as the immediate design-system foundation phase.
- Shift desktop workspace, reading productivity, and editorial completion to
  P9, P10, and P11.
- Use a compact toolbar plus separate 38px tab strip.
- Show active document identity and watch status in the toolbar.
- Show watching and missing states in tabs.
- Use a branded outline rail with a provisional square `M` mark.
- Render frontmatter status with semantic badges and tags as chips.
- Use a unified palette for commands, tabs, recents, and headings.
- Preserve per-tab reading positions.
- Keep find available in focus mode alongside an explicit exit control.
- Add code language/copy chrome and captioned, zoomable Mermaid figures.
- Use the mock empty state for drop, open, recents, timestamps, and missing files.

## Production Adaptation

- Recreate components in Svelte; do not copy React state or inline styles.
- Continue using real parsed Markdown and Mermaid instead of prototype block
  data and custom diagram SVGs.
- Install a pinned local `lucide-svelte` package; do not load icons from a CDN.
- Implement shared semantic tokens and primitives before feature-specific UI.
- Keep platform shortcuts rendered from platform-aware command metadata rather
  than hard-coding macOS glyphs everywhere.

## Risks And Follow-Up

- Exported font files are duplicated across nominal weights. Validate licenses
  and obtain genuine weight-specific assets before P8 font integration.
- The square `M` mark is provisional and must remain replaceable.
- The mock does not implement print, navigation history, panel resizing,
  responsive drawers, session persistence, or real multi-path file watching;
  the implementation plan remains authoritative for those behaviors.
- The command palette and dialogs need production focus trapping, restoration,
  screen-reader semantics, and reduced-motion behavior.
- The mock's fixed 280px/260px rails are desktop defaults, not hard constraints
  for narrow windows.

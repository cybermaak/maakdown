---
title: Table tools fixture
subtitle: Sorting, filtering, wrapping, and unsupported-table checks
status: evaluation
tags:
  - markdown
  - table-tools
  - regression
generated: 2026-07-02
---

# Table Tools

Use this fixture to verify table filtering, column sorting, constrained table
width, and suppression behavior for unsupported tables. The table interactions
are ephemeral reader state; they must not edit this Markdown file.

## Interactive table

| Name | Score | Date | Notes |
|---|---:|---|---|
| Beta | 10 | 2026-06-02 | Stable workspace behavior |
| Alpha | 20 | 2026-06-03 | A very long operational note that should wrap inside the selected reader measure instead of forcing the table beyond the prose column width. |
| Gamma | 3 | 2026-06-01 | Needs follow up |

Try these checks:

- Filter the Name column for `gamma`; only Gamma should remain.
- Sort Score ascending; Gamma should move to the first row.
- Sort Score descending; Alpha should move to the first row.
- Clear sorting; the original Beta, Alpha, Gamma order should return.

## Headerless table

<table>
  <tbody>
    <tr><td>North</td><td>Plain body row</td></tr>
    <tr><td>South</td><td>No header cells</td></tr>
  </tbody>
</table>

## Spanning table

<table>
  <thead>
    <tr><th colspan="2">Merged header</th><th>Status</th></tr>
  </thead>
  <tbody>
    <tr><td>Alpha</td><td>One</td><td>Plain rendering expected</td></tr>
    <tr><td>Beta</td><td>Two</td><td>No sort or filter controls expected</td></tr>
  </tbody>
</table>

## Release readiness matrix

| Capability | Platform | Owner | Status | Priority | Score | Last verified | Notes |
|---|---|---|---|---:|---:|---|---|
| Reader startup | macOS | Frontend | Stable | 1 | 98 | 2026-07-01 | Cold start stays readable while enhancements load progressively. |
| Reader startup | Windows | Frontend | Stable | 1 | 94 | 2026-07-01 | WebView2 follows the same open-to-readable-text path. |
| Reader startup | Linux | Frontend | Watching | 2 | 91 | 2026-07-01 | WebKitGTK is expected to match the same reader contract. |
| Mermaid diagrams | macOS | Rendering | Stable | 1 | 96 | 2026-07-02 | Diagram colors should follow semantic reader tokens. |
| Mermaid diagrams | Windows | Rendering | Stable | 1 | 92 | 2026-07-02 | Wide flowcharts keep readable intrinsic width without page-level overflow. |
| Mermaid diagrams | Linux | Rendering | Needs review | 2 | 86 | 2026-07-02 | Native screenshot pass should catch font or layout drift. |
| Table filtering | macOS | Reader tools | Stable | 1 | 97 | 2026-07-02 | Header filters are column-targeted and expose active chips. |
| Table filtering | Windows | Reader tools | Stable | 1 | 93 | 2026-07-02 | Row counts and empty states should remain keyboard reachable. |
| Table filtering | Linux | Reader tools | Watching | 2 | 88 | 2026-07-02 | Manual native validation remains release-blocking. |
| Print snapshot | macOS | Release | Stable | 2 | 90 | 2026-06-30 | Complete-document rendering must restore virtualization afterward. |
| File association | Windows | Platform | Stable | 2 | 95 | 2026-06-29 | Uses the dedicated Markdown document icon. |
| Drag and drop | Linux | Platform | Needs review | 3 | 82 | 2026-06-20 | Validate real WebKitGTK file-drop handling before release. |

Suggested manual checks:

- Filter Status for `stable`, then Owner for `rendering`.
- Sort Score ascending and descending.
- Sort Last verified to check date-like text ordering.
- Clear filters and confirm all twelve rows return in source order.

## Wide notes table

| Decision | Rationale | Consequence |
|---|---|---|
| Keep table changes ephemeral | Maakdown is a reader and should not rewrite local Markdown when a user sorts or filters a table. | Sort and filter state may survive virtualizer remounts in the current session, but the source file remains unchanged. |
| Constrain tables to reader measure when enabled | Dense technical documents are easier to scan when tables honor the same measure as prose instead of forcing the entire page wider. | Columns are auto-sized and long cell content wraps rather than exposing manual resize handles. |
| Suppress tools for unsuitable tables | Headerless, spanning, empty, or very large tables can make filter and sort controls misleading or expensive. | Those tables render as plain sanitized tables with no toolbar controls. |

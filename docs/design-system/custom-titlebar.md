# Custom Title Bar Decision

**Request (2026-06-07):** Remove the OS title bar and use one consistent title
bar across macOS, Windows, and Linux.

## Approach

- **Frameless window.** `options.App.Frameless = true` in `main.go` removes the
  native title bar and window buttons on every platform, so Maakdown owns the
  full window chrome.
- **The existing toolbar becomes the title bar.** Rather than adding a second
  row, the workspace toolbar doubles as the draggable title bar. The toolbar is
  the drag handle (`--wails-draggable: drag`); the navigation group, view group,
  and window controls opt out (`--wails-draggable: no-drag`) so their clicks
  land. The brand/title and the empty stretch are draggable.
- **Consistent window controls.** A `WindowControls` component renders
  minimise / maximise / close at the trailing edge on all platforms (the
  Windows/Linux convention), backed by new Go methods `WindowMinimise`,
  `WindowToggleMaximise`, `WindowIsMaximised`, and the existing `Quit` for close.
- **Desktop-only.** Controls and drag behavior activate only when the Wails
  runtime is present (`isDesktopRuntime()`); the browser dev/UAT bundles keep
  the ordinary chrome, so the UAT suite is unaffected.

## Trade-offs

- A single consistent control cluster on the right is intentional per the
  request. It diverges from macOS's native top-left traffic lights; that is the
  accepted cost of one cross-platform bar.
- Frameless windows lose some native affordances (double-click-title to zoom,
  edge snap hints) that vary by OS. Maximise is provided via the control button.

## Verification

- `go build ./...`, `wails build` (macOS) succeed with the frameless window.
- `npm run check`, `npm run build`, and the UAT suite pass.
- **Platform-owner acceptance (pending):** visually confirm on Windows and Linux
  that controls render correctly, the drag region moves the window, and
  maximise/restore and close behave natively. This needs the per-OS runners and
  is tracked with the other cross-platform acceptance work (P11.11).

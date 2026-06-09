# macOS Markdown File Association — Design

**Date:** 2026-06-09
**Status:** Approved (design); pending spec review
**Scope:** macOS only. Windows and Linux are deferred to a follow-up spec.

## Goal

Let Maakdown register as an application that can open `.md` (Markdown) files,
**without** taking over the user's existing default, and give the user an
explicit in-app control to make Maakdown the default Markdown opener. When the OS
hands Maakdown a file (double-click, "Open With", `open file.md`), it opens in a
tab in the running window.

## Non-goals

- No silent/automatic takeover of the `.md` default. Becoming default is always
  user-initiated.
- Windows and Linux association (separate follow-up spec). The IPC surface and
  the Settings UI are written platform-agnostically so those slot in later.
- No new document UTI ownership beyond what is needed to be a capable opener.

## Components

### 1. Capability declaration (`build/darwin/Info.plist`)

Add to the bundle Info.plist so Launch Services lists Maakdown under **Open
With** for Markdown, while explicitly not claiming the default:

- `CFBundleDocumentTypes`: one entry — role **Viewer**,
  `LSHandlerRank = Alternate`, `LSItemContentTypes =
  [net.daringfireball.markdown]`, a `CFBundleTypeName` of "Markdown Document".
- `UTImportedTypeDeclarations`: import `net.daringfireball.markdown`,
  conforming to `public.plain-text`, with
  `public.filename-extension = [md, markdown, mdown, mkd, mdwn]`.

`LSHandlerRank = Alternate` is the key: Maakdown is a capable opener, not the
declared owner, so installing/running it does not change the user's default.
Launch Services registers the bundle automatically when it is run or moved to
`/Applications`.

### 2. Open a file the OS hands us → new tab

- Set `Mac.OnFileOpen(path string)` in `wails.Run` options. It fires for
  double-click / Open With / Apple Events on the running instance.
- The handler opens the path in a tab via the existing open path (dedup +
  activate-if-already-open). Bridged to the frontend with an `EventsEmit`
  ("open-file") that the frontend subscribes to (mirrors the existing
  `files-dropped` pattern) and routes through `openPath`.
- Add `SingleInstanceLock` (options) so a second launch with a file routes the
  path to the already-running instance instead of spawning a new one. The
  second-instance callback opens the path(s) from its args.
- At startup, also read a file path from `os.Args` (covers `Maakdown file.md`
  and lays groundwork for Windows/Linux which pass the path as an argument).
- Guard: only Markdown-looking paths are opened
  (`.md/.markdown/.mdown/.mkd/.mdwn`), reusing the existing extension check.
- **Cold-start buffering:** a file passed at launch fires `OnFileOpen`/args
  before the frontend has subscribed. The `App` stores a pending path; the
  frontend, on startup, calls `ConsumePendingOpenFile()` (drains and returns it)
  after restoring its session, and also subscribes to the `open-file` event for
  files opened while already running. This avoids a lost first open and races.

### 3. "Set as default" (LaunchServices, `//go:build darwin` cgo)

A new darwin-only Go file wrapping CoreServices/LaunchServices:

- `IsDefaultMarkdownHandler() bool` — resolve the UTI for the `md` filename
  extension at runtime (`UTTypeCreatePreferredIdentifierForTag`), then compare
  `LSCopyDefaultRoleHandlerForContentType(uti, kLSRolesViewer|All)` to this
  bundle's identifier (`com.maak.maakdown`).
- `SetDefaultMarkdownHandler() error` —
  `LSSetDefaultRoleHandlerForContentType(uti, kLSRolesAll, bundleID)`. This is
  silent (no system confirmation dialog), so the explicit in-app button click is
  the user's consent.

Resolving the UTI dynamically (instead of hardcoding
`net.daringfireball.markdown`) makes "set default" robust to whatever the system
currently maps `.md` to.

A non-darwin stub file returns `false` / a "not supported on this platform"
error so the rest of the app compiles and behaves on every OS.

### 4. App methods + IPC

- `App.IsDefaultMarkdownHandler() bool` and `App.SetDefaultMarkdownHandler()
  error` (delegating to the platform functions above), bound to the frontend.
- `frontend/src/ipc/index.ts`: `isDefaultMarkdownHandler()` and
  `setDefaultMarkdownHandler()` wrappers; the UAT mock returns deterministic
  values.

### 5. In-app control (Reader Settings popover)

Add a row to the existing settings popover (`ReaderSettings.svelte`), shown only
in the desktop runtime (`isDesktopRuntime()`):

- On open, query `isDefaultMarkdownHandler()`.
- If default: a quiet line — "Maakdown opens Markdown files by default."
- If not: a **"Set as default for Markdown"** button. Clicking calls
  `setDefaultMarkdownHandler()`, then re-queries and updates the line. On error,
  show a brief inline message.

## Data flow

```
OS (double-click / Open With / open file.md)
  -> macOS: Mac.OnFileOpen(path)  |  other: os.Args / SingleInstanceLock args
  -> App emits "open-file" (path)
  -> frontend onOpenFile -> openPath(path)  (dedup + activate)

Settings popover -> isDefaultMarkdownHandler() -> show status
"Set as default" -> setDefaultMarkdownHandler() -> re-query -> update status
```

## Error handling

- `SetDefaultMarkdownHandler` failure (non-zero `OSStatus`) surfaces as an inline
  error in the settings row; no crash.
- Non-existent / non-Markdown path from OnFileOpen or args is ignored (with a
  logged warning), never opens a blank/garbage tab.
- Non-darwin builds compile via the stub; the settings row is hidden when not
  default-capable.

## Testing / verification

- Build the macOS app (`wails build`) and confirm it compiles with the cgo file.
- Manual macOS acceptance (the agent can do this on the user's mac):
  1. After build/run, Finder → Get Info / right-click → **Open With** lists
     Maakdown for a `.md` file; the existing default is unchanged.
  2. Double-clicking a `.md` (or `open -a Maakdown file.md`) opens it in a tab;
     doing it again with the app running adds/activates a tab (no second
     window).
  3. Settings shows "Set as default"; clicking it makes Maakdown the default
     (verify via Finder Get Info), and the row flips to the default state.
- `npm run check` and the UAT suite stay green (IPC mock covers the new calls;
  the settings row is hidden in the browser/UAT runtime).

## Deferred (separate spec)

- **Linux:** install a `.desktop` file with `MimeType=text/markdown` to
  `~/.local/share/applications` at runtime; "set default" via `xdg-mime default`.
- **Windows:** register an HKCU ProgId + `OpenWithProgIds` for `.md` at runtime;
  "set default" via `SHOpenWithDialog` (Win10+ cannot set default silently).
  The `isDefault`/`setDefault` IPC and the Settings UI already exist; only the
  platform implementations are added.

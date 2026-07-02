# UAT Test Suite — Design

**Date:** 2026-06-06
**Source plan:** `docs/uat-test-plan.md`
**Status:** Approved

## Goal

Implement the UI-driven UAT regression suite described in `docs/uat-test-plan.md`
using Playwright Test against the real Svelte application with a deterministic
mocked Wails boundary. Executable coverage is limited to implemented (`Done`)
requirements; `Planned` requirements live in a traceability matrix only.

## Scope

Executable journeys (cover `Done` phases P0–P9):

- **UAT-01** Open and read a technical document.
- **UAT-02** Theme and reader consistency.
- **UAT-04** Desktop workspace lifecycle.

Traceability-only (depend on `Todo` P10/P11 features — search nav, command
palette, reader appearance, print, accessibility gate):

- **UAT-03**, **UAT-05**, **UAT-06**, **UAT-07** documented as `Planned`.

## Mock Wails boundary

The production app imports its Wails surface only through `frontend/src/ipc`
(`index.ts`). Two modules import it: `App.svelte` (`./ipc`) and
`DocumentView.svelte` (`../ipc`).

A **UAT entry mode** runs the app via `vite --mode uat`. In that mode only,
`vite.config.ts` aliases the `ipc` specifier to `frontend/src/ipc/uat-mock.ts`.
The mock implements the same public functions and reads/writes a deterministic
store on `window.__uat`:

- `state.documents`: path → `{ contents, trustedRoot }`.
- `state.config`, `state.session`, `state.vaultIndex`.
- `state.pickerQueue`: paths the native picker returns in order.
- Trackers: `externalLinks`, `printCalls`, `windowTitle`, `savedSessions`,
  `savedConfigs`, `watched`, `quit`.
- `emit(event, payload)` drives `file-changed`, `files-dropped`, `app-command`.

Tests seed `window.__uat.state` via `page.addInitScript` before navigation and
drive events with `page.evaluate`. Production IPC is unchanged; the mock is only
reachable through the `uat` build mode. Each test gets an isolated page/context,
so mock state never leaks between tests. Local images resolve through the
existing dev fixture server (`/__maakdown_fixture/...`).

## Harness

- `frontend/playwright.uat.config.ts`: headless Chromium, `webServer` runs
  `vite --mode uat`, base URL `http://127.0.0.1:5173`, `forbidOnly` in CI, one
  retry in CI only, two workers, 60s per-test timeout, 10-minute global timeout,
  JUnit + HTML reporters, trace/screenshot/snapshot on failure only.
- Tests fail on unexpected page errors and console errors (shared fixture).
- Selectors use roles, accessible names, and visible text; `data-uat` only when
  no semantic selector expresses the outcome.

## Files

```
frontend/
  src/ipc/uat-mock.ts            # mock IPC, window.__uat store
  e2e/
    support/uat.ts               # test fixture: seeding, console-error guard, helpers
    uat-01-read-document.spec.ts
    uat-02-theme-consistency.spec.ts
    uat-04-workspace-lifecycle.spec.ts
  playwright.uat.config.ts
docs/uat-traceability.md         # requirements matrix (Executable / Planned)
```

## Commands and CI

- npm scripts: `uat`, `uat:headed`, `uat:report`.
- CI: a `uat` job after the frontend build on pushes to `main`, installs
  Playwright Chromium with Linux deps, runs `npm run uat`, uploads failure
  artifacts.
- `scripts/release-check.sh` gains `npm run uat` so a UAT failure blocks release.

## Out of scope

- No pixel screenshot baselines.
- No skipped or `expected-failure` tests committed.
- No changes to production IPC or Go services.

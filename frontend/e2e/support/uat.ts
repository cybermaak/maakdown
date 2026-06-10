import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, '../../../fixtures');

export function readFixture(name: string): string {
  return readFileSync(resolve(fixturesDir, name), 'utf8');
}

export interface SeedDoc {
  /** Canonical path the app will use as the tab/document identity. */
  path: string;
  /** Fixture file under `fixtures/` to use as contents. */
  fixture?: string;
  /** Inline contents (overrides `fixture`). */
  contents?: string;
  trustedRoot?: string;
}

export interface SeedSessionTab {
  path: string;
  position?: { scrollTop?: number; activeHeadingId?: string };
}

export interface SeedSession {
  tabs: SeedSessionTab[];
  activePath?: string;
  recents?: Array<{ path: string; displayName: string; lastOpenedAt: string }>;
}

export interface SeedOptions {
  documents?: SeedDoc[];
  pickerQueue?: string[];
  session?: SeedSession;
  config?: Record<string, unknown>;
  vaultIndex?: { version: string; notes: Record<string, string> };
  pendingOpenFiles?: string[];
  markdownHandlerSupported?: boolean;
  defaultMarkdownHandler?: boolean;
}

/**
 * Seed the deterministic mock IPC store before the app loads. Re-applied on
 * every navigation (including reloads), so "filesystem" data is always present.
 */
export async function seedApp(page: Page, options: SeedOptions = {}): Promise<void> {
  const documents: Record<string, { contents: string; trustedRoot: string }> = {};
  for (const doc of options.documents ?? []) {
    documents[doc.path] = {
      contents: doc.contents ?? (doc.fixture ? readFixture(doc.fixture) : ''),
      trustedRoot: doc.trustedRoot ?? ''
    };
  }
  const state = {
    documents,
    pickerQueue: options.pickerQueue ?? [],
    session: options.session ?? { tabs: [], recents: [] },
    config: options.config ?? {},
    vaultIndex: options.vaultIndex ?? { version: 'uat-vault-0', notes: {} },
    pendingOpenFiles: options.pendingOpenFiles ?? [],
    markdownHandlerSupported: options.markdownHandlerSupported ?? false,
    defaultMarkdownHandler: options.defaultMarkdownHandler ?? false
  };
  await page.addInitScript((seed) => {
    (window as unknown as { __uat: { state: unknown } }).__uat = { state: seed };
  }, state);
}

/** Navigate to the UAT app and wait for the workspace shell to mount. */
export async function gotoApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
}

/** Emit a mocked native event (file-changed, files-dropped, app-command). */
export async function emitNative(page: Page, event: string, payload: unknown): Promise<void> {
  await page.evaluate(
    ({ event, payload }) => (window as unknown as { __uat: { emit(e: string, p: unknown): void } }).__uat.emit(event, payload),
    { event, payload }
  );
}

/** Read a value from the mock state for assertions. */
export async function readMockState<T>(page: Page, selector: (state: Record<string, unknown>) => T): Promise<T> {
  return page.evaluate(
    (fnText) => {
      const state = (window as unknown as { __uat: { state: Record<string, unknown> } }).__uat.state;
      // eslint-disable-next-line no-new-func
      return new Function('state', `return (${fnText})(state);`)(state) as unknown;
    },
    selector.toString()
  ) as Promise<T>;
}

/** Wait for the active document reader surface to render. */
export async function expectReaderReady(page: Page): Promise<void> {
  // Large fixtures parse in a worker; slower runners (notably Windows CI) can
  // exceed the default 5s, so wait generously for the reader to mount.
  await expect(page.getByRole('document', { name: 'Markdown document' })).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.locator('.doc-block').count(), { timeout: 30_000 }).toBeGreaterThan(0);
}

/**
 * Auto-applied guard: any unexpected console error or page error fails the test.
 * Filters a small set of environment noise (e.g. favicon, font 404s in headless).
 */
const benignError = /favicon\.ico/i;

export const test = base.extend<{ errorGuard: void }>({
  errorGuard: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error' && !benignError.test(message.text())) {
          errors.push(`console.error: ${message.text()}`);
        }
      });
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      await use();
      expect(errors, `unexpected page or console errors:\n${errors.join('\n')}`).toEqual([]);
    },
    { auto: true }
  ]
});

export { expect };

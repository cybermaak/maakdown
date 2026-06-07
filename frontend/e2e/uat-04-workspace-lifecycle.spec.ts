import { emitNative, expect, expectReaderReady, gotoApp, readMockState, seedApp, test } from './support/uat';

const ARCH = '/uat/architecture.md';
const DOSSIER = '/uat/dossier.md';
const DROPPED = '/uat/dropped.md';

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

const baseDocuments = [
  { path: ARCH, fixture: 'uat-technical-document.md', trustedRoot: '/uat' },
  { path: DOSSIER, fixture: 'small-readme.md', trustedRoot: '/uat' },
  { path: DROPPED, contents: '# Dropped Document\n\nDropped body text.', trustedRoot: '/uat' }
];

test.describe('UAT-04 Desktop workspace lifecycle', () => {
  test('opens, deduplicates, isolates, reopens, and accepts dropped documents', async ({ page }) => {
    await seedApp(page, { documents: baseDocuments, pickerQueue: [ARCH, DOSSIER] });
    await gotoApp(page);

    // Open two documents through the mocked native picker (Open always opens a
    // new tab; the redundant "New tab" button was removed).
    const openButton = page.locator('.workspace-toolbar').getByRole('button', { name: 'Open document' });
    await openButton.click();
    await expectReaderReady(page);
    await openButton.click();
    await expect(page.getByRole('tab')).toHaveCount(2);
    await expect(page.getByRole('tab', { name: 'dossier.md' })).toHaveAttribute('aria-selected', 'true');
    await expectReaderReady(page);

    // Opening an already-open canonical path activates the existing tab (no duplicate)
    await page.evaluate((path) => {
      (window as unknown as { __uat: { state: { pickerQueue: string[] } } }).__uat.state.pickerQueue.push(path);
    }, ARCH);
    await page.locator('.workspace-toolbar').getByRole('button', { name: 'Open document' }).click();
    await expect(page.getByRole('tab')).toHaveCount(2);
    await expect(page.getByRole('tab', { name: 'architecture.md' })).toHaveAttribute('aria-selected', 'true');

    // Switching tabs keeps only the active document mounted
    await page.getByRole('tab', { name: 'dossier.md' }).click();
    await expect(page.getByRole('tab', { name: 'dossier.md' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('document', { name: 'Markdown document' })).toHaveCount(1);
    await expectReaderReady(page);

    // Close and reopen a tab
    await page.keyboard.press(`${mod}+w`);
    await expect(page.getByRole('tab')).toHaveCount(1);
    await expect(page.getByRole('tab', { name: 'dossier.md' })).toHaveCount(0);
    await page.keyboard.press(`${mod}+Shift+T`);
    await expect(page.getByRole('tab', { name: 'dossier.md' })).toHaveCount(1);

    // Dropping another Markdown file opens it as a new active tab
    await emitNative(page, 'files-dropped', [DROPPED]);
    await expect(page.getByRole('tab', { name: 'dropped.md' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Dropped Document' })).toBeVisible();
  });

  test('preserves reading position across an external file change', async ({ page }) => {
    await seedApp(page, {
      documents: baseDocuments,
      session: { tabs: [{ path: DOSSIER }], activePath: DOSSIER }
    });
    await gotoApp(page);
    await expectReaderReady(page);

    const surface = page.getByRole('document', { name: 'Markdown document' });
    await surface.evaluate((el) => (el.scrollTop = 800));
    const before = await surface.evaluate((el) => el.scrollTop);
    expect(before).toBeGreaterThan(0);

    // External change triggers a reload that keeps the reading position
    await emitNative(page, 'file-changed', DOSSIER);
    await expect(page.getByText('Watching', { exact: true })).toBeVisible();
    await expect
      .poll(() => surface.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(before - 100);
  });

  test('restores tab order, active tab, position, recents, and settings on restart', async ({ page }) => {
    await seedApp(page, {
      documents: baseDocuments,
      config: { frontmatterDisplay: 'hidden' },
      session: {
        tabs: [
          { path: ARCH, position: { scrollTop: 600 } },
          { path: DOSSIER, position: { scrollTop: 0 } }
        ],
        activePath: DOSSIER,
        recents: [
          { path: ARCH, displayName: 'architecture.md', lastOpenedAt: '2026-06-06T10:00:00.000Z' },
          { path: DOSSIER, displayName: 'dossier.md', lastOpenedAt: '2026-06-06T09:00:00.000Z' }
        ]
      }
    });
    await gotoApp(page);
    await expectReaderReady(page);

    // Tab order and active tab restored
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(0)).toHaveAccessibleName('architecture.md');
    await expect(tabs.nth(1)).toHaveAccessibleName('dossier.md');
    await expect(page.getByRole('tab', { name: 'dossier.md' })).toHaveAttribute('aria-selected', 'true');

    // Restored setting: metadata panel is hidden
    await expect(page.getByRole('region', { name: 'Frontmatter metadata' })).toHaveCount(0);

    // Per-document position restored when the tab is activated
    await page.getByRole('tab', { name: 'architecture.md' }).click();
    await expect
      .poll(() => page.getByRole('document', { name: 'Markdown document' }).evaluate((el) => el.scrollTop))
      .toBeGreaterThan(300);

    // Recents restored: closing all tabs reveals the empty state with recent documents
    await page.getByRole('tab', { name: 'architecture.md' }).click();
    await page.keyboard.press(`${mod}+w`);
    await page.keyboard.press(`${mod}+w`);
    const emptyState = page.getByText('architecture.md');
    await expect(emptyState.first()).toBeVisible();

    // Session was persisted through the mocked durable boundary
    const savedCount = await readMockState<number>(page, (state) => (state.savedSessions as unknown[]).length);
    expect(savedCount).toBeGreaterThan(0);
  });

  test('relocates a missing restored document in the same tab', async ({ page }) => {
    const missing = '/uat/moved-away.md';
    await seedApp(page, {
      documents: baseDocuments,
      pickerQueue: [ARCH],
      session: {
        tabs: [{ path: missing, position: { scrollTop: 420, activeHeadingId: 'rendering-architecture' } }],
        activePath: missing
      }
    });
    await gotoApp(page);

    await expect(page.getByRole('heading', { name: 'Document not found' })).toBeVisible();
    await page.getByRole('button', { name: 'Locate file' }).click();

    await expect(page.getByRole('tab')).toHaveCount(1);
    await expect(page.getByRole('tab', { name: 'architecture.md' })).toHaveAttribute('aria-selected', 'true');
    await expectReaderReady(page);
    const watched = await readMockState<string[]>(page, (state) => state.watched as string[]);
    expect(watched).toEqual([ARCH]);
  });
});

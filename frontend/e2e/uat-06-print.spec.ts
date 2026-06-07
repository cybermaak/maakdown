import { expect, expectReaderReady, gotoApp, readMockState, seedApp, test } from './support/uat';

const DOC_PATH = '/uat/dossier.md';
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

test('UAT-06 prints a fully mounted document and restores virtualization', async ({ page }) => {
  await seedApp(page, {
    documents: [{ path: DOC_PATH, fixture: 'maakdown-reader-evaluation.md', trustedRoot: '/uat' }],
    session: { tabs: [{ path: DOC_PATH }], activePath: DOC_PATH }
  });
  // A short viewport guarantees the virtualized slice is smaller than the full
  // document, so print expansion stays observable regardless of column width.
  await page.setViewportSize({ width: 1024, height: 400 });
  await gotoApp(page);
  await expectReaderReady(page);
  const before = await page.locator('.doc-block').count();

  await page.keyboard.press(`${mod}+p`);
  await expect.poll(() => readMockState(page, (state) => state.printCalls as number), { timeout: 15_000 }).toBe(1);
  const snapshot = await readMockState<Array<{ blocks: number; enhanced: number }>>(page, (state) => state.printSnapshots as Array<{ blocks: number; enhanced: number }>);
  expect(snapshot[0].blocks).toBeGreaterThan(before);
  expect(snapshot[0].enhanced).toBeGreaterThan(0);
  await expect(page.getByRole('status').filter({ hasText: /Preparing complete document/ })).toBeHidden();
  expect(await page.locator('.doc-block').count()).toBeLessThanOrEqual(100);
});

test('UAT-06 cancellation avoids the system print flow', async ({ page }) => {
  await seedApp(page, {
    documents: [{ path: DOC_PATH, fixture: 'maakdown-reader-evaluation.md', trustedRoot: '/uat' }],
    session: { tabs: [{ path: DOC_PATH }], activePath: DOC_PATH }
  });
  await gotoApp(page);
  await expectReaderReady(page);
  await page.keyboard.press(`${mod}+p`);
  await page.getByRole('button', { name: 'Cancel' }).dispatchEvent('click');
  await expect.poll(() => readMockState(page, (state) => state.printCalls as number)).toBe(0);
  await expect(page.getByRole('status').filter({ hasText: /Preparing complete document/ })).toBeHidden();
});

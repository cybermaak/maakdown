import { emitNative, expect, expectReaderReady, gotoApp, seedApp, test } from './support/uat';

const DOC = '/uat/technical.md';
const HANDED = '/uat/handed.md';

test.describe('UAT-09 OS file association', () => {
  test('settings offers "Set as default" and reflects the change', async ({ page }) => {
    await seedApp(page, {
      documents: [{ path: DOC, fixture: 'uat-technical-document.md', trustedRoot: '/uat' }],
      session: { tabs: [{ path: DOC }], activePath: DOC },
      markdownHandlerSupported: true
    });
    await gotoApp(page);
    await expectReaderReady(page);

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const setDefault = page.getByRole('button', { name: 'Set as default for Markdown' });
    await expect(setDefault).toBeVisible();
    await setDefault.click();
    await expect(page.getByText('Maakdown opens Markdown files by default.')).toBeVisible();
  });

  test('Windows opens the system chooser and rechecks on focus return', async ({ page }) => {
    await seedApp(page, {
      documents: [{ path: DOC, fixture: 'uat-technical-document.md', trustedRoot: '/uat' }],
      session: { tabs: [{ path: DOC }], activePath: DOC },
      markdownHandlerSupported: true,
      windowsPlatform: true
    });
    await gotoApp(page);
    await expectReaderReady(page);

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const chooseDefault = page.getByRole('button', { name: 'Choose default app...' });
    await expect(chooseDefault).toBeVisible();
    await chooseDefault.click();
    await expect.poll(() => page.evaluate(() => window.__uat.state.defaultMarkdownHandlerRequests)).toBe(1);
    await expect(page.getByText('The system did not accept the change.')).toHaveCount(0);

    await page.evaluate(() => {
      window.__uat.state.defaultMarkdownHandler = true;
      window.dispatchEvent(new Event('focus'));
    });
    await expect(page.getByText('Maakdown opens Markdown files by default.')).toBeVisible();
  });

  test('hides the association row when the platform does not support it', async ({ page }) => {
    await seedApp(page, {
      documents: [{ path: DOC, fixture: 'uat-technical-document.md', trustedRoot: '/uat' }],
      session: { tabs: [{ path: DOC }], activePath: DOC }
    });
    await gotoApp(page);
    await expectReaderReady(page);

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('File association')).toHaveCount(0);
  });

  test('opens an OS-handed file in a new tab while running', async ({ page }) => {
    await seedApp(page, {
      documents: [
        { path: DOC, fixture: 'uat-technical-document.md', trustedRoot: '/uat' },
        { path: HANDED, contents: '# Handed Document\n\nOpened by the OS.', trustedRoot: '/uat' }
      ],
      session: { tabs: [{ path: DOC }], activePath: DOC }
    });
    await gotoApp(page);
    await expectReaderReady(page);

    await emitNative(page, 'open-file', HANDED);
    await expect(page.getByRole('tab', { name: 'handed.md' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { level: 1, name: 'Handed Document' })).toBeVisible();
  });

  test('opens files queued before the frontend was ready (cold start)', async ({ page }) => {
    await seedApp(page, {
      documents: [
        { path: DOC, fixture: 'uat-technical-document.md', trustedRoot: '/uat' },
        { path: HANDED, contents: '# Handed Document\n\nOpened at launch.', trustedRoot: '/uat' }
      ],
      session: { tabs: [{ path: DOC }], activePath: DOC },
      pendingOpenFiles: [HANDED]
    });
    await gotoApp(page);

    // Both the restored session tab and the OS-handed file are open; the handed
    // file is active (it was opened last, after restore).
    await expect(page.getByRole('tab')).toHaveCount(2);
    await expect(page.getByRole('tab', { name: 'handed.md' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { level: 1, name: 'Handed Document' })).toBeVisible();
  });
});

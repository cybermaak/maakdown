import { expect, expectReaderReady, gotoApp, seedApp, test } from './support/uat';

const DOC_PATH = '/uat/technical.md';

test.describe('UAT-08 Custom context menus', () => {
  test.beforeEach(async ({ page }) => {
    await seedApp(page, {
      documents: [{ path: DOC_PATH, fixture: 'uat-technical-document.md', trustedRoot: '/uat' }],
      session: { tabs: [{ path: DOC_PATH }], activePath: DOC_PATH }
    });
    await gotoApp(page);
    await expectReaderReady(page);
  });

  test('tab right-click shows a consistent custom menu and dismisses on Escape', async ({ page }) => {
    await page.getByRole('tab').first().click({ button: 'right' });
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Close tab' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Close other tabs' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  });

  test('reader content right-click exposes document actions', async ({ page }) => {
    await page.locator('.document-scroll .doc-block p').first().click({ button: 'right', position: { x: 2, y: 2 } });
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Find in document' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Reload' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Print' })).toBeVisible();
  });

  test('outline heading right-click offers link and text copy', async ({ page }) => {
    await page.locator('.toc [data-heading-id]').first().click({ button: 'right' });
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Copy link to section' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Copy heading text' })).toBeVisible();
  });

  test('title bar suppresses the native menu without showing a redundant custom menu', async ({ page }) => {
    await page.locator('.workspace-toolbar').click({ button: 'right', position: { x: 4, y: 4 } });
    await expect(page.getByRole('menu')).toHaveCount(0);
  });
});

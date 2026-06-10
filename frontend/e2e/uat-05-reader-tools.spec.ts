import { expect, expectReaderReady, gotoApp, readMockState, seedApp, test } from './support/uat';

const DOC_PATH = '/uat/technical.md';
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('UAT-05 reader productivity tools', () => {
  test.beforeEach(async ({ page }) => {
    await seedApp(page, {
      documents: [{ path: DOC_PATH, fixture: 'uat-technical-document.md', trustedRoot: '/uat' }],
      session: { tabs: [{ path: DOC_PATH }], activePath: DOC_PATH }
    });
    await gotoApp(page);
    await expectReaderReady(page);
  });

  test('palette is keyboard operated and restores focus', async ({ page }) => {
    const open = page.getByRole('button', { name: 'Open document' });
    await open.focus();
    await page.keyboard.press(`${mod}+k`);
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(open).toBeFocused();
    await page.keyboard.press(`${mod}+k`);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('search')).toBeVisible();
  });

  test('copy, diagram inspection, appearance, and focus mode work', async ({ page }) => {
    const code = page.locator('.doc-block-code').first();
    await code.scrollIntoViewIfNeeded();
    await code.getByRole('button', { name: 'Copy code' }).click();
    expect(await readMockState(page, (state) => state.clipboardText as string)).toContain('openAndParse');
    await expect(page.getByText('Code copied')).toBeAttached();

    const diagram = page.locator('.doc-block-mermaid');
    await diagram.scrollIntoViewIfNeeded();
    await diagram.getByRole('button', { name: 'Inspect diagram' }).click();
    const dialog = page.getByRole('dialog', { name: 'Mermaid diagram' });
    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel(/Text size/).fill('18');
    await expect(page.locator('html')).toHaveCSS('--reader-font-size', '18px');
    await page.getByRole('button', { name: 'Done' }).click();

    await page.keyboard.press(`${mod}+Shift+f`);
    await expect(page.getByRole('main')).toHaveClass(/focus-mode/);
  });
});

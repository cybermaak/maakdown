import { expect, expectReaderReady, gotoApp, seedApp, test } from './support/uat';

const DOC_PATH = '/uat/uat-technical-document.md';

function luminance(rgb: string): number {
  const match = rgb.match(/\d+/g);
  if (!match) return 1;
  const [r, g, b] = match.map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

test.describe('UAT-02 Theme and reader consistency', () => {
  test.beforeEach(async ({ page }) => {
    await seedApp(page, {
      documents: [{ path: DOC_PATH, fixture: 'uat-technical-document.md', trustedRoot: '/uat' }],
      session: { tabs: [{ path: DOC_PATH }], activePath: DOC_PATH },
      config: { theme: 'light' }
    });
    await gotoApp(page);
    await expectReaderReady(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('switching themes updates chrome and content together and persists across restart', async ({ page }) => {
    const html = page.locator('html');
    const toolbar = page.locator('.workspace-toolbar');

    const lightChrome = await toolbar.evaluate((el) => getComputedStyle(el).backgroundColor);

    // Switch light -> dark without reopening the document (cycle order: light -> dark)
    await page.getByRole('button', { name: 'Theme: light' }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Application chrome and the reader surface both reflect dark mode
    await expect(html).toHaveAttribute('data-reader-mode', 'dark');
    const darkChrome = await toolbar.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(darkChrome).not.toBe(lightChrome);

    // Dark syntax highlighting uses a dark code surface
    const code = page.locator('.doc-block pre').first();
    await code.scrollIntoViewIfNeeded();
    const codeBg = await code.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(luminance(codeBg)).toBeLessThan(0.4);

    // Mermaid uses semantic reader colors (dark palette) rather than library defaults
    const mermaid = page.locator('.doc-block-mermaid');
    await mermaid.scrollIntoViewIfNeeded();
    await expect(mermaid.locator('svg')).toBeVisible({ timeout: 15_000 });
    const svgMarkup = (await mermaid.locator('svg').evaluate((el) => el.outerHTML)).toLowerCase();
    expect(svgMarkup).toContain('26342d'); // dark mainBkg from the reader palette
    expect(svgMarkup).not.toContain('ececff'); // mermaid default node fill

    // Simulate restart: durable theme survives a reload
    await page.reload();
    await expectReaderReady(page);
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });
});

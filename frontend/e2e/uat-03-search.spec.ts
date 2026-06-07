import { expect, expectReaderReady, gotoApp, seedApp, test } from './support/uat';

const DOC_PATH = '/uat/dossier.md';
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

test('UAT-03 finds and navigates offscreen matches in a large document', async ({ page }) => {
  await seedApp(page, {
    documents: [{ path: DOC_PATH, fixture: 'maakdown-reader-evaluation.md', trustedRoot: '/uat' }],
    session: { tabs: [{ path: DOC_PATH }], activePath: DOC_PATH }
  });
  await gotoApp(page);
  await expectReaderReady(page);

  await page.keyboard.press(`${mod}+f`);
  const input = page.getByRole('textbox', { name: 'Find in document' });
  await input.fill('typescript implementation sample');
  await expect(page.getByRole('search')).toContainText(/1 \/\s*\d+/);
  await page.getByRole('button', { name: 'Next match' }).click();
  await expect(page.locator('mark.search-mark.current')).toBeVisible();

  await page.getByRole('button', { name: 'Match case' }).click();
  await input.fill('TYPESCRIPT IMPLEMENTATION SAMPLE');
  await expect(page.getByRole('search')).toContainText('0 / 0');
});

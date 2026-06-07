import AxeBuilder from '@axe-core/playwright';
import { expect, expectReaderReady, gotoApp, seedApp, test } from './support/uat';

const DOC_PATH = '/uat/technical.md';
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

test('UAT-07 has no serious accessibility violations and supports keyboard tabs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedApp(page, {
    documents: [{ path: DOC_PATH, fixture: 'uat-technical-document.md', trustedRoot: '/uat' }],
    session: { tabs: [{ path: DOC_PATH }], activePath: DOC_PATH }
  });
  await gotoApp(page);
  await expectReaderReady(page);

  const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);

  const tab = page.getByRole('tab').first();
  await tab.focus();
  await page.keyboard.press('Home');
  await expect(tab).toBeFocused();

  await page.keyboard.press(`${mod}+k`);
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tab).toBeFocused();
});

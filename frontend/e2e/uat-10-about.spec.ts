import { expect, expectReaderReady, gotoApp, readMockState, seedApp, test } from './support/uat';

const DOC = '/uat/technical.md';
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

test('UAT-10 About dialog opens from the palette and links to the repo', async ({ page }) => {
  await seedApp(page, {
    documents: [{ path: DOC, fixture: 'uat-technical-document.md', trustedRoot: '/uat' }],
    session: { tabs: [{ path: DOC }], activePath: DOC }
  });
  await gotoApp(page);
  await expectReaderReady(page);

  // Open via the command palette
  await page.keyboard.press(`${mod}+k`);
  await page.getByRole('dialog', { name: 'Command palette' }).getByRole('textbox').fill('about');
  await page.getByRole('button', { name: 'About Maakdown' }).click();

  const dialog = page.getByRole('dialog', { name: 'About Maakdown' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Maakdown', { exact: true })).toBeVisible();
  await expect(dialog.getByText('uat-test')).toBeVisible(); // mock version
  await expect(dialog.getByText('MIT License · © 2026 Mohammed Kamel')).toBeVisible();

  // Repo link routes through the external-link boundary (system browser)
  await dialog.getByRole('button', { name: 'github.com/cybermaak/maakdown' }).click();
  const links = await readMockState<string[]>(page, (state) => state.externalLinks as string[]);
  expect(links).toContain('https://github.com/cybermaak/maakdown');

  // Close restores the reader
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
});

import { expect, expectReaderReady, gotoApp, seedApp, test } from './support/uat';

const DOC_PATH = '/uat/table-tools.md';

function tableToolsDocument(): string {
  const largeRows = Array.from({ length: 260 }, (_, index) => `<tr><td>${index + 1}</td><td>Large row ${index + 1}</td></tr>`).join('\n');
  return [
    '# Table Tools',
    '',
    '## Interactive table',
    '',
    '| Name | Score | Date | Notes |',
    '|---|---:|---|---|',
    '| Beta | 10 | 2026-06-02 | Stable workspace behavior |',
    '| Alpha | 20 | 2026-06-03 | A very long operational note that should wrap inside the selected reader measure instead of forcing the table beyond the prose column width. |',
    '| Gamma | 3 | 2026-06-01 | Needs follow up |',
    '',
    '## Headerless table',
    '',
    '<table><tbody><tr><td>North</td><td>Plain body row</td></tr><tr><td>South</td><td>No header cells</td></tr></tbody></table>',
    '',
    '## Large table',
    '',
    `<table><thead><tr><th>ID</th><th>Description</th></tr></thead><tbody>${largeRows}</tbody></table>`
  ].join('\n');
}

test.describe('UAT-12 table reading tools', () => {
  test.beforeEach(async ({ page }) => {
    await seedApp(page, {
      documents: [{ path: DOC_PATH, contents: tableToolsDocument(), trustedRoot: '/uat' }],
      session: { tabs: [{ path: DOC_PATH }], activePath: DOC_PATH }
    });
    await gotoApp(page);
    await expectReaderReady(page);
  });

  test('constrains table width to the selected reader measure and wraps cell text', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('group', { name: 'Measure' }).getByRole('button', { name: 'Narrow' }).click();
    await page.getByLabel('Keep tables within text width').check();
    await page.getByRole('button', { name: 'Done' }).click();

    const tableBlock = page.locator('.doc-block-table').first();
    await expect(tableBlock).toHaveClass(/table-measure/);
    await expect.poll(() => tableBlock.evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBeLessThanOrEqual(720);

    const longCell = tableBlock.getByRole('cell', { name: /very long operational note/ });
    await expect(longCell).toBeVisible();
    expect(await longCell.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  });

  test('filters and stably sorts suitable headered tables', async ({ page }) => {
    const table = page.locator('.table-shell').first();
    await table.getByLabel('Filter table rows').fill('gamma');
    await expect(table.getByText('1 / 3 rows')).toBeVisible();
    await expect(table.getByRole('cell', { name: 'Gamma' })).toBeVisible();
    await expect(table.getByRole('cell', { name: 'Beta' })).toHaveCount(0);

    await table.getByRole('button', { name: 'Clear table filter' }).click();
    await table.getByRole('button', { name: 'Sort Score ascending' }).click();
    await expect.poll(async () => (await table.locator('tbody tr').first().locator('td').first().innerText()).trim()).toBe('Gamma');

    await table.getByRole('button', { name: 'Sort Score descending' }).click();
    await expect.poll(async () => (await table.locator('tbody tr').first().locator('td').first().innerText()).trim()).toBe('Alpha');

    await table.getByRole('button', { name: 'Restore Score source order' }).click();
    await expect.poll(async () => (await table.locator('tbody tr').first().locator('td').first().innerText()).trim()).toBe('Beta');
  });

  test('suppresses controls for headerless and over-limit tables', async ({ page }) => {
    await page.getByRole('heading', { name: 'Headerless table' }).scrollIntoViewIfNeeded();
    const headerless = page.locator('.doc-block-table').filter({ hasText: 'Plain body row' });
    await expect(headerless.getByLabel('Filter table rows')).toHaveCount(0);
    await expect(headerless.getByRole('button', { name: /Sort/ })).toHaveCount(0);

    await page.getByRole('heading', { name: 'Large table' }).scrollIntoViewIfNeeded();
    const large = page.locator('.doc-block-table').filter({ hasText: 'Large row 260' });
    await expect(large.getByLabel('Filter table rows')).toHaveCount(0);
    await expect(large.getByRole('button', { name: /Sort/ })).toHaveCount(0);
  });

  test('keeps table interaction state across virtualizer remounts in the current session', async ({ page }) => {
    const table = page.locator('.table-shell').first();
    await table.getByLabel('Filter table rows').fill('gamma');
    await expect(table.getByText('1 / 3 rows')).toBeVisible();

    const surface = page.getByRole('document', { name: 'Markdown document' });
    await surface.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.waitForTimeout(150);
    await surface.evaluate((element) => { element.scrollTop = 0; });

    const remounted = page.locator('.table-shell').first();
    await expect(remounted.getByLabel('Filter table rows')).toHaveValue('gamma');
    await expect(remounted.getByText('1 / 3 rows')).toBeVisible();
  });
});

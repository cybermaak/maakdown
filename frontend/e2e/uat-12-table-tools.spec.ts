import type { Page } from '@playwright/test';
import { expect, expectReaderReady, gotoApp, readFixture, seedApp, test } from './support/uat';

const DOC_PATH = '/uat/table-tools.md';

async function scrollToHeading(page: Page, name: string): Promise<void> {
  const surface = page.getByRole('document', { name: 'Markdown document' });
  const heading = page.getByRole('heading', { name });
  for (const ratio of [0, 0.25, 0.5, 0.75, 1]) {
    if (await heading.count()) {
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
      return;
    }
    await surface.evaluate((element, nextRatio) => {
      element.scrollTop = (element.scrollHeight - element.clientHeight) * nextRatio;
    }, ratio);
    await page.waitForTimeout(100);
  }
  await expect(heading).toBeVisible();
}

function tableToolsDocument(): string {
  const largeRows = Array.from({ length: 260 }, (_, index) => `<tr><td>${index + 1}</td><td>Large row ${index + 1}</td></tr>`).join('\n');
  return [
    readFixture('table-tools.md').trimEnd(),
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
    await page.getByLabel('Measure').selectOption('narrow');
    await page.getByLabel('Keep tables within text width').check();
    await page.getByLabel('Table row numbers').check();
    await page.getByRole('button', { name: 'Done' }).click();

    const tableBlock = page.locator('.doc-block-table').first();
    await expect(tableBlock).toHaveClass(/table-measure/);
    await expect(tableBlock.getByRole('columnheader', { name: '#' })).toBeVisible();
    await expect(tableBlock.locator('tbody .table-row-number').first()).toHaveText('1');
    await expect.poll(() => tableBlock.evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBeLessThanOrEqual(720);

    const longCell = tableBlock.getByRole('cell', { name: /very long operational note/ });
    await expect(longCell).toBeVisible();
    expect(await longCell.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  });

  test('filters and stably sorts suitable headered tables', async ({ page }) => {
    const table = page.locator('.table-shell').first();
    await table.getByRole('button', { name: 'Filter Name' }).click();
    await table.getByLabel('Filter Name column').fill('gamma');
    await expect(table.getByRole('dialog', { name: 'Filter Name' }).getByText('1 of 3 rows match')).toBeVisible();
    await expect(table.getByRole('cell', { name: 'Beta' })).toBeVisible();
    await table.getByRole('button', { name: 'Apply' }).click();
    await expect(table.locator('.table-row-count').filter({ hasText: '1 of 3 rows match' })).toBeVisible();
    await expect(table.getByText('Name contains "gamma"')).toBeVisible();
    await expect(table.getByRole('cell', { name: 'Gamma' })).toBeVisible();
    await expect(table.getByRole('cell', { name: 'Beta' })).toHaveCount(0);

    await table.getByRole('button', { name: 'Remove Name filter' }).click();
    await table.getByRole('button', { name: 'Sort Score ascending' }).click();
    await expect(table.getByText('Score: ascending')).toBeVisible();
    await expect.poll(async () => (await table.locator('tbody tr').first().locator('td').first().innerText()).trim()).toBe('Gamma');

    await table.getByRole('button', { name: 'Sort Score descending' }).click();
    await expect(table.getByText('Score: descending')).toBeVisible();
    await expect.poll(async () => (await table.locator('tbody tr').first().locator('td').first().innerText()).trim()).toBe('Alpha');

    await table.getByRole('button', { name: 'Restore Score source order' }).click();
    await expect.poll(async () => (await table.locator('tbody tr').first().locator('td').first().innerText()).trim()).toBe('Beta');
  });

  test('offers recoverable empty state for column filters', async ({ page }) => {
    const table = page.locator('.table-shell').first();
    await table.getByRole('button', { name: 'Filter Notes' }).click();
    await table.getByLabel('Filter Notes column').fill('not-in-this-table');
    await expect(table.getByRole('dialog', { name: 'Filter Notes' }).getByText('0 of 3 rows match')).toBeVisible();
    await table.getByRole('button', { name: 'Apply' }).click();

    await expect(table.locator('.table-row-count').filter({ hasText: '0 of 3 rows match' })).toBeVisible();
    await expect(table.getByText('No rows match the current filters.')).toBeVisible();
    await table.getByRole('button', { name: 'Clear filters' }).click();
    await expect(table.getByRole('cell', { name: 'Beta' })).toBeVisible();
  });

  test('uses per-column enum checklist filters from the header popover', async ({ page }) => {
    await scrollToHeading(page, 'Release readiness matrix');
    const matrix = page.locator('.table-shell').filter({ hasText: 'Reader startup' });
    await expect(matrix).toBeVisible();

    await matrix.getByRole('button', { name: 'Filter Status' }).click();
    const dialog = matrix.getByRole('dialog', { name: 'Filter Status' });
    await expect(dialog.getByText('Value checklist')).toBeVisible();
    await dialog.getByRole('checkbox', { name: /stable/i }).check();
    await expect(dialog.getByText('8 of 12 rows match')).toBeVisible();
    await dialog.getByRole('button', { name: 'Apply' }).click();

    await expect(matrix.getByText('Status: stable')).toBeVisible();
    await expect(matrix.locator('.table-row-count').filter({ hasText: '8 of 12 rows match' })).toBeVisible();
    await expect(matrix.getByRole('cell', { name: 'Needs review' })).toHaveCount(0);
  });

  test('suppresses controls for headerless and over-limit tables', async ({ page }) => {
    await scrollToHeading(page, 'Headerless table');
    const headerless = page.locator('.doc-block-table').filter({ hasText: 'Plain body row' });
    await expect(headerless).toBeVisible();
    await expect(headerless.getByRole('button', { name: /Filter/ })).toHaveCount(0);
    await expect(headerless.getByRole('button', { name: /Sort/ })).toHaveCount(0);

    const surface = page.getByRole('document', { name: 'Markdown document' });
    await surface.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const large = page.locator('.doc-block-table').filter({ hasText: 'Large row 260' });
    await expect(large).toBeVisible();
    await expect(large.getByRole('button', { name: /Filter/ })).toHaveCount(0);
    await expect(large.getByRole('button', { name: /Sort/ })).toHaveCount(0);
  });

  test('keeps table interaction state across virtualizer remounts in the current session', async ({ page }) => {
    const table = page.locator('.table-shell').first();
    await table.getByRole('button', { name: 'Filter Name' }).click();
    await table.getByLabel('Filter Name column').fill('gamma');
    await table.getByRole('button', { name: 'Apply' }).click();
    await expect(table.locator('.table-row-count').filter({ hasText: '1 of 3 rows match' })).toBeVisible();

    const surface = page.getByRole('document', { name: 'Markdown document' });
    await surface.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.waitForTimeout(150);
    await surface.evaluate((element) => { element.scrollTop = 0; });

    const remounted = page.locator('.table-shell').first();
    await expect(remounted.getByText('Name contains "gamma"')).toBeVisible();
    await expect(remounted.locator('.table-row-count').filter({ hasText: '1 of 3 rows match' })).toBeVisible();
  });
});

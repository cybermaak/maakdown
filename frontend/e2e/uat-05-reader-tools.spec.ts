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
    await expect(palette.getByRole('group', { name: 'Commands' })).toBeVisible();
    await expect(palette.getByRole('group', { name: 'Open tabs' })).toContainText(DOC_PATH);
    await expect(palette.getByText('Command').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(open).toBeFocused();
    await page.keyboard.press(`${mod}+k`);
    await page.keyboard.type('find');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('search')).toBeVisible();
  });

  test('copy, diagram inspection, and appearance controls work', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Focus mode' })).toHaveCount(0);
    await page.keyboard.press(`${mod}+k`);
    await expect(page.getByRole('dialog', { name: 'Command palette' })).not.toContainText('Focus mode');
    await page.keyboard.press('Escape');

    const code = page.locator('.doc-block-code').first();
    await code.scrollIntoViewIfNeeded();
    await code.getByRole('button', { name: 'Copy code' }).click();
    expect(await readMockState(page, (state) => state.clipboardText as string)).toContain('openAndParse');
    await expect(page.getByText('Code copied')).toBeAttached();

    const diagram = page.locator('.doc-block-mermaid').first();
    await diagram.scrollIntoViewIfNeeded();
    const codeWidth = await code.evaluate((element) => Math.round(element.getBoundingClientRect().width));
    const diagramWidth = await diagram.evaluate((element) => Math.round(element.getBoundingClientRect().width));
    expect(Math.abs(codeWidth - diagramWidth)).toBeLessThanOrEqual(1);

    await diagram.getByRole('button', { name: 'Inspect diagram' }).click();
    const dialog = page.getByRole('dialog', { name: 'Mermaid diagram' });
    await expect(dialog).toBeVisible();
    const dialogWidth = await dialog.evaluate((element) => Math.round(element.getBoundingClientRect().width));
    expect(dialogWidth).toBeGreaterThan(diagramWidth);
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await diagram.getByRole('button', { name: 'Show Mermaid source' }).click();
    await expect(diagram.locator('.mermaid-source')).toContainText('flowchart');
    await expect(diagram.locator('.mermaid-rendered svg')).toHaveCount(0);
    await diagram.getByRole('button', { name: 'Show diagram' }).click();
    await expect(diagram.locator('.mermaid-rendered svg')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await expect(settings.getByRole('heading', { name: 'Reading display' })).toBeVisible();
    const settingsBackground = await settings.evaluate((element) => getComputedStyle(element).backgroundColor);
    await settings.getByRole('button', { name: 'Done' }).click();
    await page.keyboard.press(`${mod}+k`);
    const paletteBackground = await page.getByRole('dialog', { name: 'Command palette' }).evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(settingsBackground).toBe(paletteBackground);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await settings.getByLabel('Line height').selectOption('relaxed');
    await expect(page.locator('html')).toHaveCSS('--reader-line-height', '1.85');
    await settings.getByLabel('Measure').selectOption('wide');
    await expect(page.locator('html')).toHaveCSS('--reading-measure', '1040px');
    const tableSizingHelp = settings.getByText('Balanced samples content. Equal gives each column the same width.');
    await tableSizingHelp.scrollIntoViewIfNeeded();
    await expect(tableSizingHelp).toBeVisible();
    await settings.getByLabel(/Text size/).fill('18');
    await expect(page.locator('html')).toHaveCSS('--reader-font-size', '18px');
    await settings.getByLabel('Document line numbers').check();
    await settings.getByLabel('Code line numbers').check();
    await settings.getByRole('group', { name: 'Code long lines' }).getByRole('button', { name: 'Scroll' }).click();
    await settings.getByRole('button', { name: 'Done' }).click();
    await expect(page.locator('.source-line').first()).toBeVisible();
    await code.scrollIntoViewIfNeeded();
    await expect(code.locator('pre.code-line-numbers')).toBeVisible();
    await expect(code.locator('pre.code-nowrap')).toBeVisible();
    await code.getByRole('button', { name: 'Enable code wrap' }).click();
    await expect(code.locator('pre.code-wrap')).toBeVisible();
    await code.getByRole('button', { name: 'Copy code' }).click();
    expect(await readMockState(page, (state) => state.clipboardText as string)).not.toMatch(/^\s*1\s+export/m);

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(settings).toBeVisible();
    await page.mouse.click(12, 120);
    await expect(settings).toBeHidden();
  });

  test('document source gutter stays aligned across wide block types', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel('Document line numbers').check();
    await page.getByRole('button', { name: 'Done' }).click();

    async function sourceLineLeft(selector: string): Promise<number> {
      const block = page.locator(selector).first();
      await block.scrollIntoViewIfNeeded();
      await expect(block.locator('.source-line')).toBeVisible();
      return block.locator('.source-line').evaluate((element) => Math.round(element.getBoundingClientRect().left));
    }

    const lefts = [
      await sourceLineLeft('.doc-block-heading'),
      await sourceLineLeft('.doc-block-code'),
      await sourceLineLeft('.doc-block-mermaid'),
      await sourceLineLeft('.doc-block-table')
    ];
    expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThanOrEqual(1);
    await expect(page.locator('.source-line-stack')).toHaveCount(0);

    const listBlock = page.locator('.doc-block').filter({ has: page.locator('li') }).first();
    await listBlock.scrollIntoViewIfNeeded();
    const listLabels = listBlock.locator('.list-source-line');
    await expect.poll(() => listLabels.count()).toBeGreaterThan(1);
    const labelTops = await listLabels.evaluateAll((labels) => labels.map((label) => Math.round(label.getBoundingClientRect().top)));
    const listLabelLeft = await listLabels.first().evaluate((element) => Math.round(element.getBoundingClientRect().left));
    const uniqueTops = new Set(labelTops);
    expect(uniqueTops.size).toBe(labelTops.length);
    expect([...uniqueTops].sort((a, b) => a - b)).toEqual(labelTops);
    expect(Math.abs(listLabelLeft - lefts[0])).toBeLessThanOrEqual(1);

    const firstListLabel = await listLabels.first().textContent();
    const firstListItemText = await listBlock.locator('li').first().evaluate((item) => {
      const clone = item.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.list-source-line').forEach((node) => node.remove());
      return clone.innerText.trim();
    });
    await listBlock.evaluate((block) => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(block);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    await listBlock.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Copy' }).click();
    const copiedListText = await readMockState(page, (state) => state.clipboardText as string);
    expect(copiedListText).toContain(firstListItemText);
    expect(copiedListText).not.toContain(firstListLabel?.trim() ?? '');

    const gutter = await page.locator('.doc-block-code.with-source-line').first().evaluate((element) => {
      const rule = getComputedStyle(element, '::before');
      const label = getComputedStyle(element.querySelector('.source-line') as HTMLElement);
      return { ruleWidth: rule.borderRightWidth, labelRuleWidth: label.borderRightWidth };
    });
    expect(gutter.ruleWidth).toBe('1px');
    expect(gutter.labelRuleWidth).toBe('0px');
  });
});

test.describe('UAT-05 document source labels', () => {
  test.beforeEach(async ({ page }) => {
    await seedApp(page, {
      documents: [{
        path: '/uat/source-list-labels.md',
        trustedRoot: '/uat',
        contents: [
          '### Checkpoint',
          '',
          '<a id="checkpoint"></a>',
          '',
          'The checkpoint captures the operational contract:',
          '',
          '1. Parse and sanitize before HTML reaches the document surface.',
          '2. Preserve plain text and source code while enhancements are pending.',
          '3. Resolve navigation through stable document-model identifiers.',
          '',
          '### Delivery checklist',
          '',
          '- [x] Define the scenario and its observable outcome.',
          '- [x] Identify the trusted boundary and failure behavior.',
          '- [ ] Capture performance values on macOS WebKit.'
        ].join('\n')
      }],
      session: { tabs: [{ path: '/uat/source-list-labels.md' }], activePath: '/uat/source-list-labels.md' },
      config: { documentLineNumbers: true }
    });
    await gotoApp(page);
    await expectReaderReady(page);
  });

  test('labels every ordered and task-list item after raw anchors', async ({ page }) => {
    const orderedList = page.locator('.doc-block').filter({ hasText: 'Parse and sanitize before HTML reaches the document surface.' }).first();
    const taskList = page.locator('.doc-block').filter({ hasText: 'Define the scenario and its observable outcome.' }).first();

    await expect(orderedList.locator('.list-source-line')).toHaveText(['7', '8', '9']);
    await expect(taskList.locator('.list-source-line')).toHaveText(['13', '14', '15']);
    await expect(orderedList.locator('.source-line')).toHaveCount(0);
    await expect(taskList.locator('.source-line')).toHaveCount(0);
  });
});

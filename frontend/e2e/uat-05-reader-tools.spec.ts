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

    await page.getByRole('button', { name: 'Close search' }).click();
    await page.keyboard.press(`${mod}+k`);
    await page.keyboard.type('go to line');
    let promptMessage = '';
    page.once('dialog', async (prompt) => {
      promptMessage = prompt.message();
      await prompt.accept('2');
    });
    await page.keyboard.press('Enter');
    expect(promptMessage).toContain('Go to line');
    await expect(page.getByText('Line 2')).toBeAttached();
  });

  test('copy, diagram inspection, and appearance controls work', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Focus mode' })).toHaveCount(0);
    await page.keyboard.press(`${mod}+k`);
    await expect(page.getByRole('dialog', { name: 'Command palette' })).not.toContainText('Focus mode');
    await page.keyboard.press('Escape');

    const code = page.locator('.doc-block-code').first();
    await code.scrollIntoViewIfNeeded();
    await expect(code.locator('[data-highlight-engine="shiki-js-regex"]')).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press(`${mod}+k`);
    await page.keyboard.type('highlight.js');
    await page.keyboard.press('Enter');
    await expect(code.locator('[data-highlight-engine="highlightjs"]')).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press(`${mod}+k`);
    await page.keyboard.type('shiki');
    await page.keyboard.press('Enter');
    await expect(code.locator('[data-highlight-engine="shiki-js-regex"]')).toBeVisible({ timeout: 15_000 });
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
    await expect(settings).not.toContainText('Code highlighting');
    await expect(settings).not.toContainText('Highlight.js');
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
    await expect(page.locator('.reader-line').first()).toBeVisible();
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

  test('document reader gutter stays aligned across wide block types', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel('Document line numbers').check();
    await page.getByRole('button', { name: 'Done' }).click();

    async function readerLineLeft(selector: string): Promise<number> {
      const block = page.locator(selector).first();
      await block.scrollIntoViewIfNeeded();
      await expect(block.locator('.reader-line')).toBeVisible();
      return block.locator('.reader-line').evaluate((element) => Math.round(element.getBoundingClientRect().left));
    }

    const lefts = [
      await readerLineLeft('.doc-block-heading'),
      await readerLineLeft('.doc-block-code'),
      await readerLineLeft('.doc-block-mermaid'),
      await readerLineLeft('.doc-block-table')
    ];
    expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThanOrEqual(1);

    const listBlock = page.locator('.doc-block').filter({ has: page.locator('li') }).first();
    await listBlock.scrollIntoViewIfNeeded();
    const listLabels = listBlock.locator('.reader-line');
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
      clone.querySelectorAll('.reader-line').forEach((node) => node.remove());
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
    expect(copiedListText).not.toMatch(new RegExp(`^\\s*${escapeRegExp(firstListLabel?.trim() ?? '')}\\s+`, 'm'));

    const gutter = await page.locator('.doc-block-code.with-reader-line').first().evaluate((element) => {
      const rule = getComputedStyle(element, '::before');
      const label = getComputedStyle(element.querySelector('.reader-line') as HTMLElement);
      return { ruleWidth: rule.borderRightWidth, labelRuleWidth: label.borderRightWidth };
    });
    expect(gutter.ruleWidth).toBe('1px');
    expect(gutter.labelRuleWidth).toBe('0px');
  });
});

test.describe('UAT-05 document reader labels', () => {
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

    await expect(orderedList.locator('.reader-line')).toHaveText(['3', '4', '5']);
    await expect(taskList.locator('.reader-line')).toHaveText(['7', '8', '9']);
  });
});

test.describe('UAT-05 code line numbers', () => {
  test.beforeEach(async ({ page }) => {
    await seedApp(page, {
      documents: [{
        path: '/uat/wrapped-code.md',
        trustedRoot: '/uat',
        contents: [
          '# Wrapped code',
          '',
          '```go',
          'func (s *Service) ResolveAsset(documentPath, rawPath string) (AssetRef, error) { root, err := DetectTrustedRoot(documentPath, s.configuredRoot); if err != nil { return AssetRef{}, err } }',
          'resolved, err := ResolveAssetPath(documentPath, rawPath, root)',
          'return s.register(resolved)',
          '```'
        ].join('\n')
      }],
      session: { tabs: [{ path: '/uat/wrapped-code.md' }], activePath: '/uat/wrapped-code.md' },
      config: {
        codeLineNumbers: true,
        codeWrap: true,
        readerFontSize: 22,
        readerMeasure: 'narrow'
      }
    });
    await gotoApp(page);
    await expectReaderReady(page);
  });

  test('keeps wrapped continuations visually unnumbered', async ({ page }) => {
    const code = page.locator('.doc-block-code').first();
    await expect(code.locator('pre.code-line-numbers.code-wrap')).toBeVisible();
    await expect.poll(() => code.locator('.code-line-row').count()).toBe(3);
    const metrics = await code.locator('pre').evaluate((pre) => {
      const rows = Array.from(pre.querySelectorAll<HTMLElement>('.code-line-row'));
      const numbers = Array.from(pre.querySelectorAll<HTMLElement>('.code-line-number'));
      const contents = Array.from(pre.querySelectorAll<HTMLElement>('.code-line-content'));
      const lineHeight = Number.parseFloat(getComputedStyle(pre).lineHeight);
      return {
        numbers: numbers.map((number) => number.innerText.trim()),
        firstContentHeight: contents[0].getBoundingClientRect().height,
        secondNumberTopDelta: numbers[1].getBoundingClientRect().top - numbers[0].getBoundingClientRect().top,
        lineHeight
      };
    });
    expect(metrics.numbers).toEqual(['1', '2', '3']);
    expect(metrics.firstContentHeight).toBeGreaterThan(metrics.lineHeight * 1.5);
    expect(metrics.secondNumberTopDelta).toBeGreaterThan(metrics.lineHeight * 1.5);
  });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

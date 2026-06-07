import { expect, expectReaderReady, gotoApp, seedApp, test } from './support/uat';

const DOC_PATH = '/uat/uat-technical-document.md';

test.describe('UAT-01 Open and read a technical document', () => {
  test.beforeEach(async ({ page }) => {
    await seedApp(page, {
      documents: [{ path: DOC_PATH, fixture: 'uat-technical-document.md', trustedRoot: '/uat' }],
      session: { tabs: [{ path: DOC_PATH }], activePath: DOC_PATH }
    });
    await gotoApp(page);
    await expectReaderReady(page);
  });

  test('renders headings, prose, GFM table and tasks, callout, and metadata', async ({ page }) => {
    // Heading and prose
    await expect(page.getByRole('heading', { level: 1, name: 'UAT Technical Document' })).toBeVisible();
    await expect(page.getByText('deterministic fixture for the UI-driven UAT suite')).toBeVisible();

    // GFM table with header cells
    const table = page.locator('.doc-block table').first();
    await expect(table).toBeVisible();
    await expect(table.getByRole('cell', { name: 'Tables', exact: true })).toBeVisible();

    // GFM task list checkboxes (checked + unchecked)
    const checkboxes = page.locator('.doc-block input[type="checkbox"]');
    expect(await checkboxes.count()).toBeGreaterThanOrEqual(3);
    await expect(checkboxes.first()).toBeChecked();
    await expect(checkboxes.last()).not.toBeChecked();

    // Callout renders as a styled blockquote, not raw text
    await expect(page.locator('.doc-block blockquote', { hasText: 'verifies admonition presentation' })).toBeVisible();

    // Metadata panel reflects frontmatter (status badge + tags)
    const metadata = page.getByRole('region', { name: 'Frontmatter metadata' });
    await expect(metadata).toBeVisible();
    await expect(metadata.getByText('review')).toBeVisible();
    await expect(metadata.locator('.ds-tag', { hasText: 'uat' })).toBeVisible();
  });

  test('renders local image, math, highlighted code, and Mermaid through progressive enhancement', async ({ page }) => {
    const surface = page.getByRole('document', { name: 'Markdown document' });

    // Local image resolves through the tokenized asset boundary and actually loads
    const image = page.locator('.doc-block img[alt="Architecture overview"]');
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute('src', /__maakdown_fixture/);
    await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);

    // KaTeX math
    await expect(page.locator('.doc-block .katex').first()).toBeVisible();

    // Highlighted code (lazy, enhanced once visible)
    const code = page.locator('.doc-block-code code.language-typescript');
    await code.scrollIntoViewIfNeeded();
    await expect(page.locator('.doc-block-code .hljs-keyword, .doc-block-code .hljs-title').first()).toBeVisible();

    // Mermaid diagram renders an SVG once scheduled
    const mermaid = page.locator('.doc-block-mermaid');
    await mermaid.scrollIntoViewIfNeeded();
    await expect(mermaid.locator('.mermaid-rendered svg')).toBeVisible({ timeout: 15_000 });

    await surface.evaluate((el) => (el.scrollTop = 0));
  });

  test('heading links inherit heading ink and are not underlined', async ({ page }) => {
    const headingAnchor = page.locator('.doc-block-heading :is(h1, h2, h3) a').first();
    await expect(headingAnchor).toHaveCount(1);
    const styles = await headingAnchor.evaluate((anchor) => {
      const heading = anchor.closest('h1, h2, h3, h4, h5, h6') as HTMLElement;
      const anchorStyle = getComputedStyle(anchor);
      return {
        anchorColor: anchorStyle.color,
        headingColor: getComputedStyle(heading).color,
        decoration: anchorStyle.textDecorationLine
      };
    });
    expect(styles.anchorColor).toBe(styles.headingColor);
    expect(styles.decoration).toBe('none');
  });

  test('unsafe and unresolved content remains visibly inert', async ({ page }) => {
    const surface = page.getByRole('document', { name: 'Markdown document' });

    // Scroll to the end so trailing blocks (wikilink, unsafe HTML) mount
    await surface.evaluate((el) => (el.scrollTop = el.scrollHeight));

    // Unresolved wikilink renders as an inert, non-navigable span
    const wikilink = page.locator('.wikilink-unresolved', { hasText: 'Nonexistent UAT Note' });
    await expect(wikilink).toBeVisible();
    expect(await wikilink.evaluate((el) => el.tagName.toLowerCase())).toBe('span');

    // Trailing prose still renders normally after the unsafe block
    await expect(page.getByText('should still render normally')).toBeVisible();

    // The embedded <script> and javascript: link never executed
    expect(await page.evaluate(() => (window as unknown as { __xssExecuted?: boolean }).__xssExecuted)).toBeUndefined();
    expect(await page.locator('.doc-block script').count()).toBe(0);
  });
});

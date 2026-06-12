import { expect, expectReaderReady, gotoApp, seedApp, test } from './support/uat';

const DOC = '/uat/technical.md';

// Regression: after an outline (minimap) jump, the document must come to rest.
// A reactivity bug once re-fired DocumentView's rebuild/restore effect on every
// scroll-position commit, discarding measured block heights and oscillating the
// scroll position indefinitely (subtle on macOS, erratic on Windows).
test('UAT-11 document stays still after outline navigation', async ({ page }) => {
  await seedApp(page, {
    documents: [{ path: DOC, fixture: 'medium-technical-doc.md', trustedRoot: '/uat' }],
    session: { tabs: [{ path: DOC }], activePath: DOC }
  });
  await gotoApp(page);
  await expectReaderReady(page);

  // Jump via the hover outline to the Mermaid-bearing section, whose late
  // enhancement measurements are what fed the oscillation.
  await page.locator('.minimap').hover();
  await page.getByRole('button', { name: /System architecture/ }).first().click();
  await page.mouse.move(400, 400); // dismiss the hover reveal
  await expect(page.locator('.doc-block-mermaid .mermaid-rendered svg').first()).toBeVisible({ timeout: 20_000 });

  // Allow the post-navigation correction to settle: wait (bounded) until the
  // scroll position has been unchanged for 500ms. The bug under regression
  // never settles, so it still exhausts this wait and fails below.
  await page.waitForFunction(
    () =>
      new Promise<boolean>((done) => {
        const surface = document.querySelector('.document-scroll') as HTMLElement;
        const before = surface.scrollTop;
        setTimeout(() => done(surface.scrollTop === before), 500);
      }),
    undefined,
    { timeout: 15_000 }
  );
  const changes = await page.evaluate(
    () =>
      new Promise<number>((done) => {
        const surface = document.querySelector('.document-scroll') as HTMLElement;
        let last = surface.scrollTop;
        let moved = 0;
        const t0 = performance.now();
        function sample() {
          if (surface.scrollTop !== last) {
            moved += 1;
            last = surface.scrollTop;
          }
          if (performance.now() - t0 < 2500) requestAnimationFrame(sample);
          else done(moved);
        }
        requestAnimationFrame(sample);
      })
  );
  expect(changes).toBe(0);
});

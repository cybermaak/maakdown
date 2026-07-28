// Drives the real Maakdown frontend (via the dev fixture loader) in headless
// Chromium and captures the screenshots embedded in the project README.
//
// Usage:
//   node scripts/capture-readme-screenshots.mjs
//
// Set MAAKDOWN_CHROMIUM to a Chromium/Chrome executable when Playwright's
// bundled browser is unavailable (e.g. CI download mirrors are restricted).
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { startFixtureApp } from './fixture-app-server.mjs';

const frontendRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(frontendRoot, '..');
// Defaults to the committed README screenshots; CI overrides MAAKDOWN_SHOT_OUTDIR
// to collect per-OS UAT screenshots for cross-platform verification.
const outputDir = process.env.MAAKDOWN_SHOT_OUTDIR
  ? resolve(process.env.MAAKDOWN_SHOT_OUTDIR)
  : resolve(frontendRoot, '..', 'docs', 'screenshots');
const port = Number(process.env.MAAKDOWN_SHOT_PORT ?? 5193);
const fixture = 'medium-technical-doc.md';
const SCROLLER = '.document-scroll';

const candidateBrowsers = [
  process.env.MAAKDOWN_CHROMIUM,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
].filter(Boolean);
const executablePath = candidateBrowsers.find((path) => existsSync(path));

// Serve a production (benchmark-mode) bundle rather than a dev server so the
// parser worker and chunks are pre-built — deterministic and free of the Vite
// cold-cache dynamic-import race, which matters for reliable CI screenshots.
const server = await startFixtureApp({
  frontendRoot,
  repoRoot,
  outputDir: resolve(repoRoot, 'output/performance/screenshot-app'),
  port,
  mode: 'benchmark'
});
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars']
});

const base = `http://127.0.0.1:${port}/?fixture=${fixture}`;

/** Open a fresh page with the document loaded and fonts ready. */
async function openReader({ width, height, colorScheme }) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme
  });
  await page.goto(base);
  await page.locator('h1', { hasText: 'Maakdown Reader Evaluation Dossier' }).first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function settle(page, ms = 900) {
  await page.waitForTimeout(ms);
}

/**
 * Scroll the virtualized reader (blocks mount on scroll) until an element
 * matching `waitSelector` (optionally containing `waitNeedle`) exists, then park
 * the first `centerSelector` element (optionally containing `centerNeedle`)
 * `offsetTop` px below the scroll container's top edge. The wait and center
 * targets are independent so we can stop on one block but frame a nearby one.
 */
async function scrollToBlock(page, {
  waitSelector,
  waitNeedle = null,
  centerSelector = waitSelector,
  centerNeedle = null,
  offsetTop
}) {
  let found = false;
  for (let i = 0; i < 80; i++) {
    found = await page.evaluate(
      ({ sel, text }) => {
        const els = Array.from(document.querySelectorAll(sel));
        return text ? els.some((el) => el.textContent?.includes(text)) : els.length > 0;
      },
      { sel: waitSelector, text: waitNeedle }
    );
    if (found) break;
    const reachedEnd = await page.evaluate((sel) => {
      const scroller = document.querySelector(sel);
      if (!(scroller instanceof HTMLElement)) return true;
      const previous = scroller.scrollTop;
      scroller.scrollTop = Math.min(previous + scroller.clientHeight * 0.75, scroller.scrollHeight);
      return scroller.scrollTop === previous;
    }, SCROLLER);
    if (reachedEnd) break;
    await page.waitForTimeout(120);
  }
  if (!found) {
    const diagnostics = await page.evaluate(
      ({ scroller, sel, text }) => {
        const container = document.querySelector(scroller);
        const matches = Array.from(document.querySelectorAll(sel));
        return {
          selector: sel,
          text,
          matches: matches.length,
          matchingText: text ? matches.filter((el) => el.textContent?.includes(text)).length : null,
          scrollTop: container instanceof HTMLElement ? container.scrollTop : null,
          scrollHeight: container instanceof HTMLElement ? container.scrollHeight : null,
          clientHeight: container instanceof HTMLElement ? container.clientHeight : null
        };
      },
      { scroller: SCROLLER, sel: waitSelector, text: waitNeedle }
    );
    throw new Error(`Could not mount screenshot target: ${JSON.stringify(diagnostics)}`);
  }
  await page.waitForTimeout(400);
  await page.evaluate(
    ({ scroller, sel, text, offset }) => {
      const container = document.querySelector(scroller);
      const els = Array.from(document.querySelectorAll(sel));
      const el = text ? els.find((node) => node.textContent?.includes(text)) : els[0];
      if (container && el) {
        const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
        container.scrollTop += top - offset;
      }
    },
    { scroller: SCROLLER, sel: centerSelector, text: centerNeedle, offset: offsetTop }
  );
}

try {
  // 1. Hero: top of the document in light theme (toolbar brand + tabs, minimap
  //    rail, and the frontmatter masthead).
  {
    const page = await openReader({ width: 1500, height: 940, colorScheme: 'light' });
    await settle(page);
    await page.screenshot({ path: resolve(outputDir, 'reading-light.png') });
    await page.close();
  }

  // 2. Dark theme showcasing a rendered Mermaid diagram. Anchor on the section
  //    heading so the preceding block scrolls cleanly off the top.
  {
    const page = await openReader({ width: 1500, height: 940, colorScheme: 'dark' });
    await scrollToBlock(page, {
      waitSelector: '.doc-block-mermaid svg',
      centerSelector: '.doc-block-heading',
      centerNeedle: 'System architecture',
      offsetTop: 28
    });
    await page.locator('.doc-block-mermaid svg').first().waitFor({ timeout: 20_000 });
    await settle(page);
    await page.screenshot({ path: resolve(outputDir, 'reading-dark.png') });
    await page.close();
  }

  // 3. Code highlighting + KaTeX math. The typescript sample is unique, so the
  //    needle keeps us on the right scenario; park it low enough that the
  //    display equation above stays in frame.
  {
    const page = await openReader({ width: 1320, height: 1040, colorScheme: 'light' });
    await scrollToBlock(page, {
      waitSelector: '.doc-block-code',
      waitNeedle: 'openAndParse',
      centerNeedle: 'openAndParse',
      offsetTop: 600
    });
    const codeBlock = page.locator('.doc-block-code').filter({ hasText: 'openAndParse' }).first();
    await codeBlock.waitFor({ state: 'visible', timeout: 20_000 });
    await codeBlock.locator('[data-highlight-engine], code').first().waitFor({ state: 'visible', timeout: 20_000 });
    await settle(page);
    await page.screenshot({ path: resolve(outputDir, 'code-and-math.png') });
    await page.close();
  }

  // 4. Command palette over the document.
  {
    const page = await openReader({ width: 1320, height: 940, colorScheme: 'light' });
    await settle(page, 400);
    await page.keyboard.press('Control+k');
    await page.getByRole('dialog').waitFor({ timeout: 5_000 }).catch(() => {});
    await settle(page, 500);
    await page.screenshot({ path: resolve(outputDir, 'command-palette.png') });
    await page.close();
  }

  console.log(`Saved README screenshots to ${outputDir}`);
} finally {
  await browser.close();
  await server.close();
}

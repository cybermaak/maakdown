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
import { createServer } from 'vite';

const frontendRoot = resolve(import.meta.dirname, '..');
const outputDir = resolve(frontendRoot, '..', 'docs', 'screenshots');
const port = Number(process.env.MAAKDOWN_SHOT_PORT ?? 5193);
const fixture = 'medium-technical-doc.md';

const candidateBrowsers = [
  process.env.MAAKDOWN_CHROMIUM,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
].filter(Boolean);
const executablePath = candidateBrowsers.find((path) => existsSync(path));

const server = await createServer({
  root: frontendRoot,
  server: { host: '127.0.0.1', port, strictPort: true },
  logLevel: 'error'
});
await server.listen();
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

/** Click a heading in the outline and wait for the virtualizer to land on it. */
async function gotoHeading(page, name) {
  await page.locator('.toc button', { hasText: name }).first().click();
  await page.waitForTimeout(500);
}

async function settle(page, ms = 900) {
  await page.waitForTimeout(ms);
}

/**
 * Scroll the virtualized reader until a code block containing `needle` mounts,
 * then position its top `offsetTop` px below the scroll container's top edge.
 */
async function scrollToCodeSample(page, needle, offsetTop) {
  const scroller = '.document-scroll';
  for (let i = 0; i < 80; i++) {
    const found = await page.evaluate(
      (text) => Array.from(document.querySelectorAll('.doc-block-code')).some((el) => el.textContent?.includes(text)),
      needle
    );
    if (found) break;
    await page.evaluate((sel) => {
      document.querySelector(sel).scrollTop += 700;
    }, scroller);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(400);
  await page.evaluate(
    ({ sel, text, offset }) => {
      const container = document.querySelector(sel);
      const block = Array.from(document.querySelectorAll('.doc-block-code')).find((el) => el.textContent?.includes(text));
      if (container && block) {
        const top = block.getBoundingClientRect().top - container.getBoundingClientRect().top;
        container.scrollTop += top - offset;
      }
    },
    { sel: scroller, text: needle, offset: offsetTop }
  );
}

try {
  // 1. Hero: full reading view in light theme (outline + document + metadata).
  {
    const page = await openReader({ width: 1500, height: 940, colorScheme: 'light' });
    await settle(page);
    await page.screenshot({ path: resolve(outputDir, 'reading-light.png') });
    await page.close();
  }

  // 2. Dark theme showcasing a rendered Mermaid diagram.
  {
    const page = await openReader({ width: 1500, height: 940, colorScheme: 'dark' });
    await gotoHeading(page, 'System architecture');
    await page.locator('.doc-block-mermaid svg').first().waitFor({ timeout: 20_000 });
    await settle(page);
    await page.screenshot({ path: resolve(outputDir, 'reading-dark.png') });
    await page.close();
  }

  // 3. Code highlighting + KaTeX math. Scroll-search for the unique typescript
  //    sample (block-level virtualization mounts on scroll), then park it low
  //    enough that the display equation above it stays in frame.
  {
    const page = await openReader({ width: 1320, height: 1040, colorScheme: 'light' });
    await scrollToCodeSample(page, 'openAndParse', 600);
    await page.locator('.doc-block-code .hljs, .doc-block-code code').first().waitFor({ timeout: 20_000 });
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

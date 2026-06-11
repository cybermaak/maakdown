import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { startFixtureApp } from './fixture-app-server.mjs';

const frontendRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(frontendRoot, '..');
const outputDir = resolve(repoRoot, 'output/performance');
const benchmarkDist = resolve(outputDir, 'benchmark-app');
const port = Number(process.env.MAAKDOWN_BENCHMARK_PORT ?? 5188);
const fixtures = ['small-readme.md', 'medium-technical-doc.md', 'large-10k-lines.md'];

const server = await startFixtureApp({
  frontendRoot,
  repoRoot,
  outputDir: benchmarkDist,
  port
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const browserErrors = [];
page.on('pageerror', (error) => browserErrors.push(error));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
    const location = message.location();
    browserErrors.push(new Error(`console.error: ${message.text()} (${location.url || 'unknown source'})`));
  }
});
page.on('response', (response) => {
  const resourceType = response.request().resourceType();
  if (response.status() >= 400 && ['document', 'script', 'stylesheet'].includes(resourceType)) {
    browserErrors.push(new Error(`HTTP ${response.status()}: ${response.url()}`));
  }
});
const results = [];

async function navigateToHeading(label) {
  const surface = page.locator('.document-scroll');
  await page.waitForTimeout(500);
  const before = await surface.evaluate((element) => element.scrollTop);
  // The outline is a hover-reveal minimap; its items only render while open.
  await page.locator('.minimap').hover();
  const item = page.getByRole('button', { name: label, exact: true }).first();
  await item.waitFor({ timeout: 15_000 });
  await item.click();
  await page.waitForFunction(
    ({ previous }) => {
      const element = document.querySelector('.document-scroll');
      return element instanceof HTMLElement && Math.abs(element.scrollTop - previous) > 100;
    },
    { previous: before },
    { timeout: 20_000 }
  );
  await page.waitForTimeout(800);
}

async function scrollUntilMounted(selector, countSelectors = [selector]) {
  const surface = page.locator('.document-scroll');
  await surface.evaluate((element) => {
    element.scrollTop = 0;
  });
  for (let step = 0; step < 100; step += 1) {
    const target = page.locator(selector).first();
    if (await target.count()) {
      if (await target.isVisible().catch(() => false)) {
        return Promise.all(countSelectors.map((countSelector) => page.locator(countSelector).count()));
      }
    }
    const reachedEnd = await surface.evaluate((element) => {
      const previous = element.scrollTop;
      element.scrollTop = Math.min(element.scrollTop + element.clientHeight * 0.75, element.scrollHeight);
      return element.scrollTop === previous;
    });
    if (reachedEnd) break;
    await page.waitForTimeout(150);
  }
  throw new Error(`Could not mount ${selector} while scrolling the reader`);
}

async function revealEnhancedCode() {
  const surface = page.locator('.document-scroll');
  await surface.evaluate((element) => {
    element.scrollTop = 0;
  });
  for (let step = 0; step < 100; step += 1) {
    const highlighted = page.locator('[data-highlight-engine]').first();
    if (await highlighted.count() && await highlighted.isVisible().catch(() => false)) return;

    const reachedEnd = await surface.evaluate((element) => {
      const previous = element.scrollTop;
      element.scrollTop = Math.min(element.scrollTop + element.clientHeight * 0.25, element.scrollHeight);
      return element.scrollTop === previous;
    });
    if (reachedEnd) break;
    await page.waitForTimeout(200);
  }
  const diagnostics = await surface.evaluate((element) => {
    const code = element.querySelector('[data-enhancement="code"]');
    return {
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      codeBlocks: element.querySelectorAll('[data-enhancement="code"]').length,
      codeTop: code?.getBoundingClientRect().top ?? null,
      surfaceTop: element.getBoundingClientRect().top
    };
  });
  throw new Error(`Could not render a highlighted code block while scrolling the reader: ${JSON.stringify(diagnostics)}`);
}

try {
  for (const fixture of fixtures) {
    const started = performance.now();
    const fixtureUrl = `http://127.0.0.1:${port}/?fixture=${fixture}`;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.goto(fixtureUrl);
      try {
        await page.locator('.document-scroll h1').filter({ hasText: 'Maakdown Reader Evaluation Dossier' }).first().waitFor({ timeout: 12_000 });
        break;
      } catch (error) {
        if (browserErrors.length) {
          throw new AggregateError(browserErrors, `Browser failed while loading ${fixture}`);
        }
        if (attempt === 2) {
          const bodyText = (await page.locator('body').innerText()).slice(0, 1_000);
          throw new Error(`Timed out loading ${fixture}. Visible UI:\n${bodyText}`, { cause: error });
        }
        await page.waitForTimeout(2_000);
      }
    }
    const openToTextMs = performance.now() - started;
    const [renderedDiagrams, diagramErrors] = await scrollUntilMounted(
      '.mermaid-rendered svg, .mermaid-error',
      ['.mermaid-rendered svg', '.mermaid-error']
    );
    await revealEnhancedCode();
    const highlightedBlocks = await page.locator('[data-highlight-engine]').count();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Shiki', exact: true }).click();
    await page.locator('[data-highlight-engine="shiki-js-regex"]').first().waitFor();
    const shikiBlocks = await page.locator('[data-highlight-engine="shiki-js-regex"]').count();
    const [renderedMath] = await scrollUntilMounted('.katex');
    const enhancements = {
      highlightedBlocks,
      shikiBlocks,
      renderedDiagrams,
      diagramErrors,
      renderedMath
    };
    let finalGateOffsetPx = null;
    if (fixture === 'large-10k-lines.md') {
      // Best-effort anchor-stabilization metric: a flaky deep-heading navigation
      // records null rather than failing the whole perf harness (and CI).
      try {
        await navigateToHeading('Final release gate');
        const finalGate = page.locator('.document-scroll h2').filter({ hasText: 'Final release gate' }).first();
        await finalGate.waitFor({ timeout: 15_000 });
        finalGateOffsetPx = await finalGate.evaluate((heading) => {
          const surface = heading.closest('.document-scroll');
          return surface ? Math.abs(heading.getBoundingClientRect().top - surface.getBoundingClientRect().top) : null;
        });
      } catch (error) {
        console.warn(`Final-gate navigation did not settle: ${error.message}`);
      }
    }
    const metrics = await page.locator('.document-scroll').evaluate((element) => {
      const frameSamples = [];
      const maxScroll = element.scrollHeight - element.clientHeight;
      for (let step = 0; step <= 30; step += 1) {
        const before = performance.now();
        element.scrollTop = maxScroll * (step / 30);
        frameSamples.push(performance.now() - before);
      }
      return {
        documentHeight: element.scrollHeight,
        mountedBlocks: element.querySelectorAll('[data-block-id]').length,
        maxScrollAssignmentMs: Math.max(...frameSamples),
        averageScrollAssignmentMs: frameSamples.reduce((sum, value) => sum + value, 0) / frameSamples.length
      };
    });
    const mountedReaders = await page.getByRole('document', { name: 'Markdown document' }).count();
    results.push({ fixture, openToTextMs, mountedReaders, ...metrics, ...enhancements, finalGateOffsetPx });
  }
} finally {
  await browser.close();
  await server.close();
}

await mkdir(outputDir, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  platform: process.platform,
  arch: process.arch,
  results
};
await writeFile(resolve(outputDir, 'reader-benchmark.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

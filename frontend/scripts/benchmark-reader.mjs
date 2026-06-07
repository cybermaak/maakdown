import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const frontendRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(frontendRoot, '..');
const outputDir = resolve(repoRoot, 'output/performance');
const port = Number(process.env.MAAKDOWN_BENCHMARK_PORT ?? 5188);
const fixtures = ['small-readme.md', 'medium-technical-doc.md', 'large-10k-lines.md'];

const server = await createServer({
  root: frontendRoot,
  server: { host: '127.0.0.1', port, strictPort: true },
  logLevel: 'error'
});
await server.listen();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', (error) => console.error('pageerror:', error));
page.on('console', (message) => {
  if (message.type() === 'error') {
    console.error('console:', message.text());
  }
});
const results = [];

try {
  for (const fixture of fixtures) {
    const started = performance.now();
    const fixtureUrl = `http://127.0.0.1:${port}/?fixture=${fixture}`;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.goto(fixtureUrl);
      try {
        await page.getByRole('heading', { name: 'Maakdown Reader Evaluation Dossier', exact: true }).waitFor({ timeout: 12_000 });
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        // Vite may reload after optimizing worker-only parser dependencies.
        await page.waitForTimeout(2_000);
      }
    }
    const openToTextMs = performance.now() - started;
    await page.getByRole('button', { name: 'System architecture', exact: true }).click();
    await page.locator('.mermaid-rendered svg, .mermaid-error').first().waitFor();
    const renderedDiagrams = await page.locator('.mermaid-rendered svg').count();
    const diagramErrors = await page.locator('.mermaid-error').count();
    await page.getByRole('button', { name: 'typescript implementation sample', exact: true }).first().click();
    await page.locator('[data-highlight-engine]').first().waitFor();
    const highlightedBlocks = await page.locator('[data-highlight-engine]').count();
    await page.getByRole('button', { name: 'Reader appearance', exact: true }).click();
    await page.getByRole('button', { name: 'Shiki', exact: true }).click();
    await page.getByRole('button', { name: 'typescript implementation sample', exact: true }).first().click();
    await page.locator('[data-highlight-engine="shiki-js-regex"]').first().waitFor();
    const shikiBlocks = await page.locator('[data-highlight-engine="shiki-js-regex"]').count();
    await page.getByRole('button', { name: 'Quantitative model', exact: true }).first().click();
    await page.locator('.katex').first().waitFor();
    const renderedMath = await page.locator('.katex').count();
    const enhancements = {
      highlightedBlocks,
      shikiBlocks,
      renderedDiagrams,
      diagramErrors,
      renderedMath
    };
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
    let finalGateOffsetPx = null;
    if (fixture === 'large-10k-lines.md') {
      await page.getByRole('button', { name: 'Final release gate', exact: true }).click();
      await page.getByRole('heading', { name: 'Final release gate', exact: true }).waitFor();
      finalGateOffsetPx = await page.getByRole('heading', { name: 'Final release gate', exact: true }).evaluate((heading) => {
        const surface = heading.closest('.document-scroll');
        return surface ? Math.abs(heading.getBoundingClientRect().top - surface.getBoundingClientRect().top) : null;
      });
    }
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

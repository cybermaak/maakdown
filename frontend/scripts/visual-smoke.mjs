import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const frontendRoot = resolve(import.meta.dirname, '..');
const outputDir = resolve(frontendRoot, '..', 'output', 'playwright');
const port = Number(process.env.MAAKDOWN_VISUAL_PORT ?? 5189);
const server = await createServer({
  root: frontendRoot,
  server: { host: '127.0.0.1', port, strictPort: true },
  logLevel: 'error'
});
await server.listen();
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`http://127.0.0.1:${port}/?design-system=1`);
  await page.getByRole('heading', { name: 'Maakdown Design System' }).waitFor();
  await page.screenshot({ path: resolve(outputDir, 'design-system-light.png'), fullPage: true });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.screenshot({ path: resolve(outputDir, 'design-system-dark.png'), fullPage: true });

  await page.setViewportSize({ width: 760, height: 900 });
  await page.goto(`http://127.0.0.1:${port}/?fixture=medium-technical-doc.md`);
  await page.getByRole('heading', { name: 'Maakdown Reader Evaluation Dossier', exact: true }).waitFor();
  await page.screenshot({ path: resolve(outputDir, 'workspace-narrow.png') });
} finally {
  await browser.close();
  await server.close();
}

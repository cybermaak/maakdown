import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const port = 5192;
const url = `http://127.0.0.1:${port}`;
const large = await readFile(new URL('../../fixtures/maakdown-reader-evaluation.md', import.meta.url), 'utf8');
const paths = ['/bench/one.md', '/bench/two.md', '/bench/three.md'];
const server = spawn('npm', ['run', 'dev', '--', '--mode', 'uat', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, VITE_CACHE_SUFFIX: 'workspace' }
});

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('workspace benchmark server did not start');
}

try {
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(120_000);
  await page.addInitScript(({ paths, large }) => {
    const documents = Object.fromEntries(paths.map((path) => [path, { contents: large, trustedRoot: '/bench' }]));
    window.__uat = {
      state: {
        documents,
        session: { tabs: paths.map((path) => ({ path, position: { scrollTop: 0 } })), activePath: paths[0], recents: [] }
      }
    };
  }, { paths, large });
  await page.goto(url);
  await page.getByRole('document', { name: 'Markdown document' }).waitFor();
  await page.getByRole('tab').nth(paths.length - 1).waitFor();

  const samples = [];
  for (const path of paths) {
    const name = path.split('/').at(-1);
    const started = performance.now();
    await page.getByRole('tab', { name }).click();
    await page.getByRole('document', { name: 'Markdown document' }).waitFor();
    await page.locator('.doc-block').first().waitFor();
    samples.push(Math.round(performance.now() - started));
  }
  const readers = await page.getByRole('document', { name: 'Markdown document' }).count();
  const mountedBlocks = await page.locator('.doc-block').count();
  const maxActivationMs = Math.max(...samples);
  const result = { readers, mountedBlocks, activationMs: samples, maxActivationMs };
  console.log(JSON.stringify(result, null, 2));
  if (readers !== 1) throw new Error(`expected one mounted reader, found ${readers}`);
  if (mountedBlocks > 100) throw new Error(`mounted block threshold exceeded: ${mountedBlocks}`);
  if (maxActivationMs > 1500) throw new Error(`tab activation threshold exceeded: ${maxActivationMs}ms`);
  await browser.close();
} finally {
  server.kill('SIGTERM');
}

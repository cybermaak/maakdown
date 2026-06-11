// Records the animated README/landing demo from the real Maakdown frontend.
//
// Drives the production (benchmark-mode) bundle via the fixture loader in
// headless Chromium with Playwright video recording, then converts the WebM to
// a looping animated WebP with ffmpeg. Maintenance script, not a product path.
//
// Usage:
//   node scripts/capture-readme-demo.mjs
//
// Output: docs/assets/maakdown_demo.webp
// Requires: ffmpeg on PATH.
import { mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { startFixtureApp } from './fixture-app-server.mjs';

const frontendRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(frontendRoot, '..');
const outPath = resolve(repoRoot, 'docs', 'assets', 'maakdown_demo.webp');
const videoDir = resolve(repoRoot, 'output', 'demo-video');
const port = Number(process.env.MAAKDOWN_DEMO_PORT ?? 5194);
const fixture = 'medium-technical-doc.md';
const SCROLLER = '.document-scroll';
const WIDTH = 1280;
const HEIGHT = 800;

const candidateBrowsers = [
  process.env.MAAKDOWN_CHROMIUM,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
].filter(Boolean);
const executablePath = candidateBrowsers.find((path) => existsSync(path));

const server = await startFixtureApp({
  frontendRoot,
  repoRoot,
  outputDir: resolve(repoRoot, 'output/performance/demo-app'),
  port,
  mode: 'benchmark'
});
await rm(videoDir, { recursive: true, force: true });
await mkdir(videoDir, { recursive: true });
await mkdir(resolve(repoRoot, 'docs', 'assets'), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars']
});

/** Smoothly animate the virtualized scroller by a distance in small steps. */
async function smoothScroll(page, distance, { step = 24, delay = 16 } = {}) {
  const steps = Math.round(Math.abs(distance) / step);
  const direction = Math.sign(distance);
  for (let i = 0; i < steps; i++) {
    await page.evaluate(
      ({ sel, by }) => { document.querySelector(sel).scrollTop += by; },
      { sel: SCROLLER, by: step * direction }
    );
    await page.waitForTimeout(delay);
  }
}

/** Type into the focused element with human-ish pacing. */
async function typeSlow(page, text, delay = 110) {
  for (const ch of text) {
    await page.keyboard.type(ch);
    await page.waitForTimeout(delay);
  }
}

try {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    colorScheme: 'light',
    recordVideo: { dir: videoDir, size: { width: WIDTH, height: HEIGHT } }
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/?fixture=${fixture}`);
  await page.locator('h1', { hasText: 'Maakdown Reader Evaluation Dossier' }).first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600); // hero hold

  // 1. Read: glide down through prose and code.
  await smoothScroll(page, 1500);
  await page.waitForTimeout(900);

  // 2. Outline: reveal the minimap and jump to the architecture section, where
  //    the Mermaid diagram renders.
  await page.locator('.minimap').hover();
  await page.waitForTimeout(1100);
  await page.getByRole('button', { name: /System architecture/ }).first().click();
  await page.waitForTimeout(600);
  await page.mouse.move(WIDTH / 2, HEIGHT / 2); // dismiss the outline reveal
  await page.locator('.doc-block-mermaid svg').first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1400);

  // 3. Command palette: open, search, run focus mode.
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(700);
  await typeSlow(page, 'focus');
  await page.waitForTimeout(700);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  // 4. Theme: flip to dark with the diagram in view, hold, and end.
  await page.getByRole('button', { name: /^Theme:/ }).click();
  await page.waitForTimeout(1800);
  await smoothScroll(page, 500);
  await page.waitForTimeout(1400);

  await context.close(); // flushes the video
} finally {
  await browser.close();
  await server.close();
}

// Convert WebM -> looping animated WebP. Not every ffmpeg build ships a webp
// encoder, so extract PNG frames with ffmpeg and assemble them with img2webp
// (from the webp package), the same pipeline polytray's demo uses.
const files = (await readdir(videoDir)).filter((f) => f.endsWith('.webm'));
if (files.length === 0) throw new Error('No recorded video found');
const webm = resolve(videoDir, files[0]);
const framesDir = resolve(videoDir, 'frames');
await mkdir(framesDir, { recursive: true });
const fps = 10;
execFileSync('ffmpeg', [
  '-y', '-i', webm,
  '-vf', `fps=${fps},scale=960:-1:flags=lanczos`,
  resolve(framesDir, 'frame-%04d.png')
], { stdio: 'inherit' });
const frames = (await readdir(framesDir)).filter((f) => f.endsWith('.png')).sort();
if (frames.length === 0) throw new Error('No frames extracted');
execFileSync('img2webp', [
  '-loop', '0', '-lossy', '-q', '70',
  '-d', String(Math.round(1000 / fps)),
  ...frames.map((f) => resolve(framesDir, f)),
  '-o', outPath
], { stdio: 'inherit' });
console.log(`Saved animated demo (${frames.length} frames) to ${outPath}`);

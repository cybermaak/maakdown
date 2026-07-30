// Builds the landing page social preview from the real app icon and the
// canonical README screenshot. Run after capture-readme-screenshots.mjs.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const frontendRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(frontendRoot, '..');
const iconPath = resolve(
  repoRoot,
  'docs',
  'design-system',
  'maakdown.icon',
  'Assets',
  'maakdown_light.png'
);
const screenshotPath = resolve(repoRoot, 'docs', 'screenshots', 'reading-light.png');
const outputPath = resolve(repoRoot, 'site', 'social-preview.png');

function asDataUrl(bytes, type) {
  return `data:${type};base64,${bytes.toString('base64')}`;
}

const [icon, screenshot] = await Promise.all([
  readFile(iconPath),
  readFile(screenshotPath)
]);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars']
});

try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 640 },
    deviceScaleFactor: 2,
    colorScheme: 'light'
  });

  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          html, body { width: 1280px; height: 640px; margin: 0; }
          body {
            overflow: hidden;
            color: #232320;
            background: #f7f7f4;
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          main {
            position: relative;
            width: 100%;
            height: 100%;
            padding: 68px 64px;
          }
          .copy {
            position: relative;
            z-index: 2;
            width: 48%;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 18px;
          }
          .brand img {
            width: 76px;
            height: 76px;
            border-radius: 16px;
            box-shadow: 0 8px 28px rgba(35, 35, 32, .14);
          }
          .brand strong {
            font-size: 46px;
            line-height: 1;
          }
          .release {
            display: inline-block;
            margin-top: 36px;
            padding: 7px 12px;
            border: 1px solid #d8d8d2;
            border-radius: 999px;
            background: #fff;
            color: #075cc7;
            font-size: 15px;
            font-weight: 700;
          }
          h1 {
            max-width: 540px;
            margin: 18px 0 16px;
            font-size: 46px;
            line-height: 1.08;
            letter-spacing: 0;
          }
          p {
            max-width: 520px;
            margin: 0;
            color: #5f5e56;
            font-size: 21px;
            line-height: 1.45;
          }
          .platforms {
            margin-top: 28px;
            color: #232320;
            font-size: 16px;
            font-weight: 700;
          }
          .app {
            position: absolute;
            z-index: 1;
            top: 74px;
            left: 620px;
            width: 820px;
            height: 510px;
            overflow: hidden;
            border: 1px solid #d8d8d2;
            border-radius: 8px;
            background: #fff;
            box-shadow: 0 24px 64px rgba(35, 35, 32, .22);
            transform: rotate(-1.2deg);
          }
          .app img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: top left;
          }
        </style>
      </head>
      <body>
        <main>
          <div class="copy">
            <div class="brand">
              <img src="${asDataUrl(icon, 'image/png')}" alt="">
              <strong>Maakdown</strong>
            </div>
            <div class="release">v0.2.0 · Precision Reading &amp; Performance</div>
            <h1>Precision reading for Markdown.</h1>
            <p>Line-aware navigation, rich tables, code, math, diagrams, and a calm local-first workspace.</p>
            <div class="platforms">macOS · Windows · Linux &nbsp; · &nbsp; Free and open source</div>
          </div>
          <div class="app">
            <img src="${asDataUrl(screenshot, 'image/png')}" alt="">
          </div>
        </main>
      </body>
    </html>
  `);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: outputPath });
} finally {
  await browser.close();
}

console.log(`Saved landing page social preview to ${outputPath}`);

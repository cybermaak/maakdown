# Release Screenshot And Site Refresh

Use this checklist after a release candidate has passed CI and native screenshot
review. The public landing page lives in `site/` (singular) and is deployed to
GitHub Pages by `.github/workflows/pages.yml`.

## 1. Regenerate Canonical App Media

From `frontend/`, generate the screenshots and animated hero from the current
release source:

```bash
node scripts/capture-readme-screenshots.mjs
node scripts/capture-readme-demo.mjs
```

The screenshot script writes these canonical README images:

- `docs/screenshots/reading-light.png`
- `docs/screenshots/reading-dark.png`
- `docs/screenshots/code-and-math.png`
- `docs/screenshots/command-palette.png`

The demo script writes `docs/assets/maakdown_demo.webp`. It requires `ffmpeg`
and `img2webp`.

For release-specific native views such as tables and multi-tab state, use the
reviewed macOS artifact from the native screenshot workflow for the release
tag. Crop only the app window; do not retouch app content. Store the selected
images in `docs/screenshots/` with stable descriptive names.

## 2. Refresh Landing-Page Assets

Copy the canonical README images, selected native screenshots, and animated
demo into `site/` using the same filenames referenced by `site/index.html`.
Then regenerate the social preview:

```bash
cd frontend
node scripts/capture-site-social-preview.mjs
```

The social-preview script composes `site/social-preview.png` from the real app
icon and `docs/screenshots/reading-light.png`; it does not synthesize app UI.

## 3. Update Release Copy

Update both `README.md` and `site/index.html`:

- latest version and release name
- current headline and short description
- major user-facing changes since the previous release
- platform/download notes
- screenshot captions and alternative text
- metadata in the landing-page `<head>`

Keep the README and landing page consistent, but avoid copying the full release
notes into either surface.

## 4. Verify

Check every committed image visually, including the animated demo and social
preview. Confirm that removed features and stale version claims do not appear.
Then verify:

```bash
cd frontend
npm run check
npm run build
cd ..
git diff --check
```

Serve `site/` with a local static server and check desktop and narrow widths.
Confirm all local image references load and all external links use HTTPS.

## 5. Publish

Commit the README, site, scripts, documentation, and generated media as one
release-presentation update. A push to `main` containing `site/**` triggers the
GitHub Pages workflow. Confirm that workflow succeeds and inspect
`https://cybermaak.dev/maakdown/` after deployment.

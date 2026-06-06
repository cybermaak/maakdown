# Reader Evaluation Fixtures

`maakdown-reader-evaluation.md` and `large-10k-lines.md` are deterministic
large-document fixtures built
from the Maakdown product specification and implementation plan. It includes
frontmatter, callouts, tables, task lists, footnotes, internal anchors, local
images, KaTeX formulas, complex Mermaid diagrams, wikilinks, and code fences for
multiple programming and configuration languages.

Regenerate it from the repository root:

```bash
node tools/generate-reader-evaluation-fixture.mjs
```

The generator also produces:

- `small-readme.md`
- `medium-technical-doc.md`
- `large-10k-lines.md`

For browser-based renderer QA, start the frontend and open the development-only
fixture URL:

```bash
cd frontend
npm run dev -- --port 5174
```

Then visit:

```text
http://127.0.0.1:5174/?fixture=maakdown-reader-evaluation.md
```

The fixture endpoint is available only through the Vite development server and
only serves paths beneath `fixtures/`. Production builds continue to use the
normal Wails file and asset services.

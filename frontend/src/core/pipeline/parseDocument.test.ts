import { describe, expect, it } from 'vitest';
import { extractFrontmatter, parseDocument } from './parseDocument';
import { READER_BLOCK_ANCHOR } from '../reader/decorations';

describe('extractFrontmatter', () => {
  it('extracts YAML frontmatter and removes it from the body', () => {
    const result = extractFrontmatter('---\ntitle: Demo\ntags:\n  - docs\n---\n# Hello');

    expect(result.data).toEqual({ title: 'Demo', tags: ['docs'] });
    expect(result.body).toBe('# Hello');
  });
});

describe('parseDocument', () => {
  it('returns sanitized blocks, heading anchors, languages, and frontmatter', async () => {
    const model = await parseDocument({
      path: '/tmp/readme.md',
      source: [
        '---',
        'title: Test Doc',
        '---',
        '# Hello World',
        '',
        'Paragraph with <script>alert(1)</script> text.',
        '',
        '```ts',
        'const value = 1;',
        '```',
        '',
        '> [!NOTE]',
        '> Remember this.',
        ''
      ].join('\n')
    });

    expect(model.frontmatter.title).toBe('Test Doc');
    expect(model.headings[0]).toMatchObject({ id: 'hello-world', depth: 1, text: 'Hello World' });
    expect(model.anchors['hello-world']).toMatchObject({ blockId: 'block-1', kind: 'heading' });
    expect(model.languages).toEqual(['ts']);
    expect(model.blocks.some((block) => block.html.includes('<script>'))).toBe(false);
    expect(model.blocks.some((block) => block.kind === 'callout')).toBe(true);
  });

  it('records unresolved wikilinks', async () => {
    const model = await parseDocument({
      path: '/tmp/note.md',
      source: 'See [[Other Note]] and [[Daily Log]].'
    });

    expect(model.unresolvedWikilinks).toEqual(['Daily Log', 'Other Note']);
  });

  it('maps headings to their actual block after preceding prose', async () => {
    const model = await parseDocument({
      path: '/tmp/note.md',
      source: 'Intro paragraph.\n\n# Later heading'
    });

    expect(model.headings[0]?.blockId).toBe('block-2');
    expect(model.anchors['later-heading']?.blockId).toBe('block-2');
  });

  it('records source line metadata against the original document', async () => {
    const model = await parseDocument({
      path: '/tmp/note.md',
      source: [
        '---',
        'title: Source Lines',
        '---',
        '# Heading',
        '',
        'Paragraph text.',
        '',
        '```ts',
        'const value = 1;',
        '```'
      ].join('\n')
    });

    expect(model.sourceLineCount).toBe(10);
    expect(model.sourcePositionsEnabled).toBe(true);
    expect(model.blocks[0]).toMatchObject({ kind: 'heading', sourceStart: 4, sourceEnd: 4 });
    expect(model.blocks[1]).toMatchObject({ kind: 'paragraph', sourceStart: 6, sourceEnd: 6 });
    expect(model.blocks[2]).toMatchObject({ kind: 'code', sourceStart: 8, sourceEnd: 10 });
  });

  it('records per-item reader line labels for Markdown lists', async () => {
    const model = await parseDocument({
      path: '/tmp/list.md',
      source: [
        '## Checklist',
        '',
        '- First item',
        '- Second item',
        '  continues here',
        '- Third item'
      ].join('\n')
    });

    expect(model.blocks[1]).toMatchObject({
      kind: 'other',
      sourceStart: 3,
      sourceEnd: 6,
      sourceLines: [3, 4, 5, 6],
      sourceLineGroups: [[3], [4, 5], [6]]
    });
    expect(model.readerLineCount).toBe(4);
    expect(model.blocks[0]?.readerLines).toEqual([{ lineNumber: 1, anchorId: 'block-1-reader-line-1', kind: 'block' }]);
    expect(model.blocks[1]?.readerLines).toEqual([
      { lineNumber: 2, anchorId: 'block-2-reader-line-1', kind: 'list-item' },
      { lineNumber: 3, anchorId: 'block-2-reader-line-2', kind: 'list-item' },
      { lineNumber: 4, anchorId: 'block-2-reader-line-3', kind: 'list-item' }
    ]);
    expect(model.blocks[1]?.html).toContain('data-reader-line-anchor="block-2-reader-line-1"');
    expect(model.blocks[1]?.html).not.toContain('data-source-lines=');
  });

  it('keeps reader labels continuous when raw anchors and source blank lines precede lists', async () => {
    const model = await parseDocument({
      path: '/tmp/anchored-list.md',
      source: [
        '### Checkpoint',
        '',
        '<a id="checkpoint"></a>',
        '',
        'The checkpoint captures the operational contract:',
        '',
        '1. Parse and sanitize before HTML reaches the document surface.',
        '2. Preserve plain text and source code while enhancements are pending.',
        '3. Resolve navigation through stable document-model identifiers.'
      ].join('\n')
    });

    const list = model.blocks.find((block) => block.html.includes('<ol'));
    expect(model.blocks.map((block) => block.readerLines?.map((line) => line.lineNumber) ?? [])).toEqual([
      [1],
      [],
      [2],
      [3, 4, 5]
    ]);
    expect(list?.html).toContain('data-reader-line-anchor="block-4-reader-line-1"');
    expect(list?.html).toContain('data-reader-line-anchor="block-4-reader-line-2"');
    expect(list?.html).toContain('data-reader-line-anchor="block-4-reader-line-3"');
    expect(list?.html).not.toContain('data-source-lines=');
  });

  it('strips forged reader anchors before injecting trusted anchors', async () => {
    const model = await parseDocument({
      path: '/tmp/forged.md',
      source: '<p data-reader-line-anchor="forged">Trusted text.</p>'
    });

    expect(model.readerLineCount).toBe(1);
    expect(model.blocks[0]?.readerLines).toEqual([{ lineNumber: 1, anchorId: 'block-1-reader-line-1', kind: 'block' }]);
    expect(model.blocks[0]?.html).toContain('data-reader-line-anchor="block-1-reader-line-1"');
    expect(model.blocks[0]?.html).not.toContain('forged');
  });

  it('counts hard breaks as reader lines with trusted marker anchors', async () => {
    const model = await parseDocument({
      path: '/tmp/hard-break.md',
      source: 'First line<br><em>Second<br>Third</em>'
    });

    expect(model.readerLineCount).toBe(3);
    expect(model.blocks[0]?.readerLines).toEqual([
      { lineNumber: 1, anchorId: 'block-1-reader-line-1', kind: 'block' },
      { lineNumber: 2, anchorId: 'block-1-reader-line-2', kind: 'hard-break-segment' },
      { lineNumber: 3, anchorId: 'block-1-reader-line-3', kind: 'hard-break-segment' }
    ]);
    expect(model.blocks[0]?.html).toContain('<em>Second<br><span');
    expect(model.blocks[0]?.html).toContain('data-reader-line-anchor="block-1-reader-line-3"');
  });

  it('counts framed blocks once while leaving local code/table/diagram content separate', async () => {
    const model = await parseDocument({
      path: '/tmp/framed.md',
      source: [
        '## Framed',
        '',
        '```ts',
        'const a = 1;',
        'const b = 2;',
        '```',
        '',
        '| Name | Count |',
        '|---|---:|',
        '| Alpha | 2 |',
        '',
        '```mermaid',
        'flowchart LR',
        'A-->B',
        '```'
      ].join('\n')
    });

    expect(model.readerLineCount).toBe(4);
    expect(model.blocks.map((block) => block.kind)).toEqual(['heading', 'code', 'table', 'mermaid']);
    expect(model.blocks.map((block) => block.readerLines?.map((line) => line.lineNumber) ?? [])).toEqual([
      [1],
      [2],
      [3],
      [4]
    ]);
    expect(model.blocks[1]?.readerLines?.[0]).toMatchObject({ anchorId: READER_BLOCK_ANCHOR, kind: 'block' });
    expect(model.blocks[2]?.readerLines?.[0]).toMatchObject({ anchorId: READER_BLOCK_ANCHOR, kind: 'block' });
    expect(model.blocks[3]?.readerLines?.[0]).toMatchObject({ anchorId: READER_BLOCK_ANCHOR, kind: 'block' });
  });

  it('counts nested and multi-block list content as semantic reader lines', async () => {
    const model = await parseDocument({
      path: '/tmp/nested-list.md',
      source: [
        '- Parent item',
        '  - Nested child',
        '- Next item',
        '',
        '- Parent with paragraph',
        '',
        '  Continuation paragraph.',
        '- Final item'
      ].join('\n')
    });

    expect(model.readerLineCount).toBe(6);
    expect(model.blocks.map((block) => block.readerLines?.map((line) => line.lineNumber) ?? [])).toEqual([
      [1, 2, 3, 4, 5, 6]
    ]);
    expect(model.blocks[0]?.readerLines?.map((line) => line.kind)).toEqual(['list-item', 'list-item', 'list-item', 'list-item', 'block', 'list-item']);
  });

  it('recognizes sanitized GFM tables as table blocks', async () => {
    const model = await parseDocument({
      path: '/tmp/table.md',
      source: ['| Name | Count |', '|---|---:|', '| Alpha | 2 |'].join('\n')
    });

    expect(model.blocks[0]).toMatchObject({ kind: 'table', text: 'NameCountAlpha2' });
    expect(model.blocks[0]?.html).toContain('<table');
    expect(model.blocks[0]?.html).toContain('align="right"');
  });

  it('can disable source-position collection for benchmarks', async () => {
    const model = await parseDocument({
      path: '/tmp/note.md',
      source: '# Heading',
      collectSourcePositions: false
    });

    expect(model.sourcePositionsEnabled).toBe(false);
    expect(model.blocks[0]?.sourceStart).toBeUndefined();
  });

  it('resolves indexed wikilinks and marks missing notes', async () => {
    const model = await parseDocument({
      source: 'Open [[Known Note]] and [[Missing Note]].',
      path: '/tmp/test.md',
      vaultIndex: {
        version: 'v1',
        notes: { 'known note': '/vault/Known Note.md' }
      }
    });

    expect(model.blocks[0]?.html).toContain('data-note-path="/vault/Known Note.md"');
    expect(model.blocks[0]?.html).toContain('wikilink-unresolved');
    expect(model.unresolvedWikilinks).toEqual(['Missing Note']);
  });
});

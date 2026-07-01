import { describe, expect, it } from 'vitest';
import { extractFrontmatter, parseDocument } from './parseDocument';

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

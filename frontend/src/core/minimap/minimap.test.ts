import { describe, expect, it } from 'vitest';
import type { DocumentModel } from '../model/types';
import { buildSearchMinimapMarks, buildStructuralMinimapMarks } from './minimap';

const model = {
  blocks: [
    { id: 'h1', kind: 'heading', level: 1, html: '<h1>A</h1>', text: 'A', enhancement: 'none' },
    { id: 'p1', kind: 'paragraph', html: '<p>A</p>', text: 'A', enhancement: 'none' },
    { id: 'c1', kind: 'code', html: '<pre><code>x</code></pre>', text: 'x', enhancement: 'code' },
    { id: 'm1', kind: 'mermaid', html: '<pre><code>graph TD</code></pre>', text: 'graph TD', enhancement: 'mermaid' },
    { id: 't1', kind: 'table', html: '<table></table>', text: '', enhancement: 'none' }
  ],
  headings: [],
  anchors: {},
  footnotes: {},
  frontmatter: {},
  languages: [],
  unresolvedWikilinks: []
} satisfies DocumentModel;

describe('minimap projection', () => {
  it('projects structural marks from parsed blocks', () => {
    const marks = buildStructuralMinimapMarks(model);

    expect(marks.map((mark) => mark.kind)).toEqual(['heading', 'code', 'diagram', 'table']);
    expect(marks[0]).toMatchObject({ blockId: 'h1', blockIndex: 0, position: 0, depth: 1 });
    expect(marks.at(-1)).toMatchObject({ blockId: 't1', blockIndex: 4, position: 1 });
  });

  it('deduplicates search marks per block', () => {
    const marks = buildSearchMinimapMarks(model, [
      { blockId: 'p1', blockIndex: 1, start: 0, end: 1 },
      { blockId: 'p1', blockIndex: 1, start: 2, end: 3 },
      { blockId: 'm1', blockIndex: 3, start: 0, end: 5 }
    ]);

    expect(marks).toHaveLength(2);
    expect(marks.map((mark) => mark.blockId)).toEqual(['p1', 'm1']);
  });
});

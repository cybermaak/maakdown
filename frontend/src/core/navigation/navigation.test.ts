import { describe, expect, it } from 'vitest';
import type { DocumentModel } from '../model/types';
import { anchorIdFromHref, getActiveHeading, isInternalHref, resolveAnchor, restorePosition } from './navigation';

const model: DocumentModel = {
  blocks: [
    { id: 'block-1', kind: 'heading', html: '<h1 id="intro">Intro</h1>', enhancement: 'none' },
    { id: 'block-2', kind: 'paragraph', html: '<p>Body</p>', enhancement: 'none' },
    { id: 'block-3', kind: 'heading', html: '<h2 id="details">Details</h2>', enhancement: 'none' }
  ],
  headings: [
    { id: 'intro', blockId: 'block-1', depth: 1, text: 'Intro' },
    { id: 'details', blockId: 'block-3', depth: 2, text: 'Details' }
  ],
  anchors: {
    intro: { id: 'intro', blockId: 'block-1', kind: 'heading' },
    details: { id: 'details', blockId: 'block-3', kind: 'heading' }
  },
  footnotes: {},
  frontmatter: {},
  languages: [],
  unresolvedWikilinks: []
};

describe('navigation', () => {
  it('resolves anchors to block targets', () => {
    expect(resolveAnchor(model, 'details')).toEqual({ anchorId: 'details', blockId: 'block-3' });
    expect(resolveAnchor(model, 'missing')).toBeNull();
  });

  it('calculates active heading from visible block range', () => {
    expect(getActiveHeading(model, { startBlockId: 'block-2', endBlockId: 'block-2' })).toBe('intro');
    expect(getActiveHeading(model, { startBlockId: 'block-3', endBlockId: 'block-3' })).toBe('details');
  });

  it('restores by anchor before block fallback', () => {
    expect(restorePosition(model, { anchorId: 'details', blockId: 'block-1' })).toEqual({
      anchorId: 'details',
      blockId: 'block-3'
    });
  });

  it('parses internal hrefs', () => {
    expect(isInternalHref('#hello-world')).toBe(true);
    expect(isInternalHref('https://example.com')).toBe(false);
    expect(anchorIdFromHref('#hello%20world')).toBe('hello world');
  });
});

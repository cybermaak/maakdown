import { describe, expect, it } from 'vitest';
import { createHighlighter } from './highlighter';

describe('highlight.js highlighter', () => {
  it('highlights known languages and records timing', async () => {
    const highlighter = createHighlighter('highlightjs');
    await highlighter.init(['typescript'], 'light');
    const html = await highlighter.highlight('block-1', 'const answer: number = 42;', 'typescript');

    expect(html).toContain('hljs-keyword');
    expect(highlighter.timings()).toHaveLength(1);
  });
});

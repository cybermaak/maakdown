export interface Highlighter {
  init(languages: string[], theme: string): Promise<void>;
  highlight(blockId: string, code: string, lang: string): Promise<string>;
  setTheme(theme: string): Promise<void>;
  dispose(): Promise<void>;
}

export function createHighlighter(engine: 'highlightjs' | 'shiki-js-regex'): Highlighter {
  if (engine === 'shiki-js-regex') {
    return new PlainTextHighlighter();
  }
  return new PlainTextHighlighter();
}

class PlainTextHighlighter implements Highlighter {
  async init(): Promise<void> {}

  async highlight(blockId: string, code: string, lang: string): Promise<string> {
    return `<pre data-block-id="${blockId}"><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
  }

  async setTheme(): Promise<void> {}

  async dispose(): Promise<void> {}
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

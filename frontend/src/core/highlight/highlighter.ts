import hljs from 'highlight.js/lib/common';
import type { LanguageFn } from 'highlight.js';
import { buildShikiTheme } from './shikiTheme';

export interface HighlightTiming {
  blockId: string;
  engine: string;
  language: string;
  durationMs: number;
}

export interface Highlighter {
  init(languages: string[], theme: string): Promise<void>;
  highlight(blockId: string, code: string, lang: string): Promise<string>;
  setTheme(theme: string): Promise<void>;
  dispose(): Promise<void>;
  timings(): HighlightTiming[];
}

export function createHighlighter(engine: 'highlightjs' | 'shiki-js-regex'): Highlighter {
  const implementation = engine === 'shiki-js-regex' ? new ShikiJsRegexHighlighter() : new HighlightJsHighlighter();
  return new InstrumentedHighlighter(engine, implementation);
}

class HighlightJsHighlighter implements Highlighter {
  async init(): Promise<void> {
    ensureMermaidLanguage();
  }

  async highlight(blockId: string, code: string, lang: string): Promise<string> {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    const result = hljs.highlight(code, { language, ignoreIllegals: true });
    return `<pre data-highlight-engine="highlightjs" data-block-id="${escapeAttribute(blockId)}"><code class="hljs language-${escapeAttribute(language)}">${result.value}</code></pre>`;
  }

  async setTheme(): Promise<void> {}
  async dispose(): Promise<void> {}
  timings(): HighlightTiming[] {
    return [];
  }
}

let mermaidRegistered = false;

function ensureMermaidLanguage() {
  if (mermaidRegistered || hljs.getLanguage('mermaid')) {
    mermaidRegistered = true;
    return;
  }
  hljs.registerLanguage('mermaid', mermaidLanguage);
  mermaidRegistered = true;
}

const mermaidLanguage: LanguageFn = (api) => ({
  name: 'Mermaid',
  case_insensitive: true,
  contains: [
    api.COMMENT('%%', '$'),
    {
      className: 'keyword',
      begin: /\b(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|quadrantChart|requirementDiagram|gitGraph|C4Context|C4Container|C4Component|C4Dynamic|block-beta|subgraph|end|participant|actor|autonumber|loop|alt|else|opt|par|and|rect|critical|break|Note|note|over|right|left|of|direction|section|title|accTitle|accDescr)\b/
    },
    {
      className: 'literal',
      begin: /\b(?:LR|RL|TB|TD|BT|true|false)\b/
    },
    {
      className: 'string',
      begin: /"/,
      end: /"/,
      contains: [{ begin: /\\"/ }]
    },
    {
      className: 'number',
      begin: api.C_NUMBER_RE
    },
    {
      className: 'symbol',
      begin: /(?:-->|---|==>|-.->|--|->>|-->>|<<-|<-->|:::)/
    },
    {
      className: 'title',
      begin: /\b[A-Za-z_][\w-]*(?=\s*(?:\[|\(|\{|-->|---|==>|-.->|:::|:))/
    },
    {
      className: 'attr',
      begin: /\b(?:class|style|linkStyle|click)\b/
    }
  ]
});

class ShikiJsRegexHighlighter implements Highlighter {
  private highlighter: import('shiki').Highlighter | null = null;
  private themeName = '';

  async init(languages: string[], theme: string): Promise<void> {
    const shiki = await import('shiki');
    const registration = buildShikiTheme(theme === 'dark' ? 'dark' : 'light');
    this.themeName = registration.name;
    const supported = languages.filter((language) => language in shiki.bundledLanguages);
    this.highlighter = await shiki.createHighlighter({
      themes: [registration],
      langs: supported.length > 0 ? supported : ['text'],
      engine: shiki.createJavaScriptRegexEngine()
    });
  }

  async highlight(blockId: string, code: string, lang: string): Promise<string> {
    if (!this.highlighter) {
      await this.init([lang], 'light');
    }
    const loaded = this.highlighter!.getLoadedLanguages();
    const language = loaded.includes(lang) ? lang : 'text';
    const html = this.highlighter!.codeToHtml(code, {
      lang: language,
      theme: this.themeName
    });
    return html.replace(
      '<pre',
      `<pre data-block-id="${escapeAttribute(blockId)}" data-highlight-engine="shiki-js-regex"`
    );
  }

  async setTheme(theme: string): Promise<void> {
    if (!this.highlighter) {
      return;
    }
    // Rebuild from the live reader tokens so Shiki tracks the active app theme.
    const registration = buildShikiTheme(theme === 'dark' ? 'dark' : 'light');
    await this.highlighter.loadTheme(registration);
    this.themeName = registration.name;
  }

  async dispose(): Promise<void> {
    this.highlighter?.dispose();
    this.highlighter = null;
  }

  timings(): HighlightTiming[] {
    return [];
  }
}

class InstrumentedHighlighter implements Highlighter {
  private samples: HighlightTiming[] = [];

  constructor(
    private engine: string,
    private delegate: Highlighter
  ) {}

  init(languages: string[], theme: string): Promise<void> {
    return this.delegate.init(languages, theme);
  }

  async highlight(blockId: string, code: string, lang: string): Promise<string> {
    const started = performance.now();
    const html = await this.delegate.highlight(blockId, code, lang);
    this.samples.push({
      blockId,
      engine: this.engine,
      language: lang,
      durationMs: performance.now() - started
    });
    return html;
  }

  setTheme(theme: string): Promise<void> {
    return this.delegate.setTheme(theme);
  }

  dispose(): Promise<void> {
    return this.delegate.dispose();
  }

  timings(): HighlightTiming[] {
    return [...this.samples];
  }
}

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

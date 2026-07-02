import type { Block } from '../model/types';
import { createHighlighter, type Highlighter, type HighlightTiming } from '../highlight/highlighter';
import { MermaidManager } from '../mermaid/mermaidManager';

class EnhancementManager {
  private highlighter: Highlighter | null = null;
  private engine: 'highlightjs' | 'shiki-js-regex' = 'highlightjs';
  private theme = 'light';
  private languages: string[] = [];
  private mermaid = new MermaidManager();
  private cache = new Map<string, string>();
  private configuration: Promise<void> = Promise.resolve();

  configure(engine: 'highlightjs' | 'shiki-js-regex', theme: string, languages: string[]) {
    this.configuration = this.configuration.then(() => this.configureNow(engine, theme, languages));
    return this.configuration;
  }

  private async configureNow(engine: 'highlightjs' | 'shiki-js-regex', theme: string, languages: string[]) {
    const engineChanged = engine !== this.engine || !this.highlighter;
    this.engine = engine;
    this.theme = theme;
    this.languages = languages;
    if (engineChanged) {
      await this.highlighter?.dispose();
      this.highlighter = createHighlighter(engine);
      await this.highlighter.init(languages, theme);
      this.cache.clear();
    } else {
      await this.highlighter!.setTheme(theme);
    }
    await this.mermaid.setTheme(theme);
  }

  async enhance(block: Block): Promise<string> {
    await this.configuration;
    const content = block.text ?? block.html;
    const key = `${this.engine}:${this.theme}:${block.enhancement}:${block.language ?? ''}:${block.id}:${contentFingerprint(content)}`;
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    let html = block.html;
    if (block.enhancement === 'code') {
      if (!this.highlighter) {
        await this.configure(this.engine, this.theme, this.languages);
      }
      html = await this.highlighter!.highlight(block.id, block.text ?? '', block.language ?? 'plaintext');
    } else if (block.enhancement === 'mermaid') {
      html = await this.mermaid.render(block.id, block.text ?? '');
    }
    this.cache.set(key, html);
    return html;
  }

  async highlightSource(blockId: string, code: string, language: string): Promise<string> {
    await this.configuration;
    const key = `${this.engine}:${this.theme}:source:${language}:${blockId}:${contentFingerprint(code)}`;
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }
    if (!this.highlighter) {
      await this.configure(this.engine, this.theme, this.languages);
    }
    const html = await this.highlighter!.highlight(blockId, code, language);
    this.cache.set(key, html);
    return html;
  }

  clear() {
    this.cache.clear();
  }

  timings(): HighlightTiming[] {
    return this.highlighter?.timings() ?? [];
  }
}

export const enhancementManager = new EnhancementManager();

export function contentFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${value.length}-${(hash >>> 0).toString(36)}`;
}

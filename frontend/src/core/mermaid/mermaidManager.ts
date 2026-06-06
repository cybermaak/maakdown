export type MermaidTheme = 'default' | 'dark';

export class MermaidManager {
  private module: typeof import('mermaid').default | null = null;
  private theme: MermaidTheme = 'default';
  private generation = 0;

  async render(blockId: string, source: string): Promise<string> {
    const mermaid = await this.load();
    const id = `mermaid-${sanitizeId(blockId)}-${this.generation++}`;
    try {
      const result = await mermaid.render(id, source);
      return `<div class="mermaid-rendered" data-mermaid-block="${sanitizeId(blockId)}">${result.svg}</div>`;
    } catch (error) {
      return `<pre class="mermaid-error"><code>${escapeHtml(error instanceof Error ? error.message : String(error))}</code></pre>`;
    }
  }

  async setTheme(theme: string): Promise<void> {
    const next = theme === 'dark' ? 'dark' : 'default';
    if (next === this.theme && this.module) {
      return;
    }
    this.theme = next;
    if (this.module) {
      this.initialize(this.module);
    }
  }

  private async load() {
    if (!this.module) {
      this.module = (await import('mermaid')).default;
      this.initialize(this.module);
    }
    return this.module;
  }

  private initialize(mermaid: typeof import('mermaid').default) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: this.theme,
      suppressErrorRendering: true,
      flowchart: { htmlLabels: false, useMaxWidth: true }
    });
  }
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

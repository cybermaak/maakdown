import { mermaidThemeVariables, type ResolvedTheme } from '../theme/readerTheme';

export class MermaidManager {
  private module: typeof import('mermaid').default | null = null;
  private theme: ResolvedTheme = 'light';
  private generation = 0;

  async render(blockId: string, source: string): Promise<string> {
    const mermaid = await this.load();
    await fontsReady();
    const id = `mermaid-${sanitizeId(blockId)}-${this.generation++}`;
    try {
      const result = await mermaid.render(id, source);
      const prepared = prepareSvg(result.svg);
      const className = prepared.scrollable
        ? 'mermaid-rendered mermaid-rendered-scrollable'
        : 'mermaid-rendered';
      return `<div class="${className}" data-mermaid-block="${sanitizeId(blockId)}">${prepared.svg}</div>`;
    } catch (error) {
      return `<pre class="mermaid-error"><code>${escapeHtml(error instanceof Error ? error.message : String(error))}</code></pre>`;
    }
  }

  async setTheme(theme: string): Promise<void> {
    const next = theme === 'dark' ? 'dark' : 'light';
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
      theme: 'base',
      themeVariables: mermaidThemeVariables(this.theme),
      suppressErrorRendering: true,
      flowchart: { htmlLabels: false, useMaxWidth: true },
      sequence: { useMaxWidth: true },
      state: { useMaxWidth: true }
    });
  }
}

interface PreparedSvg {
  svg: string;
  scrollable: boolean;
}

export function prepareSvg(svg: string, windows = isWindowsPlatform()): PreparedSvg {
  if (!windows || typeof document === 'undefined') {
    return { svg, scrollable: false };
  }

  const template = document.createElement('template');
  template.innerHTML = svg.trim();
  const root = template.content.firstElementChild;
  if (!(root instanceof SVGSVGElement)) {
    return { svg, scrollable: false };
  }

  const viewBox = parseViewBox(root.getAttribute('viewBox'));
  if (!viewBox) {
    return { svg, scrollable: false };
  }

  const padding = 24;
  const expandedWidth = viewBox.width + padding * 2;
  const expandedHeight = viewBox.height + padding * 2;
  root.setAttribute(
    'viewBox',
    `${viewBox.x - padding} ${viewBox.y - padding} ${expandedWidth} ${expandedHeight}`
  );
  root.style.maxWidth = `${expandedWidth}px`;

  const role = root.getAttribute('aria-roledescription') ?? '';
  const scrollable = role.startsWith('flowchart') && expandedWidth > 1600;
  if (scrollable) {
    const readableWidth = Math.round(expandedWidth * 0.65);
    root.style.width = `${readableWidth}px`;
    root.style.maxWidth = 'none';
    root.style.height = 'auto';
  }

  return { svg: root.outerHTML, scrollable };
}

async function fontsReady(): Promise<void> {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (!fonts) {
    return;
  }
  try {
    await fonts.ready;
  } catch {
    // Font loading is best-effort; render with whatever is available.
  }
}

function parseViewBox(value: string | null) {
  const parts = value?.trim().split(/[\s,]+/).map(Number);
  if (!parts || parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  const [x, y, width, height] = parts;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { x, y, width, height };
}

function isWindowsPlatform(): boolean {
  return typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent);
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

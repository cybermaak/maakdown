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
      htmlLabels: !isWindowsPlatform(),
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

export function prepareSvg(
  svg: string,
  windows = isWindowsPlatform(),
  deviceScale = currentDeviceScale()
): PreparedSvg {
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
  const fixedCanvas = ['stateDiagram', 'class', 'er'].includes(role);
  if (fixedCanvas) {
    root.style.width = `${Math.round(expandedWidth)}px`;
    root.style.height = `${Math.round(expandedHeight)}px`;
    root.style.maxWidth = 'none';
  } else if (scrollable) {
    const scale = normalizeDeviceScale(deviceScale);
    const readableWidth = Math.round(expandedWidth / scale);
    const readableHeight = Math.round(expandedHeight / scale);
    root.style.width = `${readableWidth}px`;
    root.style.height = `${readableHeight}px`;
    root.style.maxWidth = 'none';
  }

  return { svg: root.outerHTML, scrollable };
}

export async function stabilizeMountedMermaid(host: HTMLElement): Promise<void> {
  if (!isWindowsPlatform()) {
    return;
  }

  const svg = host.querySelector<SVGSVGElement>('.mermaid-rendered svg');
  const role = svg?.getAttribute('aria-roledescription') ?? '';
  if (!svg || !['stateDiagram', 'class', 'er'].includes(role)) {
    return;
  }

  await fontsReady();
  await nextFrame();
  await nextFrame();

  const classBounds = role === 'class' ? stabilizeClassRanks(svg) : null;
  if (classBounds) {
    await nextFrame();
  }

  const graph = svg.querySelector<SVGGElement>(':scope > g');
  if (!graph) {
    return;
  }

  let bounds: { x: number; y: number; width: number; height: number };
  if (classBounds) {
    bounds = classBounds;
  } else {
    try {
      bounds = graph.getBBox();
    } catch {
      return;
    }
  }
  if (
    !Number.isFinite(bounds.x) ||
    !Number.isFinite(bounds.y) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return;
  }

  const padding = 24;
  const width = Math.ceil(bounds.width + padding * 2);
  const height = Math.ceil(bounds.height + padding * 2);
  svg.setAttribute(
    'viewBox',
    `${bounds.x - padding} ${bounds.y - padding} ${width} ${height}`
  );
  svg.style.width = `${width}px`;
  svg.style.height = `${height}px`;
  svg.style.maxWidth = 'none';
}

function stabilizeClassRanks(
  svg: SVGSVGElement
): { x: number; y: number; width: number; height: number } | null {
  const root = svg.querySelector<SVGGElement>('g.root');
  const nodes = Array.from(svg.querySelectorAll<SVGGElement>('g.nodes > g.node'))
    .map((node) => {
      const position = parseTranslate(node.getAttribute('transform'));
      if (!position) {
        return null;
      }
      try {
        removeEmptyClassCompartment(node);
        const bounds = node.getBBox();
        replaceClassOuterPath(node, bounds);
        return { node, position, bounds };
      } catch {
        return null;
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  if (!root || nodes.length < 2) {
    return null;
  }

  const ranks: Array<{ y: number; height: number }> = [];
  for (const item of nodes.sort((a, b) => a.position.y - b.position.y)) {
    const rank = ranks.find((candidate) => Math.abs(candidate.y - item.position.y) < 1);
    if (rank) {
      rank.height = Math.max(rank.height, item.bounds.height);
    } else {
      ranks.push({ y: item.position.y, height: item.bounds.height });
    }
  }
  if (ranks.length < 2) {
    return null;
  }

  let verticalScale = 1;
  for (let index = 1; index < ranks.length; index += 1) {
    const previous = ranks[index - 1];
    const current = ranks[index];
    const distance = current.y - previous.y;
    if (distance <= 0) {
      continue;
    }
    const required = previous.height / 2 + current.height / 2 + 50;
    verticalScale = Math.max(verticalScale, required / distance);
  }
  if (!Number.isFinite(verticalScale) || verticalScale <= 1.05) {
    return null;
  }

  const originY = ranks[0].y;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const item of nodes) {
    const adjustedY = originY + (item.position.y - originY) * verticalScale;
    item.node.setAttribute(
      'transform',
      `translate(${item.position.x}, ${adjustedY})`
    );
    minX = Math.min(minX, item.position.x + item.bounds.x);
    minY = Math.min(minY, adjustedY + item.bounds.y);
    maxX = Math.max(maxX, item.position.x + item.bounds.x + item.bounds.width);
    maxY = Math.max(maxY, adjustedY + item.bounds.y + item.bounds.height);
  }
  const layerTransform = `translate(0 ${originY}) scale(1 ${verticalScale}) translate(0 ${-originY})`;
  for (const selector of ['g.edgePaths', 'g.edgeLabels', 'g.clusters']) {
    root.querySelector<SVGGElement>(selector)?.setAttribute('transform', layerTransform);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function removeEmptyClassCompartment(node: SVGGElement): void {
  const methods = node.querySelector('.methods-group');
  const dividers = node.querySelectorAll<SVGGElement>('.divider');
  if (methods?.querySelector('.label') || dividers.length < 2) {
    return;
  }
  dividers[dividers.length - 1].remove();
}

function replaceClassOuterPath(node: SVGGElement, bounds: DOMRect): void {
  const outer = node.querySelector<SVGGElement>('.outer-path');
  const paths = outer ? Array.from(outer.querySelectorAll('path')) : [];
  if (!outer || paths.length === 0) {
    return;
  }

  const fillPath = paths.find((path) => path.getAttribute('fill') !== 'none');
  const strokePath = paths.find((path) => path.getAttribute('stroke') !== 'none');
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', `${bounds.x}`);
  rect.setAttribute('y', `${bounds.y}`);
  rect.setAttribute('width', `${bounds.width}`);
  rect.setAttribute('height', `${bounds.height}`);
  rect.setAttribute('fill', fillPath?.getAttribute('fill') ?? 'none');
  rect.setAttribute('stroke', strokePath?.getAttribute('stroke') ?? 'currentColor');
  rect.setAttribute('stroke-width', strokePath?.getAttribute('stroke-width') ?? '1');
  outer.replaceChildren(rect);
}

function parseTranslate(value: string | null): { x: number; y: number } | null {
  const match = value?.match(/translate\(\s*([^,\s]+)[,\s]+([^)\s]+)\s*\)/);
  if (!match) {
    return null;
  }
  const x = Number(match[1]);
  const y = Number(match[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
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

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
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

function currentDeviceScale(): number {
  return typeof window !== 'undefined' ? window.devicePixelRatio : 1;
}

function normalizeDeviceScale(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

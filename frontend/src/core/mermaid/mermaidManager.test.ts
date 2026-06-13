import { describe, expect, it } from 'vitest';
import { prepareSvg } from './mermaidManager';

describe('prepareSvg', () => {
  it('leaves non-Windows SVG output unchanged', () => {
    const svg = '<svg viewBox="0 0 100 50"></svg>';
    expect(prepareSvg(svg, false)).toEqual({ svg, scrollable: false });
  });

  it('adds a Windows viewBox gutter without changing normal diagram sizing mode', () => {
    const prepared = prepareSvg(
      '<svg viewBox="0 0 700 500" style="max-width: 700px" aria-roledescription="stateDiagram"></svg>',
      true
    );
    const root = parseSvg(prepared.svg);
    expect(root.getAttribute('viewBox')).toBe('-24 -24 748 548');
    expect(root.style.maxWidth).toBe('748px');
    expect(prepared.scrollable).toBe(false);
  });

  it('keeps very wide Windows flowcharts readable inside their own scroller', () => {
    const prepared = prepareSvg(
      '<svg viewBox="0 0 2500 400" style="max-width: 2500px" aria-roledescription="flowchart-v2"></svg>',
      true
    );
    const root = parseSvg(prepared.svg);
    expect(root.style.width).toBe('1656px');
    expect(root.style.maxWidth).toBe('none');
    expect(prepared.scrollable).toBe(true);
  });
});

function parseSvg(svg: string): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML = svg;
  return template.content.firstElementChild as SVGSVGElement;
}

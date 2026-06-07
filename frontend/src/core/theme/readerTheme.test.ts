import { describe, expect, it } from 'vitest';
import { mermaidThemeVariables } from './readerTheme';

describe('reader theme contract', () => {
  it('keeps Mermaid palettes distinct and semantic across modes', () => {
    const light = mermaidThemeVariables('light');
    const dark = mermaidThemeVariables('dark');
    expect(light.mainBkg).not.toBe(dark.mainBkg);
    expect(light.primaryTextColor).not.toBe(dark.primaryTextColor);
    expect(light.mainBkg).not.toBe('#ececff');
  });
});

import { writable } from 'svelte/store';

export interface AppConfig {
  theme: 'system' | 'light' | 'dark';
  highlighterEngine: 'highlightjs' | 'shiki-js-regex';
  frontmatterDisplay: 'panel' | 'hidden';
  readerTheme: 'editorial' | 'high-contrast';
  readerFont: 'sans' | 'serif';
  readerFontSize: number;
  readerLineHeight: 'compact' | 'comfortable' | 'relaxed';
  readerMeasure: 'narrow' | 'standard' | 'wide';
  focusMode: boolean;
  outlineVisible: boolean;
  outlineWidth: number;
  metadataWidth: number;
  documentLineNumbers: boolean;
  codeLineNumbers: boolean;
  codeWrap: boolean;
  printMetadata: boolean;
  tableConstrainToMeasure: boolean;
  tableColumnSizing: 'balanced' | 'equal';
}

export const appConfig = writable<AppConfig>({
  theme: 'system',
  highlighterEngine: 'highlightjs',
  frontmatterDisplay: 'panel',
  readerTheme: 'editorial',
  readerFont: 'sans',
  readerFontSize: 15,
  readerLineHeight: 'comfortable',
  readerMeasure: 'standard',
  focusMode: false,
  outlineVisible: true,
  outlineWidth: 280,
  metadataWidth: 260,
  documentLineNumbers: false,
  codeLineNumbers: false,
  codeWrap: true,
  printMetadata: true,
  tableConstrainToMeasure: false,
  tableColumnSizing: 'balanced'
});

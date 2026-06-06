import { writable } from 'svelte/store';

export interface AppConfig {
  theme: 'system' | 'light' | 'dark';
  highlighterEngine: 'highlightjs' | 'shiki-js-regex';
  frontmatterDisplay: 'panel' | 'hidden';
  readerTheme: 'editorial';
  readerFont: 'sans' | 'serif';
  readerFontSize: number;
  readerLineHeight: 'compact' | 'comfortable' | 'relaxed';
  readerMeasure: 'narrow' | 'standard' | 'wide';
  focusMode: boolean;
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
  focusMode: false
});

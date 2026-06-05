import { writable } from 'svelte/store';

export interface AppConfig {
  theme: 'system' | 'light' | 'dark';
  highlighterEngine: 'highlightjs' | 'shiki-js-regex';
  frontmatterDisplay: 'panel' | 'hidden';
}

export const appConfig = writable<AppConfig>({
  theme: 'system',
  highlighterEngine: 'highlightjs',
  frontmatterDisplay: 'panel'
});

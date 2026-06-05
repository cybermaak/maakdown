export type ThemeName = 'system' | 'light' | 'dark';

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}

export type ReaderThemeName = 'editorial' | 'high-contrast';
export type ResolvedTheme = 'light' | 'dark';

export interface MermaidPalette {
  background: string;
  primaryColor: string;
  primaryTextColor: string;
  primaryBorderColor: string;
  secondaryColor: string;
  secondaryTextColor: string;
  secondaryBorderColor: string;
  tertiaryColor: string;
  tertiaryTextColor: string;
  tertiaryBorderColor: string;
  lineColor: string;
  textColor: string;
  mainBkg: string;
  nodeBorder: string;
  clusterBkg: string;
  clusterBorder: string;
  edgeLabelBackground: string;
  noteBkgColor: string;
  noteTextColor: string;
  noteBorderColor: string;
}

const palettes: Record<ResolvedTheme, MermaidPalette> = {
  light: {
    background: '#ffffff',
    primaryColor: '#edf4ef',
    primaryTextColor: '#232320',
    primaryBorderColor: '#557063',
    secondaryColor: '#eef4fb',
    secondaryTextColor: '#232320',
    secondaryBorderColor: '#5f7894',
    tertiaryColor: '#f7f3e4',
    tertiaryTextColor: '#232320',
    tertiaryBorderColor: '#8a762e',
    lineColor: '#62685f',
    textColor: '#232320',
    mainBkg: '#edf4ef',
    nodeBorder: '#557063',
    clusterBkg: '#faf9f4',
    clusterBorder: '#c8c8c0',
    edgeLabelBackground: '#ffffff',
    noteBkgColor: '#fff8d8',
    noteTextColor: '#39372f',
    noteBorderColor: '#b49b3f'
  },
  dark: {
    background: '#191c1a',
    primaryColor: '#26342d',
    primaryTextColor: '#edf0ea',
    primaryBorderColor: '#7ea18e',
    secondaryColor: '#26323e',
    secondaryTextColor: '#edf0ea',
    secondaryBorderColor: '#83a6c8',
    tertiaryColor: '#3b3522',
    tertiaryTextColor: '#f1ead0',
    tertiaryBorderColor: '#c7aa4d',
    lineColor: '#a9b0a7',
    textColor: '#edf0ea',
    mainBkg: '#26342d',
    nodeBorder: '#7ea18e',
    clusterBkg: '#202320',
    clusterBorder: '#4b554c',
    edgeLabelBackground: '#202320',
    noteBkgColor: '#40391f',
    noteTextColor: '#f1ead0',
    noteBorderColor: '#c7aa4d'
  }
};

export function resolveTheme(theme: 'system' | ResolvedTheme): ResolvedTheme {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyReaderTheme(name: ReaderThemeName, mode: ResolvedTheme): void {
  document.documentElement.dataset.readerTheme = name;
  document.documentElement.dataset.readerMode = mode;
}

export function mermaidThemeVariables(mode: ResolvedTheme): MermaidPalette {
  return palettes[mode];
}

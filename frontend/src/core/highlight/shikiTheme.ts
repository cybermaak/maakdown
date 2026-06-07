/**
 * Builds a Shiki TextMate theme from the application's live semantic reader
 * tokens (`--syntax-*`, `--reader-code-*`). This keeps Shiki output aligned with
 * the same palette highlight.js consumes through `.hljs-*` rules, so switching
 * highlighter engines or themes never changes the reader's color language.
 *
 * The theme is rebuilt from `getComputedStyle` each time the mode changes, so it
 * always reflects the currently resolved light/dark token values.
 */
export interface ShikiThemeRegistration {
  name: string;
  type: 'light' | 'dark';
  colors: Record<string, string>;
  settings: Array<{ scope?: string | string[]; settings: { foreground?: string; background?: string; fontStyle?: string } }>;
}

// Fallbacks mirror the light tokens in tokens.css so a theme is always valid
// even if a custom property cannot be resolved (e.g. during teardown).
const fallback = {
  bg: '#f6f7f4',
  fg: '#252824',
  comment: '#6f786e',
  keyword: '#a32828',
  string: '#39733b',
  number: '#8a5b12',
  title: '#245f9b',
  builtIn: '#7548a6',
  attribute: '#176f67',
  variable: '#855818'
};

let counter = 0;

function token(name: string, fallbackValue: string): string {
  if (typeof document === 'undefined') return fallbackValue;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallbackValue;
}

export function buildShikiTheme(mode: 'light' | 'dark'): ShikiThemeRegistration {
  const palette = {
    bg: token('--reader-code-bg', fallback.bg),
    fg: token('--reader-code-text', fallback.fg),
    comment: token('--syntax-comment', fallback.comment),
    keyword: token('--syntax-keyword', fallback.keyword),
    string: token('--syntax-string', fallback.string),
    number: token('--syntax-number', fallback.number),
    title: token('--syntax-title', fallback.title),
    builtIn: token('--syntax-built-in', fallback.builtIn),
    attribute: token('--syntax-attribute', fallback.attribute),
    variable: token('--syntax-variable', fallback.variable)
  };

  counter += 1;
  return {
    name: `maakdown-${mode}-${counter}`,
    type: mode,
    colors: {
      'editor.background': palette.bg,
      'editor.foreground': palette.fg
    },
    settings: [
      { settings: { foreground: palette.fg, background: palette.bg } },
      { scope: ['comment', 'punctuation.definition.comment', 'string.comment'], settings: { foreground: palette.comment, fontStyle: 'italic' } },
      {
        scope: ['keyword', 'keyword.control', 'storage', 'storage.type', 'storage.modifier', 'keyword.operator.expression', 'keyword.operator.new', 'markup.deleted'],
        settings: { foreground: palette.keyword }
      },
      { scope: ['string', 'string.quoted', 'string.template', 'constant.character.escape', 'markup.inserted'], settings: { foreground: palette.string } },
      { scope: ['constant.numeric', 'constant.language', 'constant.other', 'keyword.other.unit'], settings: { foreground: palette.number } },
      {
        scope: ['entity.name.function', 'support.function', 'entity.name.class', 'meta.function-call.generic', 'entity.name.section', 'markup.heading'],
        settings: { foreground: palette.title }
      },
      { scope: ['support.type', 'support.class', 'entity.name.type', 'entity.other.inherited-class', 'support.constant'], settings: { foreground: palette.builtIn } },
      { scope: ['entity.other.attribute-name', 'entity.name.tag', 'support.attribute', 'meta.attribute'], settings: { foreground: palette.attribute } },
      { scope: ['variable', 'variable.other', 'variable.parameter', 'meta.definition.variable', 'variable.language'], settings: { foreground: palette.variable } }
    ]
  };
}

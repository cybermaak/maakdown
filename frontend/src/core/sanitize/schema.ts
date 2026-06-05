import { defaultSchema } from 'rehype-sanitize';

const classNames = [
  'katex',
  'katex-display',
  'katex-html',
  'katex-mathml',
  'language-*',
  'math',
  'math-inline',
  'math-display',
  'callout',
  'callout-title',
  'callout-body',
  'callout-note',
  'callout-tip',
  'callout-important',
  'callout-warning',
  'callout-caution'
];

export const sanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: 'md-',
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      ['className', ...classNames],
      ['id'],
      ['dataBlockId'],
      ['dataAssetRef']
    ],
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ['href'],
      ['title'],
      ['ariaLabel'],
      ['dataAnchorId']
    ],
    code: [...(defaultSchema.attributes?.code ?? []), ['className', 'language-*']],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      ['src'],
      ['alt'],
      ['title'],
      ['loading'],
      ['dataAssetRef']
    ]
  }
};

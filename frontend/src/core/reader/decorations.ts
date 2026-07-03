export const READER_BLOCK_ANCHOR = '__block';
export const READER_LINE_ANCHOR_PROPERTY = 'dataReaderLineAnchor';
export const READER_LINE_ANCHOR_ATTRIBUTE = 'data-reader-line-anchor';
export const READER_LINE_LABEL_CLASS = 'reader-line';

export const READER_COPY_EXCLUDED_CLASSES = [
  READER_LINE_LABEL_CLASS,
  'code-line-number',
  'table-row-number',
  'table-row-number-heading'
] as const;

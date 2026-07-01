export type ReaderErrorKind = 'missing' | 'permission' | 'oversized' | 'unsupported' | 'parse' | 'watcher' | 'asset' | 'enhancement' | 'unknown';

export interface ReaderErrorPresentation {
  kind: ReaderErrorKind;
  title: string;
  message: string;
  retryable: boolean;
}

export function presentReaderError(error: unknown): ReaderErrorPresentation {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  if (/not found|no such file|missing/.test(normalized)) return { kind: 'missing', title: 'Document not found', message: 'The file moved or is no longer available. Locate it to keep this tab.', retryable: true };
  if (/permission|denied|unauthorized/.test(normalized)) return { kind: 'permission', title: 'Permission required', message: 'Maakdown cannot read this document yet. Update file permissions, then retry.', retryable: true };
  if (/too large|oversized|size limit/.test(normalized)) return { kind: 'oversized', title: 'Document is too large', message: 'This document is outside the current reader safety limit.', retryable: false };
  if (/unsupported|extension|file type/.test(normalized)) return { kind: 'unsupported', title: 'Unsupported document', message: 'This file is not a supported Markdown document.', retryable: false };
  if (/parse|markdown/.test(normalized)) return { kind: 'parse', title: 'Document could not be rendered', message: 'The Markdown parser stopped before the document could be shown. Retry after checking the file.', retryable: true };
  if (/watch|stale/.test(normalized)) return { kind: 'watcher', title: 'Live reload stopped', message: 'The document is still open, but live reload needs to reconnect.', retryable: true };
  if (/mermaid|highlight|shiki|katex|enhance/.test(normalized)) return { kind: 'enhancement', title: 'A rich block failed', message: 'The document is still readable; retry to re-run code, math, or diagram enhancement.', retryable: true };
  if (/asset|image|blocked/.test(normalized)) return { kind: 'asset', title: 'A local asset was blocked', message: 'A referenced image or local asset could not be loaded safely.', retryable: true };
  return { kind: 'unknown', title: 'Could not open document', message, retryable: true };
}

export type ReaderErrorKind = 'missing' | 'permission' | 'oversized' | 'unsupported' | 'parse' | 'watcher' | 'asset' | 'unknown';

export interface ReaderErrorPresentation {
  kind: ReaderErrorKind;
  title: string;
  message: string;
  retryable: boolean;
}

export function presentReaderError(error: unknown): ReaderErrorPresentation {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  if (/not found|no such file|missing/.test(normalized)) return { kind: 'missing', title: 'Document not found', message, retryable: true };
  if (/permission|denied|unauthorized/.test(normalized)) return { kind: 'permission', title: 'Permission required', message, retryable: true };
  if (/too large|oversized|size limit/.test(normalized)) return { kind: 'oversized', title: 'Document is too large', message, retryable: false };
  if (/unsupported|extension|file type/.test(normalized)) return { kind: 'unsupported', title: 'Unsupported document', message, retryable: false };
  if (/parse|markdown/.test(normalized)) return { kind: 'parse', title: 'Document could not be rendered', message, retryable: true };
  if (/watch|stale/.test(normalized)) return { kind: 'watcher', title: 'Live reload stopped', message, retryable: true };
  if (/asset|image|blocked/.test(normalized)) return { kind: 'asset', title: 'A local asset was blocked', message, retryable: true };
  return { kind: 'unknown', title: 'Could not open document', message, retryable: true };
}

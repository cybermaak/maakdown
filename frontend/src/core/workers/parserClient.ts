import type { DocumentModel } from '../model/types';
import type { ParseRequest } from '../pipeline/parseDocument';

interface PendingRequest {
  resolve: (model: DocumentModel) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<number, PendingRequest>();

export function parseInWorker(request: ParseRequest): Promise<DocumentModel> {
  const activeWorker = getWorker();
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    activeWorker.postMessage({ id, request });
  });
}

export function disposeParserWorker() {
  worker?.terminate();
  worker = null;
  for (const request of pending.values()) {
    request.reject(new Error('Parser worker disposed'));
  }
  pending.clear();
}

function getWorker(): Worker {
  if (worker) {
    return worker;
  }
  worker = new Worker(new URL('./parser.worker.ts', import.meta.url), { type: 'module', name: 'maakdown-parser' });
  worker.onmessage = (event: MessageEvent<{ id: number; result?: DocumentModel; error?: string }>) => {
    const request = pending.get(event.data.id);
    if (!request) {
      return;
    }
    pending.delete(event.data.id);
    if (event.data.error) {
      request.reject(new Error(event.data.error));
    } else if (event.data.result) {
      request.resolve(event.data.result);
    } else {
      request.reject(new Error('Parser worker returned an empty result'));
    }
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || 'Parser worker failed');
    for (const request of pending.values()) {
      request.reject(error);
    }
    pending.clear();
  };
  return worker;
}

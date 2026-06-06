import { parseHTML } from 'linkedom';
import type { ParseRequest } from '../pipeline/parseDocument';

const workerDOM = parseHTML('<!doctype html><html><body></body></html>');
Object.assign(globalThis, {
  DOMParser: workerDOM.DOMParser,
  document: workerDOM.document,
  window: workerDOM.window,
  Element: workerDOM.Element,
  Node: workerDOM.Node,
  DocumentFragment: workerDOM.DocumentFragment
});

interface WorkerRequest {
  id: number;
  request: ParseRequest;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    const { parseDocument } = await import('../pipeline/parseDocument');
    const result = await parseDocument(event.data.request);
    self.postMessage({ id: event.data.id, result });
  } catch (error) {
    self.postMessage({
      id: event.data.id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

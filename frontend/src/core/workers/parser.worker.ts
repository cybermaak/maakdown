import { parseDocument } from '../pipeline/parseDocument';

self.onmessage = async (event: MessageEvent) => {
  const result = await parseDocument(event.data);
  self.postMessage(result);
};

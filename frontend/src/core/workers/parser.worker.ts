import { parseDocument, type ParseRequest } from '../pipeline/parseDocument';

self.onmessage = async (event: MessageEvent<ParseRequest>) => {
  const result = await parseDocument(event.data);
  self.postMessage(result);
};

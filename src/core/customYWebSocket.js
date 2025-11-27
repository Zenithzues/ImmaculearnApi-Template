import * as Y from 'yjs';
import { setupWSConnection } from 'y-websocket/bin/utils';

const docs = new Map();

export function getOrCreateDoc(name) {
  if (!docs.has(name)) docs.set(name, new Y.Doc());
  return docs.get(name);
}

export function handleWebSocketUpgrade(ws, req) {
  const docName = new URL(req.url, `http://${req.headers.host}`).searchParams.get('docName') || 'default-doc';
  const doc = getOrCreateDoc(docName);
  setupWSConnection(ws, req, { doc });
}

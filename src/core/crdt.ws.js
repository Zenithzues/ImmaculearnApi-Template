// src/core/crdt.ws.js
import * as Y from 'yjs';
// import { setupWSConnection } from 'y-websocket/bin/utils.js';
import { setupWSConnection } from 'y-websocket/bin/utils';

/**
 * In-memory document store
 * Map<docName, Y.Doc>
 * (Replace with persistence in production)
 */
const docs = new Map();

/**
 * Handle raw WebSocket CRDT connections
 */
export function handleCRDTConnection(ws, req) {
  try {
    // Parse URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const docName = url.searchParams.get('docName') || 'default-doc';

    // Get or create document
    let doc = docs.get(docName);

    if (!doc) {
      doc = new Y.Doc();
      docs.set(docName, doc);

      console.log(`🆕 Created CRDT doc: ${docName}`);
    }

    // Setup Yjs WebSocket connection
    setupWSConnection(ws, req, {
      doc,
      gc: true,
    });

    console.log(`🔗 CRDT client connected → ${docName}`);
  } catch (err) {
    console.error('❌ CRDT connection error:', err);
    ws.close();
  }
}

import * as Y from 'yjs';
import { setupWSConnection } from 'y-websocket/bin/utils';
import { WebSocketServer } from 'ws';
import http from 'http';

export const CRDT_PORT = 3001;

const rooms = new Map();
const docs = new Map();

const getYDoc = (docName) => {
  if (!docs.has(docName)) {
    const doc = new Y.Doc();
    docs.set(docName, doc);

    // Use Y.Text instead of Y.XmlFragment
    const ytext = doc.getText('document');

    doc.on('update', (update, origin) => {
      console.log(`📝 Document updated in room ${docName} (length: ${ytext.length})`);
    });

    console.log(`📄 Created new Y.Doc for room: ${docName}`);
  }
  return docs.get(docName);
};

function extractRoomName(url) {
  const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
  const segments = cleanUrl.split('/');
  const crdtIndex = segments.findIndex(s => s === 'crdt');
  if (crdtIndex !== -1 && crdtIndex + 1 < segments.length) {
    return segments[crdtIndex + 1].split('?')[0];
  }
  return null;
}

export function handleCRDTConnection(ws, req) {
  console.log('🔗 New CRDT client connected', req.url);
  const roomName = extractRoomName(req.url);

  if (!roomName) {
    ws.close(1008, 'Invalid room name');
    return;
  }

  if (!rooms.has(roomName)) {
    rooms.set(roomName, {
      clients: new Set(),
      doc: getYDoc(roomName),
      createdAt: Date.now(),
    });
  }

  const room = rooms.get(roomName);
  room.clients.add(ws);

  const doc = room.doc;
  const ytext = doc.getText('document');
  console.log(`Room "${roomName}" current length: ${ytext.length}`);

  setupWSConnection(ws, req, { gc: true, docName: roomName, getYDoc });

  ws.on('close', () => {
    room.clients.delete(ws);
    if (room.clients.size === 0) {
      setTimeout(() => {
        const r = rooms.get(roomName);
        if (r && r.clients.size === 0) {
          rooms.delete(roomName);
          docs.delete(roomName);
          console.log(`🧹 Room "${roomName}" cleaned up`);
        }
      }, 5 * 60 * 1000);
    }
  });

  ws.on('error', (err) => console.error(`❌ WebSocket error in room ${roomName}:`, err));
}
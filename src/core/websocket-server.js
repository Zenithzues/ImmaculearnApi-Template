// // websocket-server.js
// import { WebSocketServer } from 'ws';
// import * as Y from 'yjs';
// import * as syncProtocol from 'y-protocols/sync';
// import * as awarenessProtocol from 'y-protocols/awareness';

// const docs = new Map(); // Map of docId -> Y.Doc

// // Create WebSocket server
// export const createWSServer = (server, path = '/default-doc') => {
//   const wss = new WebSocketServer({ server, path });

//   wss.on('connection', (ws, req) => {
//     console.log('Client connected via WebSocket');

//     // Use 'default-doc' as the doc ID (or parse from URL if dynamic)
//     const docId = path.replace('/', '');
//     let doc = docs.get(docId);
//     if (!doc) {
//       doc = new Y.Doc();
//       docs.set(docId, doc);
//     }

//     const awareness = new awarenessProtocol.Awareness(doc);
//     awareness.setLocalState(null);

//     // Send sync step 1
//     const sendSyncStep1 = () => {
//       const encoder = syncProtocol.encodeSyncStep1(doc);
//       ws.send(encoder);
//     };

//     // Broadcast updates
//     const updateHandler = update => {
//       if (ws.readyState === ws.OPEN) {
//         const encoder = syncProtocol.encodeUpdate(update);
//         ws.send(encoder);
//       }
//     };

//     doc.on('update', updateHandler);

//     ws.on('message', message => {
//       const data = new Uint8Array(message);
//       syncProtocol.readSyncMessage(data, doc, ws); // custom decode function
//     });

//     ws.on('close', () => {
//       console.log('Client disconnected');
//       doc.off('update', updateHandler);
//       awarenessProtocol.removeAwarenessStates(
//         awareness,
//         Array.from(awareness.getStates().keys())
//       );
//     });

//     // Initial sync
//     sendSyncStep1();
//   });

//   return wss;
// };

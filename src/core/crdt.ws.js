// src/core/crdt.ws.js

import * as Y from 'yjs';
import { setupWSConnection } from 'y-websocket/bin/utils';

// Store active rooms with their client connections
const rooms = new Map();

// Store the shared Yjs documents (managed by setupWSConnection)
const docs = new Map();

// Callback to get or create a document for a room
const getYDoc = (docName) => {
  if (!docs.has(docName)) {
    const doc = new Y.Doc();
    docs.set(docName, doc);
    
    // Observe the document for changes
    const contentText = doc.getText('content');
    
    contentText.observe((event) => {
      console.log(`📝 Document content changed in room ${docName}`);
      console.log(`  → Content length: ${contentText.length} characters`);
      
      const content = contentText.toString();
      if (content.length > 0) {
        console.log(`  → Content preview: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
      }
      
      // Log change details
      console.log(`  → Changes:`, {
        added: event.changes.added.size,
        deleted: event.changes.deleted.size,
      });
    });
    
    console.log(`📄 Created new Y.Doc for room: ${docName}`);
  }
  
  return docs.get(docName);
};

export function handleCRDTConnection(ws, req) {
  console.log('🔗 New CRDT client connected');
  console.log('Request URL:', req.url);
  
  // Extract room name from URL path
  const urlParts = req.url.split('/');
  const roomName = urlParts[urlParts.length - 1].split('?')[0];
  
  console.log('Room name:', roomName);
  
  // Track room connections
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
    console.log(`Created new room: ${roomName}`);
  }
  
  const roomClients = rooms.get(roomName);
  roomClients.add(ws);

  const room = rooms.get(roomName) || {
    clients: new Set(),
    doc: getYDoc(roomName)
  };
  rooms.set(roomName, room);

  roomClients.add(ws);

  // Now you can safely set/get content

  // const currentContent = getRoomContent(roomName);
  // console.log(`Room ${roomName} current content:`, currentContent);
  
  console.log(`Room ${roomName} now has ${roomClients.size} clients`);
  
  // Setup WebSocket connection with y-websocket utils
  // Pass the getYDoc callback to ensure we use the same document instance
  setupWSConnection(ws, req, {
    gc: true, // Enable garbage collection
    docName: roomName,
    getYDoc, // Provide the document getter
  });
  
  // Get the document to log current state
  const doc = getYDoc(roomName);
  const contentText = doc.getText('content');
  console.log(`  → Current document has ${contentText.length} characters`);

  
  // Handle client disconnect
  ws.on('close', () => {
    console.log('🔌 CRDT client disconnected from room:', roomName);
    roomClients.delete(ws);
    console.log(`Room ${roomName} now has ${roomClients.size} clients`);
    
    // Clean up empty rooms after a delay
    if (roomClients.size === 0) {
      console.log(`Room ${roomName} is empty, keeping doc for potential reconnection`);
      
      // Clean up after 5 minutes of no connections
      setTimeout(() => {
        const currentRoom = rooms.get(roomName);
        if (currentRoom && currentRoom.size === 0) {
          rooms.delete(roomName);
          // Optionally also delete the document
          // docs.delete(roomName);
          console.log(`Room ${roomName} cleaned up (no reconnection within 5 minutes)`);
        }
      }, 5 * 60 * 1000);
    }
  });

  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error in room ${roomName}:`, error);
  });
}

// Function to get room statistics (useful for debugging)
export function getRoomStats() {
  const stats = [];
  for (const [roomName, room] of rooms.entries()) {
    const doc = room.doc;
    const contentText = doc.getText('content');
    
    stats.push({
      room: roomName,
      clients: room.clients.size,
      contentLength: contentText.length,
      contentPreview: contentText.toString().substring(0, 50),
    });
  }
  return stats;
}

// Function to get document content for a specific room (for debugging/backup)
export function getRoomContent(roomName) {
  const room = rooms.get(roomName);
  if (!room) {
    return null;
  }
  
  const doc = room.doc;
  const contentText = doc.getText('content');
  
  return {
    roomName,
    clients: room.clients.size,
    content: contentText.toString(),
    contentLength: contentText.length,
  };
}

// Function to manually update document content (for testing/migration)
export function setRoomContent(roomName, content) {
  let room = rooms.get(roomName);
  
  if (!room) {
    room = {
      clients: new Set(),
      doc: new Y.Doc()
    };
    rooms.set(roomName, room);
  }
  
  const doc = room.doc;
  doc.transact(() => {
    const contentText = doc.getText('content');
    contentText.delete(0, contentText.length);
    contentText.insert(0, content);
  });
  
  console.log(`✅ Set content for room ${roomName}: ${content.length} characters`);
  
  return true;
}


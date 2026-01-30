// src/core/crdt.ws.js

import * as Y from 'yjs';
import { setupWSConnection } from 'y-websocket/bin/utils';

// Store active rooms with their client connections and documents
const rooms = new Map();

// Store the shared Yjs documents
const docs = new Map();

// Callback to get or create a document for a room
const getYDoc = (docName) => {
  if (!docs.has(docName)) {
    const doc = new Y.Doc();
    docs.set(docName, doc);
    
    // For TipTap, we observe the Y.XmlFragment
    const prosemirrorFragment = doc.get('prosemirror', Y.XmlFragment);
    
    // Observe document changes
    doc.on('update', (update, origin) => {
      console.log(`📝 Document updated in room ${docName}`);
      console.log(`  → Update size: ${update.length} bytes`);
      console.log(`  → Origin:`, origin ? 'Remote' : 'Local');
      
      try {
        const fragment = doc.get('prosemirror', Y.XmlFragment);
        const nodeCount = fragment.length;
        console.log(`  → ProseMirror nodes: ${nodeCount}`);
      } catch (error) {
        console.error('Error reading document:', error);
      }
    });
    
    console.log(`📄 Created new Y.Doc for room: ${docName}`);
  }
  
  return docs.get(docName);
};

// Helper function to extract room name from URL
function extractRoomName(url) {
  // Remove leading slash if present
  const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
  
  // Split by / to get path segments
  const segments = cleanUrl.split('/');
  
  // Find the segment after 'crdt'
  const crdtIndex = segments.findIndex(s => s === 'crdt' || s.startsWith('crdt?'));
  
  if (crdtIndex !== -1 && crdtIndex + 1 < segments.length) {
    // Get the next segment (room name)
    const roomSegment = segments[crdtIndex + 1];
    
    // Remove query parameters if present
    const roomName = roomSegment.split('?')[0];
    
    return roomName;
  }
  
  // Fallback: try to extract from query string format
  // Handle format: /crdt?{room-id}/{room-id}?params
  if (cleanUrl.includes('crdt?')) {
    const afterCrdt = cleanUrl.split('crdt?')[1];
    if (afterCrdt) {
      const firstSegment = afterCrdt.split('/')[0];
      return firstSegment.split('?')[0];
    }
  }
  
  return null;
}

export function handleCRDTConnection(ws, req) {
  console.log('🔗 New CRDT client connected');
  console.log('📍 Request URL:', req.url);
  
  // Extract room name from URL
  const roomName = extractRoomName(req.url);
  
  console.log('🏠 Extracted room name:', roomName);
  
  // Validate room name
  if (!roomName || roomName === '' || roomName === 'crdt') {
    console.error('❌ Invalid room name');
    ws.close(1008, 'Invalid room name - must be in format: /crdt/{room-id}');
    return;
  }
  
  // Track room connections
  if (!rooms.has(roomName)) {
    rooms.set(roomName, {
      clients: new Set(),
      doc: getYDoc(roomName),
      createdAt: Date.now(),
    });
    console.log(`✅ Created new room: ${roomName}`);
  }
  
  const room = rooms.get(roomName);
  room.clients.add(ws);
  
  console.log(`👥 Room "${roomName}" now has ${room.clients.size} client(s)`);
  
  // Get the document to log current state
  const doc = room.doc;
  const prosemirrorFragment = doc.get('prosemirror', Y.XmlFragment);
  console.log(`  → Current document has ${prosemirrorFragment.length} node(s)`);
  
  // Setup WebSocket connection with y-websocket utils
  setupWSConnection(ws, req, {
    gc: true, // Enable garbage collection
    docName: roomName,
    getYDoc, // Provide the document getter
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log('🔌 CRDT client disconnected from room:', roomName);
    
    const room = rooms.get(roomName);
    if (room) {
      room.clients.delete(ws);
      console.log(`👥 Room "${roomName}" now has ${room.clients.size} client(s)`);
      
      // Clean up empty rooms after a delay
      if (room.clients.size === 0) {
        console.log(`⏳ Room "${roomName}" is empty, will clean up after 5 minutes`);
        
        // Clean up after 5 minutes of no connections
        setTimeout(() => {
          const currentRoom = rooms.get(roomName);
          if (currentRoom && currentRoom.clients.size === 0) {
            rooms.delete(roomName);
            docs.delete(roomName);
            console.log(`🧹 Room "${roomName}" cleaned up (no reconnection within 5 minutes)`);
          }
        }, 5 * 60 * 1000);
      }
    }
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error in room ${roomName}:`, error);
  });
}

// Function to get room statistics (useful for debugging)
export function getRoomStats() {
  const stats = [];
  
  for (const [roomName, room] of rooms.entries()) {
    const doc = room.doc;
    const prosemirrorFragment = doc.get('prosemirror', Y.XmlFragment);
    
    // Try to get a text representation
    let contentPreview = '';
    try {
      const toText = (node) => {
        if (node.constructor.name === 'YXmlText') {
          return node.toString();
        }
        if (node.constructor.name === 'YXmlElement') {
          return Array.from(node)
            .map(child => toText(child))
            .join('');
        }
        return '';
      };
      
      const fullText = Array.from(prosemirrorFragment)
        .map(node => toText(node))
        .join('');
      
      contentPreview = fullText.substring(0, 100);
    } catch (error) {
      contentPreview = '[Error reading content]';
    }
    
    stats.push({
      room: roomName,
      clients: room.clients.size,
      nodeCount: prosemirrorFragment.length,
      contentPreview,
      createdAt: new Date(room.createdAt).toISOString(),
      uptime: Math.floor((Date.now() - room.createdAt) / 1000) + 's',
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
  const prosemirrorFragment = doc.get('prosemirror', Y.XmlFragment);
  
  // Convert to JSON for inspection
  let contentJSON = null;
  try {
    contentJSON = prosemirrorFragment.toJSON();
  } catch (error) {
    console.error('Error converting to JSON:', error);
  }
  
  return {
    roomName,
    clients: room.clients.size,
    nodeCount: prosemirrorFragment.length,
    contentJSON,
    createdAt: new Date(room.createdAt).toISOString(),
  };
}

// Function to get all active rooms
export function getActiveRooms() {
  return Array.from(rooms.keys());
}

// Function to get total client count across all rooms
export function getTotalClients() {
  let total = 0;
  for (const room of rooms.values()) {
    total += room.clients.size;
  }
  return total;
}

// Function to force save/persist a document (useful for backup)
export function getDocumentState(roomName) {
  const room = rooms.get(roomName);
  if (!room) {
    return null;
  }
  
  // Get the encoded state
  const state = Y.encodeStateAsUpdate(room.doc);
  
  return {
    roomName,
    state: Buffer.from(state).toString('base64'),
    size: state.length,
    timestamp: Date.now(),
  };
}

// Function to restore document state from encoded update
export function restoreDocumentState(roomName, base64State) {
  let room = rooms.get(roomName);
  
  if (!room) {
    room = {
      clients: new Set(),
      doc: new Y.Doc(),
      createdAt: Date.now(),
    };
    rooms.set(roomName, room);
    docs.set(roomName, room.doc);
  }
  
  try {
    const state = Buffer.from(base64State, 'base64');
    Y.applyUpdate(room.doc, state);
    
    console.log(`✅ Restored document state for room ${roomName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error restoring document state for room ${roomName}:`, error);
    return false;
  }
}

// Periodic cleanup of old, inactive rooms (run this on a schedule)
export function cleanupInactiveRooms(maxAgeMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [roomName, room] of rooms.entries()) {
    const age = now - room.createdAt;
    if (room.clients.size === 0 && age > maxAgeMs) {
      rooms.delete(roomName);
      docs.delete(roomName);
      cleaned++;
      console.log(`🧹 Cleaned up inactive room: ${roomName} (age: ${Math.floor(age / 1000 / 60)} minutes)`);
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleanup complete: removed ${cleaned} room(s)`);
  }
  
  return cleaned;
}

// Export for server status endpoint
export function getServerStats() {
  return {
    totalRooms: rooms.size,
    totalClients: getTotalClients(),
    activeRooms: getActiveRooms(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
}
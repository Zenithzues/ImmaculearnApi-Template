// core/YjsManager.js (Updated)
import * as Y from 'yjs';
import { hybridDatabase } from './HybridDatabase.js';
import { Logger } from '../utils/Logger.js';

export class YjsManager {
  constructor() {
    this.logger = new Logger('YjsManager');
    this.documents = new Map(); // roomId -> Y.Doc
    this.awarenessStates = new Map(); // roomId -> Map<clientId, state>
    this.supabase = hybridDatabase.supabase;
  }

  async getOrCreateDocument(roomId) {
    if (this.documents.has(roomId)) {
      return this.documents.get(roomId);
    }

    // Try to load from Supabase
    let ydoc = new Y.Doc();
    
    try {
      const { data: savedDoc, error } = await this.supabase
        .from('yjs_documents')
        .select('yjs_content, version, metadata')
        .eq('room_id', roomId)
        .eq('document_name', 'collaboration')
        .single();

      if (!error && savedDoc?.yjs_content) {
        // Convert base64 or buffer to Uint8Array
        let update;
        if (typeof savedDoc.yjs_content === 'string') {
          update = Uint8Array.from(atob(savedDoc.yjs_content), c => c.charCodeAt(0));
        } else if (Buffer.isBuffer(savedDoc.yjs_content)) {
          update = new Uint8Array(savedDoc.yjs_content);
        } else if (savedDoc.yjs_content instanceof Uint8Array) {
          update = savedDoc.yjs_content;
        } else {
          update = new Uint8Array(Object.values(savedDoc.yjs_content));
        }
        
        Y.applyUpdate(ydoc, update);
        this.logger.info(`Loaded Yjs document for room ${roomId} from Supabase`);
      }
    } catch (error) {
      this.logger.debug(`No existing Yjs document for room ${roomId}, creating new`);
    }

    // Initialize document structures
    await this.initializeDocumentStructures(ydoc, roomId);
    
    // Setup update persistence
    ydoc.on('update', async (update, origin) => {
      await this.persistDocumentUpdate(roomId, update);
    });

    this.documents.set(roomId, ydoc);
    return ydoc;
  }

  async persistDocumentUpdate(roomId, update) {
    try {
      // Get current document
      const ydoc = this.documents.get(roomId);
      if (!ydoc) return;

      // Get full state
      const fullUpdate = Y.encodeStateAsUpdate(ydoc);
      
      // Convert to base64 for storage
      const base64Update = Buffer.from(fullUpdate).toString('base64');
      
      // Store in Supabase
      const { error } = await this.supabase
        .from('yjs_documents')
        .upsert({
          room_id: roomId,
          document_name: 'collaboration',
          yjs_content: base64Update,
          version: ydoc.metadata?.version ? ydoc.metadata.version + 1 : 1,
          metadata: ydoc.metadata || {},
          updated_at: new Date().toISOString(),
          last_accessed: new Date().toISOString()
        }, {
          onConflict: 'room_id,document_name'
        });

      if (error) throw error;
      
      // Also store as a message for history
      await this.supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: 'system',
          type: 'yjs_update',
          content: 'Yjs document updated',
          metadata: {
            update_size: update.length,
            version: ydoc.metadata?.version || 0
          }
        });

    } catch (error) {
      this.logger.error('Failed to persist Yjs update to Supabase:', error);
    }
  }

  async initializeDocumentStructures(ydoc, roomId) {
    // Shared types
    ydoc.messages = ydoc.getArray('messages');
    ydoc.presence = ydoc.getMap('presence');
    ydoc.whiteboard = ydoc.getMap('whiteboard');
    ydoc.notes = ydoc.getText('notes');
    
    // Metadata
    ydoc.metadata = {
      roomId,
      version: 0,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    // Sync existing messages from Supabase
    await this.syncMessagesFromSupabase(roomId, ydoc);

    return ydoc;
  }

  async syncMessagesFromSupabase(roomId, ydoc) {
    try {
      const { data: messages, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('type', 'text')
        .order('created_at', { ascending: true })
        .limit(1000); // Limit to prevent memory issues

      if (error) throw error;

      // Add to Yjs document
      messages.forEach(msg => {
        ydoc.messages.push([{
          id: msg.id,
          senderId: msg.sender_id,
          content: msg.content,
          type: msg.type,
          metadata: msg.metadata,
          timestamp: msg.created_at,
          supabaseId: msg.id
        }]);
      });

      this.logger.info(`Synced ${messages.length} messages from Supabase to Yjs for room ${roomId}`);
    } catch (error) {
      this.logger.error('Failed to sync messages from Supabase:', error);
    }
  }

  // ... rest of the methods remain similar but use hybridDatabase
}
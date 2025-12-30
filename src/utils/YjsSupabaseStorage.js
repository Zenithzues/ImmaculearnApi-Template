// src/utils/YjsSupabaseStorage.js
import * as Y from 'yjs';
import { Logger } from './Logger.js';

export class YjsSupabaseStorage {
  constructor(supabaseClient, tableName = 'yjs_documents') {
    this.supabase = supabaseClient;
    this.tableName = tableName;
    this.logger = new Logger('YjsSupabaseStorage');
  }

  async getYDoc(roomId, documentName = 'main') {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('yjs_content, version, metadata')
        .eq('room_id', roomId)
        .eq('document_name', documentName)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const ydoc = new Y.Doc();

      if (data && data.yjs_content) {
        try {
          // Handle different storage formats
          let update;
          if (typeof data.yjs_content === 'string') {
            // Base64 encoded string
            update = Uint8Array.from(atob(data.yjs_content), c => c.charCodeAt(0));
          } else if (Buffer.isBuffer(data.yjs_content)) {
            // Buffer
            update = new Uint8Array(data.yjs_content);
          } else if (data.yjs_content instanceof Uint8Array) {
            // Already Uint8Array
            update = data.yjs_content;
          } else if (Array.isArray(data.yjs_content)) {
            // Array of numbers
            update = new Uint8Array(data.yjs_content);
          } else {
            // Try to convert from JSON
            update = new Uint8Array(Object.values(data.yjs_content));
          }

          Y.applyUpdate(ydoc, update);
          this.logger.debug(`Loaded Yjs document for room ${roomId}`);
        } catch (loadError) {
          this.logger.warn(`Failed to load Yjs document for room ${roomId}:`, loadError);
          // Continue with empty document
        }
      }

      return ydoc;
    } catch (error) {
      this.logger.error('Error getting Yjs document:', error);
      throw error;
    }
  }

  async storeUpdate(roomId, update, documentName = 'main') {
    try {
      // Get current document
      const ydoc = await this.getYDoc(roomId, documentName);
      
      // Apply the new update
      Y.applyUpdate(ydoc, update, 'server');
      
      // Get full state
      const fullUpdate = Y.encodeStateAsUpdate(ydoc);
      
      // Convert to base64 for storage
      const base64Update = Buffer.from(fullUpdate).toString('base64');
      
      // Get metadata
      const metadata = ydoc.getMap('metadata')?.toJSON() || {};
      
      // Store in Supabase
      const { error } = await this.supabase
        .from(this.tableName)
        .upsert({
          room_id: roomId,
          document_name: documentName,
          yjs_content: base64Update,
          version: (metadata.version || 0) + 1,
          metadata: metadata,
          updated_at: new Date().toISOString(),
          last_accessed: new Date().toISOString()
        }, {
          onConflict: 'room_id,document_name'
        });

      if (error) throw error;

      this.logger.debug(`Stored Yjs update for room ${roomId}`);
      return true;
    } catch (error) {
      this.logger.error('Error storing Yjs update:', error);
      throw error;
    }
  }

  async deleteDocument(roomId, documentName = 'main') {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('room_id', roomId)
        .eq('document_name', documentName);

      if (error) throw error;
      
      this.logger.info(`Deleted Yjs document for room ${roomId}`);
      return true;
    } catch (error) {
      this.logger.error('Error deleting Yjs document:', error);
      throw error;
    }
  }

  async getDocumentInfo(roomId, documentName = 'main') {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('version, metadata, updated_at, last_accessed')
        .eq('room_id', roomId)
        .eq('document_name', documentName)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (error) {
      this.logger.error('Error getting document info:', error);
      throw error;
    }
  }

  async listDocuments(roomId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('document_name, version, updated_at')
        .eq('room_id', roomId);

      if (error) throw error;
      
      return data;
    } catch (error) {
      this.logger.error('Error listing documents:', error);
      throw error;
    }
  }
}
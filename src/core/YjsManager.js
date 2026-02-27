// core/YjsManager.js (Updated)
import * as Y from "yjs";
// import { hybridDatabase } from './HybridDatabase.js';
import { Logger } from "../utils/Logger.js";
import { YjsSupabaseStorage } from "../utils/YjsSupabaseStorage.js";

export class YjsManager {
  constructor() {
    this.logger = new Logger("YjsManager");
    this.documents = new Map(); // roomId -> Y.Doc
    this.awarenessStates = new Map(); // roomId -> Map<clientId, state>
    // this.supabase = hybridDatabase.supabase;

    this.storage = new YjsSupabaseStorage(supabaseClient);
  }

  async getOrCreateDocument(roomId) {
    if (this.documents.has(roomId)) {
      return this.documents.get(roomId);
    }

    // Load from Supabase storage
    const ydoc = await this.storage.getYDoc(roomId);

    // Initialize document structures
    await this.initializeDocumentStructures(ydoc, roomId);

    // Listen for updates to persist
    ydoc.on("update", async (update, origin) => {
      if (origin !== "server") {
        // Don't persist server-originated updates
        await this.storage.storeUpdate(roomId, update);
      }
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
      const base64Update = Buffer.from(fullUpdate).toString("base64");

      // Store in Supabase
      const { error } = await this.supabase.from("yjs_documents").upsert(
        {
          room_id: roomId,
          document_name: "collaboration",
          yjs_content: base64Update,
          version: ydoc.metadata?.version ? ydoc.metadata.version + 1 : 1,
          metadata: ydoc.metadata || {},
          updated_at: new Date().toISOString(),
          last_accessed: new Date().toISOString(),
        },
        {
          onConflict: "room_id,document_name",
        },
      );

      if (error) throw error;

      // Also store as a message for history
      await this.supabase.from("messages").insert({
        room_id: roomId,
        sender_id: "system",
        type: "yjs_update",
        content: "Yjs document updated",
        metadata: {
          update_size: update.length,
          version: ydoc.metadata?.version || 0,
        },
      });
    } catch (error) {
      this.logger.error("Failed to persist Yjs update to Supabase:", error);
    }
  }

  async initializeDocumentStructures(ydoc, roomId) {
    // Shared types for collaborative features
    ydoc.messages = ydoc.getArray("messages");
    ydoc.presence = ydoc.getMap("presence");
    ydoc.whiteboard = ydoc.getMap("whiteboard");
    ydoc.notes = ydoc.getText("notes");

    // Initialize metadata if not exists
    if (!ydoc.getMap("metadata")) {
      ydoc.getMap("metadata").set("roomId", roomId);
      ydoc.getMap("metadata").set("createdAt", new Date().toISOString());
      ydoc.getMap("metadata").set("version", 0);
    }

    // Setup observers
    ydoc.messages.observe((event) => {
      this.onMessagesChanged(roomId, event);
    });

    ydoc.presence.observe((event) => {
      this.onPresenceChanged(roomId, event);
    });

    // Initialize awareness map
    this.awarenessStates.set(roomId, new Map());

    return ydoc;
  }

  async syncMessagesFromSupabase(roomId, ydoc) {
    try {
      const { data: messages, error } = await this.supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .eq("type", "text")
        .order("created_at", { ascending: true })
        .limit(1000); // Limit to prevent memory issues

      if (error) throw error;

      // Add to Yjs document
      messages.forEach((msg) => {
        ydoc.messages.push([
          {
            id: msg.id,
            senderId: msg.sender_id,
            content: msg.content,
            type: msg.type,
            metadata: msg.metadata,
            timestamp: msg.created_at,
            supabaseId: msg.id,
          },
        ]);
      });

      this.logger.info(
        `Synced ${messages.length} messages from Supabase to Yjs for room ${roomId}`,
      );
    } catch (error) {
      this.logger.error("Failed to sync messages from Supabase:", error);
    }
  }

  async handleYjsUpdate(roomId, updateData, clientId) {
    const ydoc = await this.getOrCreateDocument(roomId);

    if (!updateData || !updateData.update) {
      this.logger.warn("Invalid update data received");
      return null;
    }

    try {
      const update = new Uint8Array(updateData.update);

      // Apply update to Yjs document
      Y.applyUpdate(ydoc, update, clientId);

      // Persist to Supabase (will be done by the update listener)

      // Return the current state for broadcasting
      const stateUpdate = Y.encodeStateAsUpdate(ydoc);
      return Array.from(stateUpdate);
    } catch (error) {
      this.logger.error("Failed to apply Yjs update:", error);
      throw error;
    }
  }

  // ... rest of the methods remain similar but use hybridDatabase
}

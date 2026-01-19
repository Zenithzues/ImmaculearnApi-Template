// import { supabase } from "../lib/supabase.js";

import { supabase } from "../../core/supabase.js";


class Message {
  constructor({
    id,
    content,
    senderId,
    senderName,
    senderAvatar,
    spaceUuid,
    timestamp = new Date().toISOString(),
  }) {
    this.id = id;
    this.content = content;
    this.senderId = senderId;
    this.senderName = senderName;
    this.senderAvatar = senderAvatar;
    this.spaceUuid = spaceUuid;
    this.timestamp = timestamp;
  }

  

  /**
   * Convert instance → JSONB payload
   */
  toPayload() {
    return {
      id: this.id,
      content: this.content,
      senderId: this.senderId,
      senderName: this.senderName,
      senderAvatar: this.senderAvatar,
      timestamp: this.timestamp,
    };
  }

  /**
   * Persist this message
   */
  async save() {
    const { error } = await supabase
      .from("messages")
      .insert({
        id: this.id,
        space_uuid: this.spaceUuid,
        payload: this.toPayload(),
        created_at: new Date(this.timestamp),
      });

    if (error) {
      throw new Error(`Message.save failed: ${error.message}`);
    }
  }

  /**
   * Fetch message history for a space
   */
  static async findBySpace(spaceUuid, limit = 50) {
    const { data, error } = await supabase
      .from("messages")
      .select("payload, created_at")
      .eq("space_uuid", spaceUuid)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Message.findBySpace failed: ${error.message}`);
    }

    return data
      .reverse()
      .map((row) => Message.fromRow(row, spaceUuid));
  }

  /**
   * Rehydrate DB row → Message instance
   */
  static fromRow(row, spaceUuid) {
    return new Message({
      ...row.payload,
      spaceUuid,
      timestamp: row.created_at,
    });
  }
}


export default Message;
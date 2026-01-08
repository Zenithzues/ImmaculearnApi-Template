// src/controllers/v1/chatController.js
import { supabaseConnection } from '../../config/supabaseConnection.js';
import { Logger } from '../../utils/Logger.js';

export class ChatController {
  constructor() {
    this.logger = new Logger('ChatController');
    this.supabase = supabaseConnection;
  }

  async createRoom(req, res) {
    try {
      const { name, description, type = 'channel', isPublic = true } = req.body;
      const userId = '1';
      
      this.logger.debug('Creating room', { name, userId, type });
      
      // Ensure Supabase is connected
      await this.supabase.ensureConnected();
      const supabaseClient = this.supabase.getClient();
      
      const { data: room, error } = await supabaseClient
        .from('chat_rooms')
        .insert({
          name,
          description,
          type,
          created_by: userId,
          is_public: isPublic
        })
        .select()
        .single();
      
      if (error) {
        this.logger.error('Failed to create room:', error);
        throw error;
      }
      
      // Add creator as owner
      const { error: participantError } = await supabaseClient
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: userId,
          role: 'owner'
        });
      
      if (participantError) {
        this.logger.error('Failed to add room participant:', participantError);
        throw participantError;
      }
      
      this.logger.info('Room created successfully', { roomId: room.id, userId });
      res.json({ success: true, room });
      
    } catch (error) {
      this.logger.error('Create room error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        code: error.code 
      });
    }
  }
  
  async sendMessage(req, res) {
    try {
      const { content, type = 'text' } = req.body || {};
      const { roomId } = req.params || {}
      const userId = '1';
      
      this.logger.debug('Sending message', { roomId, userId, contentLength: content?.length });
      
      // Validate required fields
      if (!roomId || !content) {
        return res.status(400).json({
          success: false,
          error: 'roomId and content are required'
        });
      }
      
      // Ensure Supabase is connected
      await this.supabase.ensureConnected();
      const supabaseClient = this.supabase.getClient();
      
      const { data: message, error } = await supabaseClient
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: userId,
          content,
          type
        })
        .select()
        .single();
      
      if (error) {
        this.logger.error('Failed to send message:', error);
        throw error;
      }
      
      this.logger.info('Message sent successfully', { 
        messageId: message.id, 
        roomId, 
        userId 
      });
      res.json({ success: true, message });
      
    } catch (error) {
      this.logger.error('Send message error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        code: error.code 
      });
    }
  }

  async getMessages(req, res) {
    try {
      const { roomId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      this.logger.debug('Getting messages', { roomId, limit, offset });
      
      if (!roomId) {
        return res.status(400).json({
          success: false,
          error: 'roomId is required'
        });
      }
      
      // Ensure Supabase is connected
      await this.supabase.ensureConnected();
      const supabaseClient = this.supabase.getClient();
      
      const { data: messages, error, count } = await supabaseClient
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('room_id', roomId)
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      console.log(messages)
      
      if (error) {
        this.logger.error('Failed to get messages:', error);
        throw error;
      }
      
      this.logger.debug('Retrieved messages', { count, roomId });
      res.json({ 
        success: true, 
        messages: messages || [],
        count: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
    } catch (error) {
      this.logger.error('Get messages error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async getRooms(req, res) {
    try {
      const userId = '1';
      
      this.logger.debug('Getting rooms for user', { userId });
      
      // Ensure Supabase is connected
      await this.supabase.ensureConnected();
      const supabaseClient = this.supabase.getClient();
      
      // Get rooms where user is a participant
      const { data: rooms, error } = await supabaseClient
        .from('room_participants')
        .select(`
          role,
          joined_at,
          room:chat_rooms (
            id,
            name,
            description,
            type,
            created_by,
            is_public,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });
      
      if (error) {
        this.logger.error('Failed to get rooms:', error);
        throw error;
      }
      
      // Transform the response
      const userRooms = (rooms || []).map(participant => ({
        ...participant.room,
        userRole: participant.role,
        joinedAt: participant.joined_at
      }));
      
      this.logger.debug('Retrieved rooms', { count: userRooms.length, userId });
      res.json({ success: true, rooms: userRooms });
      
    } catch (error) {
      this.logger.error('Get rooms error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async getRoomParticipants(req, res) {
    try {
      const { roomId } = req.params;
      
      this.logger.debug('Getting room participants', { roomId });
      
      if (!roomId) {
        return res.status(400).json({
          success: false,
          error: 'roomId is required'
        });
      }
      
      // Ensure Supabase is connected
      await this.supabase.ensureConnected();
      const supabaseClient = this.supabase.getClient();
      
      const { data: participants, error } = await supabaseClient
        .from('room_participants')
        .select(`
          id,
          role,
          joined_at,
          last_read_at,
          user:users (
            id,
            username,
            email,
            avatar_url,
            status
          )
        `)
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });
      
      if (error) {
        this.logger.error('Failed to get room participants:', error);
        throw error;
      }
      
      this.logger.debug('Retrieved participants', { count: participants?.length, roomId });
      res.json({ success: true, participants: participants || [] });
      
    } catch (error) {
      this.logger.error('Get room participants error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
}

export default ChatController;
// src/controllers/v1/chatController.js
import { WebSocketServer } from '../../core/WebSocketServer.js'
import { supabaseConnection } from '../../config/supabaseConnection.js'
import { Logger } from '../../utils/Logger.js'

export class ChatController {
  constructor() {
    this.logger = new Logger('ChatController')
    this.supabase = supabaseConnection
    this.wsServer = WebSocketServer.getInstance()
  }

  // ======================
  // SNAPSHOTS
  // ======================

  async getRoomSnapshot(req, res) {
    try {
      const { roomId } = req.params
      const userId = req.user.id

      const { data: access } = await this.supabase.getClient()
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single()

      if (!access) return res.status(403).json({ error: 'Access denied' })

      const { data } = await this.supabase.getClient()
        .from('chat_snapshots')
        .select('data, version')
        .eq('room_id', roomId)
        .single()

      res.json({
        success: true,
        snapshot: data?.data || null,
        version: data?.version || 0
      })
    } catch (err) {
      this.logger.error(err)
      res.status(500).json({ error: err.message })
    }
  }

  // ======================
  // ROOMS
  // ======================

  async getRooms(req, res) {
    try {
      const userId = req.user.id

      const { data, error } = await this.supabase.getClient()
        .from('chat_rooms')
        .select(`
          *,
          participants:room_participants!inner(role)
        `)
        .eq('room_participants.user_id', userId)

      if (error) throw error
      res.json({ success: true, rooms: data })
    } catch (err) {
      this.logger.error(err)
      res.status(500).json({ error: err.message })
    }
  }

  async getRoomDetails(req, res) {
    try {
      const { roomId } = req.params
      const userId = req.user.id

      const { data: access } = await this.supabase.getClient()
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single()

      if (!access) return res.status(403).json({ error: 'Access denied' })

      const { data, error } = await this.supabase.getClient()
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (error) throw error
      res.json({ success: true, room: data })
    } catch (err) {
      this.logger.error(err)
      res.status(500).json({ error: err.message })
    }
  }

  async createRoom(req, res) {
    try {
      const { name, description, isPublic = true } = req.body
      const userId = req.user.id

      const { data: room, error } = await this.supabase.getClient()
        .from('chat_rooms')
        .insert({ name, description, is_public: isPublic, created_by: userId })
        .select()
        .single()

      if (error) throw error

      await this.supabase.getClient()
        .from('room_participants')
        .insert({ room_id: room.id, user_id: userId, role: 'owner' })

      // Create empty CRDT snapshot
      await this.supabase.getClient()
        .from('chat_snapshots')
        .insert({ room_id: room.id, data: {}, version: 1 })

      this.wsServer.broadcastToUserConnections(userId, {
        type: 'room-created',
        room
      })

      res.json({ success: true, room })
    } catch (err) {
      this.logger.error(err)
      res.status(500).json({ error: err.message })
    }
  }

  async deleteRoom(req, res) {
    try {
      const { roomId } = req.params
      const userId = req.user.id

      const { data: access } = await this.supabase.getClient()
        .from('room_participants')
        .select('role')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .eq('role', 'owner')
        .single()

      if (!access) return res.status(403).json({ error: 'Only owner can delete' })

      await this.supabase.getClient()
        .from('chat_snapshots')
        .delete()
        .eq('room_id', roomId)

      await this.supabase.getClient()
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)

      await this.supabase.getClient()
        .from('chat_rooms')
        .delete()
        .eq('id', roomId)

      this.wsServer.destroyRoom(roomId)

      res.json({ success: true })
    } catch (err) {
      this.logger.error(err)
      res.status(500).json({ error: err.message })
    }
  }

  // ======================
  // PARTICIPANTS
  // ======================

  async getRoomParticipants(req, res) {
    try {
      const { roomId } = req.params

      const { data, error } = await this.supabase.getClient()
        .from('room_participants')
        .select(`role, user:users(id, username, avatar_url)`)
        .eq('room_id', roomId)

      if (error) throw error

      res.json({
        success: true,
        participants: data.map(p => ({
          ...p.user,
          role: p.role,
          isOnline: this.wsServer.isUserOnline(p.user.id)
        }))
      })
    } catch (err) {
      this.logger.error(err)
      res.status(500).json({ error: err.message })
    }
  }

  async addParticipants(req, res) {
    try {
      const { roomId } = req.params
      const { userIds } = req.body
      const currentUserId = req.user.id

      const rows = userIds.map(id => ({
        room_id: roomId,
        user_id: id,
        role: 'member'
      }))

      await this.supabase.getClient()
        .from('room_participants')
        .insert(rows)

      this.wsServer.broadcastToRoom(roomId, {
        type: 'participants-updated',
        roomId
      })

      res.json({ success: true })
    } catch (err) {
      this.logger.error(err)
      res.status(500).json({ error: err.message })
    }
  }

  async removeParticipant(req, res) {
    try {
      const { roomId, userId } = req.params

      await this.supabase.getClient()
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId)

      this.wsServer.broadcastToRoom(roomId, {
        type: 'participant-removed',
        roomId,
        userId
      })

      res.json({ success: true })
    } catch (err) {
      this.logger.error(err)
      res.status(500).json({ error: err.message })
    }
  }
}

export default ChatController

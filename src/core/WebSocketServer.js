import { WebSocketServer as WSServer } from 'ws';
import { Logger } from '../utils/Logger.js';
import { yjsManager } from './YjsManager.js';
import { database } from './Database.js';
import jwt from 'jsonwebtoken';
import User from '../models/MySQL/UserModel.js';

export class WebSocketServer {
  static instance = null;

  constructor() {
    if (WebSocketServer.instance) {
      return WebSocketServer.instance;
    }

    this.logger = new Logger('WebSocketServer');
    this.wss = null;
    this.clients = new Map(); // clientId -> WebSocket
    this.roomClients = new Map(); // roomId -> Set<clientId>
    this.clientRooms = new Map(); // clientId -> Set<roomId>
    
    WebSocketServer.instance = this;
  }

  static getInstance() {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer();
    }
    return WebSocketServer.instance;
  }

  initialize(server) {
    this.wss = new WSServer({ server });
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      this.logger.error('WebSocket server error:', error);
    });

    this.logger.info('WebSocket server initialized');
  }

  async handleConnection(ws, req) {
    const url = new URL(req.url, `ws://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const clientId = url.searchParams.get('clientId');
    const roomId = url.searchParams.get('roomId');

    try {
      // Authenticate client
      const user = await this.authenticate(token);
      if (!user) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      // Register client
      this.registerClient(ws, clientId, user.id);
      
      // Join room if specified
      if (roomId) {
        await this.joinRoom(ws, clientId, roomId, user.id);
      }

      // Setup message handler
      ws.on('message', (data) => this.handleMessage(ws, clientId, data));
      
      // Handle disconnection
      ws.on('close', () => this.handleDisconnection(clientId));
      
      // Handle errors
      ws.on('error', (error) => this.handleError(clientId, error));

      this.logger.info(`Client ${clientId} (user: ${user.id}) connected`);
      
      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Connection error:', error);
      ws.close(1011, 'Internal Server Error');
    }
  }

  async authenticate(token) {
    try {
      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from MySQL
      const userModel = new User();
      const user = await userModel.get(decoded.userId);
      
      if (!user) {
        this.logger.warn('User not found during WebSocket auth', { userId: decoded.userId });
        return null;
      }

      // Check if user is active
      const emailCheck = await userModel.findByEmail(user.email);
      if (!emailCheck) {
        this.logger.warn('User email not registered', { userId: decoded.userId, email: user.email });
        return null;
      }

      // Update user status to online
      await userModel.updateUserStatus(user.account_id, 'online');

      // Sync user to Supabase for collaboration features
      await hybridDatabase.syncUserToSupabase(user.account_id.toString());

      return {
        id: user.account_id.toString(),
        email: user.email,
        role: emailCheck.role
      };
    } catch (error) {
      this.logger.error('WebSocket authentication error:', error);
      return null;
    }
  }

  async joinRoom(ws, clientId, roomId, userId) {
    // Verify user has access to room
    const { data: access, error } = await database
      .from('room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (error || !access) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'No access to room'
      });
      return;
    }

    // Initialize room sets if not exists
    if (!this.roomClients.has(roomId)) {
      this.roomClients.set(roomId, new Set());
    }
    if (!this.clientRooms.has(clientId)) {
      this.clientRooms.set(clientId, new Set());
    }

    // Add client to room
    this.roomClients.get(roomId).add(clientId);
    this.clientRooms.get(clientId).add(roomId);

    // Get initial Yjs state
    const ydoc = await yjsManager.getOrCreateDocument(roomId);
    const yjsState = Y.encodeStateAsUpdate(ydoc);

    // Send initial state to client
    this.sendToClient(clientId, {
      type: 'yjs-state',
      roomId,
      state: Array.from(yjsState)
    });

    // Get awareness states
    const awarenessStates = yjsManager.getAwarenessStates(roomId);
    this.sendToClient(clientId, {
      type: 'awareness-state',
      roomId,
      states: Array.from(awarenessStates.entries())
    });

    // Notify others in room
    this.broadcastToRoom(roomId, {
      type: 'user-joined',
      clientId,
      userId,
      timestamp: new Date().toISOString()
    }, clientId);

    this.logger.info(`Client ${clientId} joined room ${roomId}`);
  }

  async handleMessage(ws, clientId, data) {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(clientId);
      
      if (!client) {
        ws.close(1008, 'Client not registered');
        return;
      }

      // Update last activity
      client.lastActivity = new Date().toISOString();

      switch (message.type) {
        case 'yjs-update':
          await this.handleYjsUpdate(clientId, message);
          break;
          
        case 'awareness-update':
          await this.handleAwarenessUpdate(clientId, message);
          break;
          
        case 'chat-message':
          await this.handleChatMessage(clientId, message);
          break;
          
        case 'typing':
          await this.handleTypingIndicator(clientId, message);
          break;
          
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
          break;
          
        case 'join-room':
          await this.joinRoom(ws, clientId, message.roomId, client.userId);
          break;
          
        case 'leave-room':
          await this.leaveRoom(clientId, message.roomId);
          break;
          
        default:
          this.logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error('Message handling error:', error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  async handleYjsUpdate(clientId, message) {
    const { roomId, update } = message;
    
    if (!roomId || !update) {
      this.logger.warn('Invalid Yjs update received');
      return;
    }

    try {
      // Process through Yjs Manager
      const stateUpdate = await yjsManager.handleYjsUpdate(
        roomId, 
        { update }, 
        clientId
      );

      // Broadcast to other clients in room
      this.broadcastToRoom(roomId, {
        type: 'yjs-update',
        update: stateUpdate,
        clientId
      }, clientId);

    } catch (error) {
      this.logger.error('Failed to handle Yjs update:', error);
    }
  }

  async handleAwarenessUpdate(clientId, message) {
    const { roomId, state } = message;
    
    if (!roomId) return;

    try {
      const awarenessStates = await yjsManager.handleAwarenessUpdate(
        roomId,
        clientId,
        state
      );

      // Broadcast to other clients in room
      this.broadcastToRoom(roomId, {
        type: 'awareness-update',
        clientId,
        state,
        allStates: awarenessStates
      }, clientId);

    } catch (error) {
      this.logger.error('Failed to handle awareness update:', error);
    }
  }

  async handleChatMessage(clientId, message) {
    const { roomId, content, type = 'text', metadata = {} } = message;
    const client = this.clients.get(clientId);
    
    if (!client || !roomId) return;

    try {
      // Store in database via MessageController
      // This would be handled by your MessageController
      // For now, just broadcast
      
      const chatMessage = {
        id: `${clientId}-${Date.now()}`,
        senderId: client.userId,
        clientId,
        roomId,
        content,
        type,
        metadata,
        timestamp: new Date().toISOString()
      };

      // Add to Yjs document
      const ydoc = yjsManager.getDocument(roomId);
      if (ydoc && ydoc.messages) {
        ydoc.messages.push([chatMessage]);
      }

      // Broadcast to room
      this.broadcastToRoom(roomId, {
        type: 'chat-message',
        message: chatMessage
      });

    } catch (error) {
      this.logger.error('Failed to handle chat message:', error);
    }
  }

  async handleTypingIndicator(clientId, message) {
    const { roomId, isTyping } = message;
    
    if (!roomId) return;

    this.broadcastToRoom(roomId, {
      type: 'typing',
      clientId,
      isTyping,
      timestamp: new Date().toISOString()
    }, clientId);
  }

  async leaveRoom(clientId, roomId) {
    if (this.roomClients.has(roomId)) {
      this.roomClients.get(roomId).delete(clientId);
      
      // Clean up empty room
      if (this.roomClients.get(roomId).size === 0) {
        this.roomClients.delete(roomId);
      }
    }

    if (this.clientRooms.has(clientId)) {
      this.clientRooms.get(clientId).delete(roomId);
    }

    // Notify others in room
    this.broadcastToRoom(roomId, {
      type: 'user-left',
      clientId,
      timestamp: new Date().toISOString()
    });

    this.logger.info(`Client ${clientId} left room ${roomId}`);
  }

  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    
    if (!client) return;

    // Leave all rooms
    if (this.clientRooms.has(clientId)) {
      const rooms = Array.from(this.clientRooms.get(clientId));
      rooms.forEach(roomId => {
        this.leaveRoom(clientId, roomId);
      });
    }

    // Remove from awareness states in all rooms
    const rooms = this.clientRooms.get(clientId) || new Set();
    rooms.forEach(roomId => {
      yjsManager.handleAwarenessUpdate(roomId, clientId, null);
    });

    // Clean up
    this.clients.delete(clientId);
    this.clientRooms.delete(clientId);

    this.logger.info(`Client ${clientId} disconnected`);
  }

  handleError(clientId, error) {
    this.logger.error(`Client ${clientId} error:`, error);
    this.handleDisconnection(clientId);
  }

  // Utility methods
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcastToRoom(roomId, message, excludeClientId = null) {
    if (!this.roomClients.has(roomId)) return;

    const clients = this.roomClients.get(roomId);
    clients.forEach(clientId => {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  broadcastToAll(message, excludeClientId = null) {
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId && client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  getClientCount() {
    return this.clients.size;
  }

  getRoomClientCount(roomId) {
    return this.roomClients.has(roomId) ? this.roomClients.get(roomId).size : 0;
  }

  getClientInfo(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return null;

    return {
      clientId,
      userId: client.userId,
      connectedAt: client.connectedAt,
      lastActivity: client.lastActivity,
      rooms: Array.from(this.clientRooms.get(clientId) || [])
    };
  }

  getRoomInfo(roomId) {
    if (!this.roomClients.has(roomId)) return null;

    const clients = Array.from(this.roomClients.get(roomId));
    const clientInfos = clients.map(clientId => this.getClientInfo(clientId));

    return {
      roomId,
      clientCount: clients.length,
      clients: clientInfos,
      yjsDocument: yjsManager.getDocument(roomId) ? true : false
    };
  }
}
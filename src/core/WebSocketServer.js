import { WebSocketServer as WSServer } from "ws";
import * as Y from "yjs";
import { Logger } from "../utils/Logger.js";
import { setupWSConnection } from "y-websocket/bin/utils";
import jwt from "jsonwebtoken";
import { supabaseConnection } from "../config/supabaseConnection.js";
// import { YdocPersistence } from '../utils/YDocPersistence.js';

// import { YDocPersistence } from '../utils/YDocPersistence.js';
import { YdocPersistence } from "../utils/YdocPersistence.js";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/MySQL/UserModel.js";

export class WebSocketServer {
  static instance = null;

  static getInstance() {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer();
    }
    return WebSocketServer.instance;
  }

  constructor() {
    if (WebSocketServer.instance) return WebSocketServer.instance;

    this.logger = new Logger("WebSocketServer");

    this.wss = null;
    this.documents = new Map(); // roomId -> Y.Doc
    this.clients = new Map(); // clientId -> { ws, userId, lastActivity }
    this.userClients = new Map(); // userId -> Set<clientId>
    this.roomClients = new Map(); // roomId -> Set<clientId>
    this.clientRooms = new Map(); // clientId -> Set<roomId>
    this.typingUsers = new Map(); // roomId -> Set<userId>
    this.supabase = supabaseConnection;

    // Initialize Yjs persistence
    try {
      const persistDir = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../.ydoc-persistence",
      );
      this.ydocPersistence = new YdocPersistence(persistDir); // <-- custom persistence
      this.logger.info(`Yjs persistence initialized at ${persistDir}`);
    } catch (err) {
      this.logger.error(
        "Yjs persistence init failed, falling back to memory:",
        err,
      );
      this.ydocPersistence = {
        getYDoc: async () => new Y.Doc(),
        bindState: async () => ({}),
        writeState: async () => {},
      };
    }

    WebSocketServer.instance = this;
  }

  async initialize(server) {
    this.wss = new WSServer({ noServer: true });

    // Upgrade HTTP to WebSocket
    server.on("upgrade", async (req, socket, head) => {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get("token");
        const clientId = url.searchParams.get("clientId");

        if (!token || !clientId) throw new Error("Missing token or clientId");

        const user = await this.authenticate(token);
        if (!user) throw new Error("Authentication failed");

        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit("connection", ws, req, user, clientId);
        });
      } catch (error) {
        this.logger.error("WebSocket upgrade failed:", error);
        socket.destroy();
      }
    });

    // Main connection handler
    this.wss.on("connection", async (ws, req, user, clientId) => {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const roomId = url.searchParams.get("roomId");
        if (!roomId) throw new Error("Missing roomId");

        this.registerClient(ws, clientId, user.id);

        // Get or create Y.Doc from persistence
        const ydoc = await this.ydocPersistence.getYDoc(roomId);

        // Setup Yjs WebSocket connection
        setupWSConnection(ws, req, {
          docName: roomId,
          gc: true,
          persistence: this.ydocPersistence,
          auth: () => ({ user: { id: user.id, name: user.email } }),
          onDocumentLoad: async () => {
            this.documents.set(roomId, ydoc);

            // Initialize default Y.Doc structures if empty
            const content = ydoc.getMap("content");
            if (content.size === 0) {
              content.set("createdAt", new Date().toISOString());
              content.set("createdBy", user.id);
            }

            await this.joinRoom(ws, clientId, roomId, user.id);
          },
          onDisconnect: async () => await this.handleDisconnection(clientId),
        });

        // Handle normal chat messages (non-Yjs)
        ws.on("message", (data) => this.handleMessage(ws, clientId, data));
        ws.on("close", () => this.handleDisconnection(clientId));
        ws.on("error", (err) =>
          this.logger.error(`WebSocket error for client ${clientId}:`, err),
        );

        this.logger.info(
          `Client ${clientId} (user ${user.id}) connected to room ${roomId}`,
        );
      } catch (err) {
        this.logger.error("WebSocket connection error:", err);
        ws.close(1011, "Internal Server Error");
      }
    });

    this.logger.info("WebSocket server initialized");
  }

  async authenticate(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userModel = new User();
      const user = await userModel.get(decoded.userId);
      if (!user) return null;

      // Update user online
      await userModel.updateUserStatus(user.account_id, "online");
      // await hybridDatabase.syncUserToSupabase(user.account_id.toString());

      return { id: user.account_id.toString(), email: user.email };
    } catch (err) {
      this.logger.error("WebSocket auth error:", err);
      return null;
    }
  }

  async registerClient(ws, clientId, userId) {
    this.clients.set(clientId, { ws, userId, lastActivity: Date.now() });
    if (!this.userClients.has(userId)) this.userClients.set(userId, new Set());
    this.userClients.get(userId).add(clientId);
  }

  async joinRoom(ws, clientId, roomId, userId) {
    if (!this.roomClients.has(roomId)) this.roomClients.set(roomId, new Set());
    this.roomClients.get(roomId).add(clientId);

    if (!this.clientRooms.has(clientId))
      this.clientRooms.set(clientId, new Set());
    this.clientRooms.get(clientId).add(roomId);

    if (!this.typingUsers.has(roomId)) this.typingUsers.set(roomId, new Set());

    // Notify others
    await this.broadcastToRoom(
      roomId,
      { type: "user-joined", userId, clientId },
      [clientId],
    );

    // Send current room state to this client
    await this.sendToClient(clientId, {
      type: "room-state",
      roomId,
      clients: Array.from(this.roomClients.get(roomId)).map((id) => {
        const client = this.clients.get(id);
        return { clientId: id, userId: client?.userId };
      }),
      typingUsers: Array.from(this.typingUsers.get(roomId)),
    });

    this.logger.info(`User ${userId} joined room ${roomId}`);
  }

  async leaveRoom(clientId, roomId) {
    if (this.roomClients.has(roomId)) {
      this.roomClients.get(roomId).delete(clientId);
      if (this.roomClients.get(roomId).size === 0) {
        this.roomClients.delete(roomId);
        this.typingUsers.delete(roomId);
        // Optionally: this.documents.delete(roomId);
      }
    }

    if (this.clientRooms.has(clientId))
      this.clientRooms.get(clientId).delete(roomId);

    const client = this.clients.get(clientId);
    if (client) {
      await this.broadcastToRoom(
        roomId,
        { type: "user-left", clientId, userId: client.userId },
        clientId,
      );
    }
  }

  async handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (this.clientRooms.has(clientId)) {
      const rooms = Array.from(this.clientRooms.get(clientId));
      for (const roomId of rooms) await this.leaveRoom(clientId, roomId);
      this.clientRooms.delete(clientId);
    }

    if (this.userClients.has(client.userId)) {
      const set = this.userClients.get(client.userId);
      set.delete(clientId);
      if (set.size === 0) {
        this.userClients.delete(client.userId);
        await this.updateUserStatus(client.userId, "offline");
      }
    }

    if (client.ws.readyState === client.ws.OPEN) client.ws.close();
    this.clients.delete(clientId);
    this.logger.info(`Client ${clientId} disconnected`);
  }

  async sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== client.ws.OPEN) return false;

    const msgStr =
      typeof message === "string" ? message : JSON.stringify(message);
    client.ws.send(msgStr, (err) => {
      if (err) this.logger.error(`Send to client ${clientId} failed:`, err);
    });
    return true;
  }

  async broadcastToRoom(roomId, message, excludeClientIds = []) {
    if (!this.roomClients.has(roomId)) return;
    const exclude = new Set(excludeClientIds);
    const msgStr =
      typeof message === "string" ? message : JSON.stringify(message);

    for (const clientId of this.roomClients.get(roomId)) {
      if (!exclude.has(clientId)) await this.sendToClient(clientId, msgStr);
    }
  }
}

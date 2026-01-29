// src/core/socket.js (server-side)
import { Server } from 'socket.io';

let io;
const onlineUsers = new Map(); // key = userId, value = { socketId, spaces: Set<spaceUuid> }

export default {
  init: (server) => {
    io = new Server(server, {
      cors: { 
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);

      // When user joins with their userId
      socket.on('user:join', (userId) => {
        onlineUsers.set(userId, {
          socketId: socket.id,
          spaces: new Set()
        });
        console.log(`User ${userId} connected`);
        updateOnlineUsers();
      });

      // Join a chat room
      socket.on('join_chat', ({ spaceUuid }) => {
        const userId = getUserIdBySocketId(socket.id);
        if (!userId) return;

        const userData = onlineUsers.get(userId);
        if (userData) {
          socket.join(`chat:${spaceUuid}`);
          userData.spaces.add(spaceUuid);
          console.log(`User ${userId} joined chat ${spaceUuid}`);
          
          // Notify others in the room
          socket.to(`chat:${spaceUuid}`).emit('user_joined', { userId });
        }
      });

      // Leave a chat room
      socket.on('leave_chat', ({ spaceUuid }) => {
        const userId = getUserIdBySocketId(socket.id);
        if (!userId) return;

        const userData = onlineUsers.get(userId);
        if (userData?.spaces.has(spaceUuid)) {
          socket.leave(`chat:${spaceUuid}`);
          userData.spaces.delete(spaceUuid);
          console.log(`User ${userId} left chat ${spaceUuid}`);
          
          // Notify others in the room
          socket.to(`chat:${spaceUuid}`).emit('user_left', { userId });
        }
      });

      // Handle new messages
      socket.on('send_message', (messageData) => {
        const { spaceUuid, content, senderId } = messageData;
        
        // Create message object
        const message = {
          id: Date.now().toString(),
          content,
          senderId,
          timestamp: new Date().toISOString(),
        };

        // Broadcast to all in the room except sender
        socket.to(`chat:${spaceUuid}`).emit('receive_message', message);
        
        // Also send back to sender for confirmation
        socket.emit('receive_message', message);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const userId = getUserIdBySocketId(socket.id);
        if (!userId) return;

        const userData = onlineUsers.get(userId);
        if (userData) {
          // Notify all spaces the user was in
          userData.spaces.forEach(spaceUuid => {
            socket.to(`chat:${spaceUuid}`).emit('user_left', { userId });
          });
          
          onlineUsers.delete(userId);
          console.log(`User ${userId} disconnected`);
          updateOnlineUsers();
        }
      });

      // Helper function to get user ID by socket ID
      function getUserIdBySocketId(socketId) {
        for (const [userId, data] of onlineUsers.entries()) {
          if (data.socketId === socketId) return userId;
        }
        return null;
      }

      // Update all clients about online users
      function updateOnlineUsers() {
        io.emit('online_users', Array.from(onlineUsers.keys()));
      }
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
import { Server } from 'socket.io';

let io;
const onlineUsers = new Map(); // key = userId, value = socket.id

export default {
  init: (server) => {
    io = new Server(server, {
      cors: { origin: '*' }
    });

    io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);

      // When user joins, they send their userId
      socket.on("user:join", (userId) => {
        onlineUsers.set(userId, socket.id);
        console.log(`User ${userId} is online`);

        // Broadcast updated online users list
        io.emit("onlineUser:update", Array.from(onlineUsers.keys()));
      });

      socket.on('disconnect', () => {
        // Remove user by matching socket.id
        let disconnectedUserId = null;
        for (const [userId, id] of onlineUsers.entries()) {
          if (id === socket.id) {
            disconnectedUserId = userId;
            break;
          }
        }

        if (disconnectedUserId) {
          onlineUsers.delete(disconnectedUserId);
          console.log(`User ${disconnectedUserId} disconnected`);
          io.emit("onlineUser:update", Array.from(onlineUsers.keys()));
        }
      });
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

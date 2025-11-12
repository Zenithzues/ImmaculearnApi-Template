import { Server } from 'socket.io';

let io;
const onlineUser = new Map()

export default {
  init: (server) => {
    io = new Server(server, {
      cors: { origin: '*' }
    });

    io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);

      socket.on("user:join", (socketId) => {
        onlineUser.set(socketId);
        console.log(`User ${socketId} is Online`)

        socket.emit("onlineUser:update", Array.from(onlineUser.keys()));
      })


      socket.on('disconnect', () => {
        for (const [socketId] of onlineUser.entries()) {
          if (socketId === socket.id) {
            onlineUser.delete(socketId);
            console.log(`User ${socketId} Disconnected`);
            io.emit("onlineUsers:update", Array.from(onlineUser.entries()));
            break
          }
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

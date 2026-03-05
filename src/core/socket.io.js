import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import Message from "../models/Supabase/Message.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../data");
const FILE_PATH = path.join(DATA_DIR, "onlineUsers.json");

if (
  !fs.existsSync(FILE_PATH) ||
  fs.readFileSync(FILE_PATH, "utf8").trim() === ""
) {
  ensureDataDir();
  fs.writeFileSync(FILE_PATH, "{}", "utf8");
}

const onlineUsers = new Map();
/*
Map<userId, {
  sockets: Set<socketId>,
  spaces: Set<spaceUuid>
}>
*/

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function serializeOnlineUsers() {
  const obj = {};
  onlineUsers.forEach((value, key) => {
    obj[key] = {
      sockets: Array.from(value.sockets),
      spaces: Array.from(value.spaces),
    };
  });
  return obj;
}

export function saveOnlineUsersToFile() {
  ensureDataDir();
  const data = JSON.stringify(serializeOnlineUsers(), null, 2);
  fs.writeFileSync(FILE_PATH, data, "utf8");
  console.log("Saved online users to onlineUsers.json");
}

export function loadOnlineUsersFromFile() {
  if (!fs.existsSync(FILE_PATH)) return;

  const raw = fs.readFileSync(FILE_PATH, "utf8").trim();
  if (!raw) return;

  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse onlineUsers.json:", err);
    return;
  }

  onlineUsers.clear();
  Object.entries(obj).forEach(([userId, value]) => {
    onlineUsers.set(userId, {
      sockets: new Set(value.sockets || []),
      spaces: new Set(value.spaces || []),
    });
  });

  console.log("Loaded online users from file");
}

function getOnlineUsersPerSpace() {
  const spaceUsers = {};

  onlineUsers.forEach((userData, userId) => {
    userData.spaces.forEach((spaceUuid) => {
      if (!spaceUsers[spaceUuid]) spaceUsers[spaceUuid] = [];
      spaceUsers[spaceUuid].push(userId);
    });
  });

  return spaceUsers;
}

function emitOnlineUsersPerSpace(io) {
  const data = getOnlineUsersPerSpace();
  io.emit("space_online_users_all", data);
}

let ioInstance = null;

export function getIO() {
  return ioInstance;
}

export default function initSocketIO(io) {
  ioInstance = io;
  loadOnlineUsersFromFile();

  io.on("connection", (socket) => {
    console.log("Socket.IO connected:", socket.id);

    // Debug all events
    socket.onAny((event, ...args) => {
      console.log(`[Socket Event] ${event}`, args);
    });

    // 1️⃣ Register user globally
    socket.on("user:join", (userId, ack) => {
      if (!userId) return;

      let user = onlineUsers.get(userId);
      if (!user) {
        user = { sockets: new Set(), spaces: new Set() };
        onlineUsers.set(userId, user);
      }

      user.sockets.add(socket.id);
      socket.userId = userId;

      emitOnlineUsers(io);
      //   saveOnlineUsersToFile();

      if (ack) ack(); // allow client to join chat
    });

    // 2️⃣ Join a chat space
    // socket.on("join_chat", ({ spaceUuid }) => {
    //     const userId = socket.userId;
    //     if (!userId) return;

    //     socket.join(`chat:${spaceUuid}`);

    //     const user = onlineUsers.get(userId);
    //     user.spaces.add(spaceUuid);

    //     // Emit updated space user map to everyone
    //     emitOnlineUsersPerSpace(io);
    //     });

    socket.on("join_chat", async ({ spaceUuid }) => {
      const userId = socket.userId;
      if (!userId) return;

      socket.join(`chat:${spaceUuid}`);

      let user = onlineUsers.get(userId);
      if (!user) {
        user = { sockets: new Set(), spaces: new Set() };
        onlineUsers.set(userId, user);
      }

      user.spaces.add(spaceUuid);

      const history = await Message.findBySpace(spaceUuid);

      // ✅ Send history ONLY to the joining socket
      socket.emit("receive_message", history);

      emitOnlineUsersPerSpace(io);
    });

    socket.on("leave_chat", ({ spaceUuid }) => {
      const userId = socket.userId;
      if (!userId) return;

      socket.leave(`chat:${spaceUuid}`);

      const user = onlineUsers.get(userId);
      user?.spaces.delete(spaceUuid);

      // Emit updated space user map
      emitOnlineUsersPerSpace(io);
    });

    socket.on("get_online_users", () => {
      const data = getOnlineUsersPerSpace(); // returns { spaceUuid: [userIds], ... }
      socket.emit("space_online_users_all", data);
    });

    // socket.on("send_message", (message) => {
    //     const { spaceUuid } = message;
    //     if (!spaceUuid) return;

    //     // Send message to everyone in the space EXCEPT sender
    //     socket.to(`chat:${spaceUuid}`).emit("receive_message", message);

    //     // (Optional) persist message to DB here
    // });

    socket.on("send_message", async (raw) => {
      try {
        const message = new Message(raw);

        await message.save();

        io.to(`chat:${message.spaceUuid}`).emit("receive_message", message);
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("disconnect", () => {
      const userId = socket.userId;
      if (!userId) return;

      const user = onlineUsers.get(userId);
      user?.sockets.delete(socket.id);

      if (user?.sockets.size === 0) {
        user.spaces.forEach((spaceUuid) => {
          socket.to(`chat:${spaceUuid}`).emit("user_left", { userId });
        });
        onlineUsers.delete(userId);
      }

      emitOnlineUsersPerSpace(io);
    });
  });
}

function emitOnlineUsers(io) {
  io.emit("online_users", Array.from(onlineUsers.keys()));
}

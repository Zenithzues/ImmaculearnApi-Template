import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import morgan from "morgan";
import "dotenv/config.js";

import { Server as SocketIOServer } from "socket.io";
import { WebSocketServer } from "ws";

import v1 from "./routes/v1/index.js";
import "./core/database.js";
import initSocketIO from "./core/socket.io.js";
import { handleCRDTConnection } from "./core/crdt.ws.js";

/* ================= CONFIG ================= */

const PORT = process.env.PORT || 3000;

/* ================= EXPRESS APP ================= */

const app = express();
app.set("trust proxy", 1); // FOR RAILWAY
const server = http.createServer(app);

app.use(morgan("combined"));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173"];

app.use(
  "/v1",
  cors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error("Not allowed by CORS")),
    credentials: true,
  }),
  v1,
);

/* ================= SOCKET.IO ================= */

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
  transports: ["websocket"], // force websocket only
});

initSocketIO(io);

/* ================= CRDT WEBSOCKET ================= */

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  console.log(req.url);
  if (req.url.startsWith("/crdt")) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      handleCRDTConnection(ws, req);
    });
  }
});

/* ================= START SERVER ================= */

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `CLIENT reached with URL ${process.env.CLIENT_URL} && http://localhost:5173`,
  );
  console.log(`🚀 Server running on port ${PORT}`);
});

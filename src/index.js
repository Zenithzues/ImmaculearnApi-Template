import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import 'dotenv/config.js';

import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer } from 'ws';

import v1 from './routes/v1/index.js';
import './core/database.js';
import initSocketIO from './core/socket.io.js';
import { handleCRDTConnection } from './core/crdt.ws.js';

const API_PORT = process.env.PORT || 3000;
const CRDT_PORT = process.env.CRDT_PORT || 3001;

/* ---------------- EXPRESS + SOCKET.IO SERVER ---------------- */

const app = express();
const apiServer = http.createServer(app);

app.use(morgan('combined'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
  '/v1',
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
  v1
);

// Socket.IO
const io = new SocketIOServer(apiServer, {
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket'], // 🔥 force websocket only
});

initSocketIO(io);

apiServer.listen(API_PORT, () => {
  console.log(`API + Socket.IO running on http://localhost:${API_PORT}`);
});

/* ---------------- CRDT WEBSOCKET SERVER ---------------- */

// In your main server file
const crdtServer = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('CRDT server running');
});

// Create WebSocket server without `path`
const wss = new WebSocketServer({ noServer: true });

crdtServer.on('upgrade', (req, socket, head) => {
  // Accept only /crdt and any subpaths
  if (!req.url.startsWith('/crdt')) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    handleCRDTConnection(ws, req);
  });
});

crdtServer.listen(CRDT_PORT, () => {
  console.log(`CRDT WebSocket running on ws://localhost:${CRDT_PORT}/crdt`);
});



















// import express from 'express';
// import cookieParser from 'cookie-parser';
// import cors from 'cors';
// import bodyParser from 'body-parser';
// import 'dotenv/config.js';

// import v1 from './routes/v1/index.js';
// import './core/database.js';
// import morgan from 'morgan';
// import http from 'http';

// import socket from './core/socket.js';

// const app = express();
// const port = process.env.PORT || 3000;


// app.use(morgan('combined'));
// app.use(cookieParser());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));

// app.use('/v1', cors(), v1);

// const server = http.createServer(app);
// socket.init(server)


// server.listen(port, () => {
//   console.log(`App and running at port ${port}...`)
// });


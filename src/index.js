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

const app = express();
const port = process.env.PORT || 3000;

/* ---------------- middlewares ---------------- */

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

/* ---------------- http server ---------------- */

const server = http.createServer(app);

/* ---------------- socket.io ---------------- */

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
  transports: ["websocket", "polling"], // allow both
});

initSocketIO(io);

/* ---------------- CRDT WebSocket ---------------- */

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (pathname === '/crdt') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy(); // very important
  }
});

wss.on('connection', handleCRDTConnection);

/* ---------------- start ---------------- */

server.listen(port, () => {
  console.log(`HTTP server running on http://localhost:${port}`);
  console.log(`Socket.IO on /socket.io`);
  console.log(`CRDT WebSocket on ws://localhost:${port}/crdt`);
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


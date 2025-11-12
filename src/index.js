import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bodyParser from 'body-parser';
import 'dotenv/config.js';

import v1 from './routes/v1/index.js';
import './core/database.js';
import morgan from 'morgan';
import http from 'http';

import socket from './core/socket.js';

const app = express();
const port = process.env.PORT || 3000;


app.use(morgan('combined'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/v1', cors(), v1);

const server = http.createServer(app);
socket.init(server)


server.listen(port, () => {
  console.log(`App and running at port ${port}...`)
});


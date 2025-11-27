import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/default-doc');

ws.on('open', () => console.log('Connected to CRDT server'));
ws.on('message', (data) => console.log('Message from server:', data.toString()));
ws.on('close', () => console.log('Disconnected'));

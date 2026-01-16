import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { AllClientToServerEvents, AllServerToClientEvents } from '@heyhey/shared';
import { registerLobbyEvents } from './events/index.js';

const app = express();
const httpServer = createServer(app);

// Parse allowed origins from env (comma-separated) or use localhost defaults
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173', 'http://localhost:4173'];

const io = new Server<AllClientToServerEvents, AllServerToClientEvents>(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register lobby socket events (also handles game events)
registerLobbyEvents(io);

httpServer.listen(PORT, () => {
  console.log(`HeyHey! server running on port ${PORT}`);
});

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename_early = fileURLToPath(import.meta.url);
const __dirname_early = path.dirname(__filename_early);
dotenv.config({ path: path.join(__dirname_early, '..', '.env') });

import campaignsRouter from './routes/campaigns.js';
import contactsRouter from './routes/contacts.js';
import callsRouter from './routes/calls.js';
import statsRouter from './routes/stats.js';
import webhooksRouter from './routes/webhooks.js';
import dncRouter from './routes/dnc.js';
import authRouter from './routes/auth.js';
import { initDatabase } from './db/init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize database
await initDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// WebSocket connections for real-time updates
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected to WebSocket');
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected from WebSocket');
  });
});

// Broadcast function for real-time updates
export const broadcast = (data) => {
  clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
};

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/calls', callsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/dnc', dncRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React frontend in production
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // All non-API routes serve the React app (SPA client-side routing)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
  console.log('📦 Serving React frontend from client/dist');
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🏠 Real Estate Outbound Caller Server running on port ${PORT}`);
  console.log(`📞 WebSocket server ready for real-time updates`);
  if (process.env.RENDER_EXTERNAL_URL) {
    console.log(`🌐 Public URL: ${process.env.RENDER_EXTERNAL_URL}`);
  }
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
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
import meetingsRouter from './routes/meetings.js';
import manualRouter from './routes/manual.js';
import billingRouter, { setBroadcast } from './routes/billing.js';
import adminRouter from './routes/admin.js';
import phoneNumbersRouter from './routes/phoneNumbers.js';
import { initDatabase } from './db/init.js';
import { authenticateToken, getJwtSecret } from './middleware/auth.js';
import jwt from 'jsonwebtoken';
import { generalLimiter, authLimiter, callLimiter } from './middleware/rateLimiter.js';

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

// Gzip/brotli compression
app.use(compression());

// Serve React frontend BEFORE helmet/cors so static files aren't blocked
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, {
    maxAge: '1y',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('.json')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
  console.log('📦 Serving React frontend from client/dist');
}

// CORS restriction (API routes only)
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true
}));

// Security headers via helmet (API routes only)
app.use('/api', helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: (process.env.NODE_ENV === 'production' || process.env.RENDER)
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// WebSocket connections for real-time updates
const clients = new Set();

wss.on('connection', (ws, req) => {
  // Verify token from query string
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  try {
    jwt.verify(token, getJwtSecret());
  } catch (e) {
    ws.close(1008, 'Invalid token');
    return;
  }

  clients.add(ws);

  ws.on('close', () => {
    clients.delete(ws);
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

// Wire broadcast to billing (avoids circular import)
setBroadcast(broadcast);

// General rate limiter for all API routes
app.use('/api/', generalLimiter);

// Auth rate limiter (stricter)
app.use('/api/auth', authLimiter);

// Call initiation rate limiter
app.use('/api/calls/initiate', callLimiter);
app.use('/api/calls/start-campaign', callLimiter);

// API Routes - unprotected routes first
app.use('/api/auth', authRouter);               // login/register are public, /me uses its own auth
app.use('/api/webhooks', webhooksRouter);        // Telnyx webhooks - must be unprotected

// Protected routes - require valid JWT
app.use('/api/campaigns', authenticateToken, campaignsRouter);
app.use('/api/contacts', authenticateToken, contactsRouter);
app.use('/api/calls', authenticateToken, callsRouter);
app.use('/api/stats', authenticateToken, statsRouter);
app.use('/api/dnc', authenticateToken, dncRouter);
app.use('/api/meetings', authenticateToken, meetingsRouter);
app.use('/api/manual', authenticateToken, manualRouter);
app.use('/api/billing', authenticateToken, billingRouter);
app.use('/api/admin', authenticateToken, adminRouter);
app.use('/api/phone-numbers', authenticateToken, phoneNumbersRouter);

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback — all non-API routes serve React app
if (fs.existsSync(clientDist)) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🏠 Real Estate Outbound Caller Server running on port ${PORT}`);
  console.log(`📞 WebSocket server ready for real-time updates`);
  if (process.env.RENDER_EXTERNAL_URL) {
    console.log(`🌐 Public URL: ${process.env.RENDER_EXTERNAL_URL}`);
  }
});

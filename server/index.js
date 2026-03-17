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

// CORS restriction
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// WebSocket connections for real-time updates
const clients = new Set();

wss.on('connection', (ws, req) => {
  // Verify token from query string
  try {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (token) {
      jwt.verify(token, getJwtSecret());
    }
  } catch (e) {
    // Allow connection but log warning — don't break existing clients
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

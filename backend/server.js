import express from 'express';
import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDatabase } from './database/db.js';
import { createApiRouter } from './routes/api.js';
import { getDeviceStatus } from './services/deviceService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Initialize SQLite database
initDatabase();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: false
  }
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  if (req.path !== '/api/health' && req.path !== '/api/device/status') {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Mount API routes
app.use('/api', createApiRouter(io));

// Serve built frontend assets if available
const frontendDist = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  console.log(`[SoundGuard] Serving production frontend from: ${frontendDist}`);
} else {
  // Root fallback in pure API mode
  app.get('/', (req, res) => {
    res.json({
      name: 'SoundGuard IoT Alert Server',
      version: '1.0.0',
      description: 'Real-time sound detection alert system for Deaf and hard-of-hearing users',
      status: 'online',
      endpoints: {
        post_detection: 'POST /api/detections',
        get_history: 'GET /api/detections',
        get_stats: 'GET /api/stats',
        device_heartbeat: 'POST /api/device/heartbeat',
        device_status: 'GET /api/device/status',
        settings: 'GET|PUT /api/settings',
        health: 'GET /api/health'
      }
    });
  });
}

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send initial device status on connect
  socket.emit('device_heartbeat', getDeviceStatus());

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Periodically check device offline status (runs every 5 seconds)
// If device hasn't sent a heartbeat in >30 seconds, inform clients
let lastBroadcastOnlineState = null;
setInterval(() => {
  try {
    const status = getDeviceStatus();
    const isOnline = status.is_online;
    if (lastBroadcastOnlineState !== isOnline) {
      lastBroadcastOnlineState = isOnline;
      io.emit('device_status_change', status);
    }
  } catch (err) {
    // Ignore database lock blips in timer
  }
}, 5000);

// Helper function to find all local IPv4 LAN addresses
function getLocalNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ interface: name, address: iface.address });
      }
    }
  }
  return addresses;
}

// Start server
server.listen(PORT, HOST, () => {
  const localIps = getLocalNetworkAddresses();
  console.log('===========================================================');
  console.log('🛡️  SOUNDGUARD IoT BACKEND SERVER RUNNING');
  console.log('===========================================================');
  console.log(` Local:            http://localhost:${PORT}`);
  console.log(` Network Bind:     http://${HOST}:${PORT}`);
  if (localIps.length > 0) {
    console.log(' LAN IP for ESP32:');
    localIps.forEach(ip => {
      console.log(`   -> http://${ip.address}:${PORT}  (${ip.interface})`);
    });
  } else {
    console.log(' (Run `ipconfig` in Windows Command Prompt to find your Wi-Fi IPv4)');
  }
  console.log(' WebSocket:        Enabled via Socket.IO');
  console.log(' Database:         SQLite (node:sqlite)');
  console.log('===========================================================');
});

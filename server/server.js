import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import apiRoutes from './routes/api.js';
import { WebSocketServer } from 'ws';
import User from './models/User.js';
import Todo from './models/Todo.js';
import Message from './models/Message.js';
import Notification from './models/Notification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// uploads klasörünü public yapmak
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Test endpoint'i
app.get('/api/test', (req, res) => {
  res.json({ msg: 'Backend çalışıyor' });
});

// API rotalarını yüklemeden önce log ekle
console.log('Loading API routes from ./routes/api.js');

// WebSocket server'ı başlat
global.wss = new WebSocketServer({ port: 8080 });

global.wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      console.log('Received WebSocket message:', parsed);
      if (parsed.type === 'join') {
        if (parsed.userId && /^[0-9a-fA-F]{24}$/.test(parsed.userId)) {
          ws.userId = parsed.userId;
          console.log(`User ${parsed.userId} joined WebSocket`);
        } else {
          console.error('Invalid userId:', parsed.userId);
          ws.close(1008, 'Invalid userId');
        }
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
      ws.close(1003, 'Invalid message format');
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`WebSocket disconnected, code: ${code}, reason: ${reason.toString()}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });
});


// Keep-alive mekanizması
setInterval(() => {
  global.wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log(`Terminating inactive WebSocket for userId: ${ws.userId || 'unknown'}`);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 15000); // 15 saniyeye düşürüldü

// Connect'i await ile yap, strictQuery false ekle (bug fix)
mongoose.set('strictQuery', false);
let connected = false;
try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todoapp');
  connected = true;
  console.log('MongoDB connected');
} catch (err) {
  console.log('MongoDB connection error:', err);
  process.exit(1);
}

if (connected) {
  // API rotalarını kullan
  app.use('/api', apiRoutes); // wss zaten global, parametreye gerek yok

  // Debug amaçlı 404 handler
  app.use('*', (req, res) => {
    console.log(`Unmatched route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ msg: 'Route not found' });
  });

  const PORT = process.env.PORT || 5500;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
} else {
  console.log('DB bağlantısı başarısız, sunucu başlatılmadı.');
}
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));
app.use('/voice', express.static(path.join(__dirname, 'public/voice')));

app.get('/api/test', (req, res) => {
  console.log('Test endpoint called');
  res.json({ msg: 'Backend çalışıyor' });
});

app.use('/api', (req, res, next) => {
  console.log(`API isteği: ${req.method} ${req.originalUrl}`);
  next();
}, apiRoutes());

mongoose.set('strictQuery', false);

async function startServer() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/todoapp';
    console.log('MongoDB bağlantı dizesi:', mongoUri);
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB bağlantısı başarılı');

    const PORT = process.env.PORT || 5500;
    const server = app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));

    global.wss = new WebSocketServer({ server });
    global.activeChats = new Map();

    global.wss.on('connection', (ws) => {
      console.log('New WebSocket connection');
      ws.isAlive = true;

      ws.on('pong', () => {
        ws.isAlive = true;
        console.log('Received pong from client');
      });

      ws.on('message', (message) => {
        try {
          const parsed = JSON.parse(message.toString());
          console.log('Received WebSocket message:', parsed);
          if (parsed.type === 'join') {
            if (parsed.userId && /^[0-9a-fA-F]{24}$/.test(parsed.userId)) {
              ws.userId = parsed.userId;
              console.log(`User ${parsed.userId} joined WebSocket`);
            } else {
              console.error('Invalid userId:', parsed.userId);
              ws.close(1008, 'Invalid userId');
            }
          } else if (parsed.type === 'enterChat' && ws.userId && parsed.chatWith) {
            global.activeChats.set(ws.userId, parsed.chatWith);
            console.log(`User ${ws.userId} entered chat with ${parsed.chatWith}`);
          } else if (parsed.type === 'leaveChat' && ws.userId) {
            global.activeChats.delete(ws.userId);
            console.log(`User ${ws.userId} left chat`);
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
          ws.close(1003, 'Invalid message format');
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`WebSocket disconnected, code: ${code}, reason: ${reason.toString()}`);
        if (ws.userId) {
          global.activeChats.delete(ws.userId);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket server error:', error);
      });
    });

    setInterval(() => {
      global.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          console.log(`Terminating inactive WebSocket for userId: ${ws.userId || 'unknown'}`);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
        console.log('Sent ping to client');
      });
    }, 15000);

    app.use('*', (req, res) => {
      console.log(`Eşleşmeyen rota: ${req.method} ${req.originalUrl}`);
      res.status(404).json({ msg: 'Rota bulunamadı' });
    });
  } catch (err) {
    console.error('MongoDB bağlantı hatası:', err);
    process.exit(1);
  }
}

startServer();
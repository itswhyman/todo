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

app.get('/api/test', (req, res) => {
  res.json({ msg: 'Backend çalışıyor' });
});

console.log('Loading API routes from ./routes/api.js');

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

setInterval(() => {
  global.wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log(`Terminating inactive WebSocket for userId: ${ws.userId || 'unknown'}`);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 15000);

mongoose.set('strictQuery', false);
let connected = false;
try {
  // Bağlantı dizesini ve ortam değişkenlerini kontrol et
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/todoapp';
  console.log('MongoDB bağlantı dizesi:', mongoUri); // Hata ayıklama için
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Bağlantı zaman aşımı
  });
  connected = true;
  console.log('MongoDB bağlantısı başarılı');
} catch (err) {
  console.log('MongoDB bağlantı hatası:', err);
  process.exit(1);
}

if (connected) {
  app.use('/api', apiRoutes());

  app.use('*', (req, res) => {
    console.log(`Eşleşmeyen rota: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ msg: 'Rota bulunamadı' });
  });

  const PORT = process.env.PORT || 5500;
  app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));
} else {
  console.log('DB bağlantısı başarısız, sunucu başlatılmadı.');
}
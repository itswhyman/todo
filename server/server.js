import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// uploads klasörünü public yapmak
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect'i await ile yap, strictQuery false ekle (bug fix)
mongoose.set('strictQuery', false);  // Bug'u atlat: writeErrors crash'i önler
let connected = false;
try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todoapp');
  connected = true;
  console.log('MongoDB connected');
} catch (err) {
  console.log('MongoDB connection error:', err);
  process.exit(1);  // Hata olursa sunucuyu kapat
}

if (connected) {
  
  app.use('/api', apiRoutes);

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
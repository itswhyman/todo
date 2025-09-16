import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    console.error('Token gerekli hatası (konsola loglandı): Bearer <token> bekleniyor');
    return res.status(401).json({ msg: 'Token gerekli' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);
    if (!user || user.isBanned) {
      console.error('Banlı kullanıcı veya geçersiz token hatası (konsola loglandı)');
      return res.status(401).json({ msg: 'Geçersiz token veya banlı kullanıcı' });
    }
    req.user = decoded;
    req.userId = decoded.id; // api.js ile uyumluluk için korundu
    next();
  } catch (e) {
    console.error('Geçersiz token hatası (konsola loglandı):', e.message);
    return res.status(401).json({ msg: 'Geçersiz token' });
  }
};

export default authMiddleware;
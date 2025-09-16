import jwt from 'jsonwebtoken';

const authMiddleware = async (req, res, next) => {
  try {
    // Authorization başlığını al
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ msg: 'Yetkilendirme başlığı eksik' });
    }

    // Bearer token formatını kontrol et
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ msg: 'Geçersiz token formatı' });
    }

    // Token'ı doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (!decoded.id) {
      return res.status(401).json({ msg: 'Geçersiz token' });
    }

    // req.user'a decoded veriyi ekle
    req.user = { id: decoded.id, isAdmin: decoded.isAdmin };
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ msg: 'Token doğrulama başarısız' });
  }
};

export default authMiddleware;
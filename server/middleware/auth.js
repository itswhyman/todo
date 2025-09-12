module.exports = (req, res, next) => {
  // Yukarıdaki authMiddleware'i buraya taşı
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ msg: 'Invalid token' });
  }
};
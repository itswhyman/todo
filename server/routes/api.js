import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Todo from '../models/Todo.js';
import Message from '../models/Message.js';

const router = express.Router();

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ msg: 'Token gerekli (Bearer <token>)' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ msg: 'Geçersiz token' });
  }
};

// Signup
router.post('/signup', async (req, res) => {
  try {
    console.log('Signup body received:', req.body);  // Backend debug
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ msg: 'Kullanıcı adı, email ve şifre gerekli (boş olamaz)' });
    }
    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: 'Geçersiz email formatı' });
    }
    if (password.length < 6) {
      return res.status(400).json({ msg: 'Şifre en az 6 karakter olmalı' });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ msg: `Email (${email}) veya kullanıcı adı (${username}) zaten kullanılıyor` });
    }
    const user = new User({ username, email, password });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret');
    console.log('Signup success, token generated');
    res.json({ token, user: { id: user._id, username, email } });
  } catch (err) {
    console.log('Signup error details:', err);  // Detaylı log
    res.status(400).json({ msg: err.message || 'Kayıt sırasında hata oluştu' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('Login body received:', req.body);  // Backend debug
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: 'Email ve şifre gerekli (boş olamaz)' });
    }
    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: 'Geçersiz email formatı' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Kullanıcı bulunamadı (email kayıtlı değil)' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Şifre yanlış' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret');
    console.log('Login success, token generated');
    res.json({ token, user: { id: user._id, username: user.username, email } });
  } catch (err) {
    console.log('Login error details:', err);  // Detaylı log
    res.status(400).json({ msg: err.message || 'Giriş sırasında hata oluştu' });
  }
});

// Diğer route'lar aynı (Get User, Todos, vb.) – try-catch'ler zaten var.
router.get('/user/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    res.json(user || { msg: 'Kullanıcı yok' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/todos', authMiddleware, async (req, res) => {
  try {
    const todos = await Todo.find({ user: req.user.id });
    res.json(todos);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/todos', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ msg: 'Todo metni gerekli' });
    const todo = new Todo({ text, user: req.user.id });
    await todo.save();
    res.json(todo);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete('/todos/:id', authMiddleware, async (req, res) => {
  try {
    await Todo.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ $or: [{ sender: req.user.id }, { receiver: req.user.id }] }).populate('sender receiver', 'username');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { text, receiver } = req.body;
    if (!text || !receiver) return res.status(400).json({ msg: 'Mesaj ve alıcı gerekli' });
    const message = new Message({ text, sender: req.user.id, receiver });
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/users', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ msg: 'Arama terimi gerekli' });
    const users = await User.find({ username: new RegExp(q, 'i') }).select('username email');
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

export default router;
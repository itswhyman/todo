import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import User from '../models/User.js';
import Todo from '../models/Todo.js';
import Message from '../models/Message.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Multer yapılandırması
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../Uploads/'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Sadece JPEG, PNG veya GIF dosyaları kabul edilir'));
  },
});

// Admin Middleware
const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ msg: 'Admin yetkisi gerekli' });
  }
  next();
};

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ msg: 'Token gerekli (Bearer <token>)' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);
    if (!user || user.isBanned) {
      return res.status(401).json({ msg: 'Banlı kullanıcı veya geçersiz token' });
    }
    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (e) {
    res.status(401).json({ msg: 'Geçersiz token' });
  }
};

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ msg: 'Kullanıcı adı, email ve şifre gerekli' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ msg: 'Geçersiz email formatı' });
    if (password.length < 6) return res.status(400).json({ msg: 'Şifre en az 6 karakter olmalı' });
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ msg: 'Email veya kullanıcı adı zaten kullanılıyor' });
    }
    const user = new User({ username, email, password });
    await user.save();
    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET || 'secret');
    res.json({ token, user: { id: user._id, username, email } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(400).json({ msg: err.message || 'Kayıt sırasında hata oluştu' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Email ve şifre gerekli' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ msg: 'Geçersiz email formatı' });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Kullanıcı bulunamadı' });
    if (user.isBanned) return res.status(403).json({ msg: 'Hesabınız banlanmış' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ msg: 'Şifre yanlış' });
    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET || 'secret');
    res.json({ token, user: { id: user._id, username: user.username, email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(400).json({ msg: err.message || 'Giriş sırasında hata oluştu' });
  }
});

// User Routes
router.get('/user/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('todos')
      .populate({
        path: 'followers',
        select: 'username',
        match: { _id: { $nin: (await User.findById(req.userId)).blockedUsers || [] } },
      })
      .populate({
        path: 'following',
        select: 'username',
        match: { _id: { $nin: (await User.findById(req.userId)).blockedUsers || [] } },
      });
    if (!user) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
    const currentUser = await User.findById(req.userId);
    res.json({
      ...user.toJSON(), // Virtuals dahil edilir
      blockedByCurrentUser: currentUser.blockedUsers?.some(b => b._id.equals(user._id)) || false,
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ msg: err.message || 'Kullanıcı bilgisi alınamadı' });
  }
});

// Profil güncelleme
router.put('/user/:id', [authMiddleware, upload.single('file')], async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ msg: 'Kendi profilinizi güncelleyebilirsiniz' });
    }
    const { username, password, profilePicture, bio } = req.body;
    const updateData = {};
    if (username) {
      if (username.length < 3) return res.status(400).json({ msg: 'Kullanıcı adı en az 3 karakter olmalı' });
      updateData.username = username;
    }
    if (bio) updateData.bio = bio;
    if (password) {
      if (password.length < 6) return res.status(400).json({ msg: 'Şifre en az 6 karakter olmalı' });
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (req.file) {
      updateData.profilePicture = `http://localhost:5500/uploads/${req.file.filename}`;
    } else if (profilePicture) {
      const urlRegex = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif))$/i;
      if (!urlRegex.test(profilePicture)) return res.status(400).json({ msg: 'Geçersiz profil resmi URL’si (PNG/JPEG/GIF olmalı)' });
      updateData.profilePicture = profilePicture;
    }
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');
    if (!updatedUser) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
    res.json(updatedUser);
  } catch (err) {
    console.error('Profile update error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Bu kullanıcı adı zaten kullanılıyor' });
    }
    if (err.message.includes('file')) {
      return res.status(400).json({ msg: 'Geçersiz dosya formatı veya boyutu (max 5MB, JPEG/PNG/GIF)' });
    }
    res.status(500).json({ msg: err.message || 'Güncelleme sırasında hata oluştu' });
  }
});

// Followers, Following, Blocked
router.get('/user/:id/followers', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const user = await User.findById(req.params.id).populate({
      path: 'followers',
      select: 'username email profilePicture',
      match: { _id: { $nin: currentUser ? currentUser.blockedUsers : [] } },
    });
    if (!user) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
    res.json(user.followers || []);
  } catch (err) {
    console.error('Get followers error:', err);
    res.status(500).json({ msg: err.message || 'Takipçi bilgisi alınamadı' });
  }
});

router.get('/user/:id/following', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const user = await User.findById(req.params.id).populate({
      path: 'following',
      select: 'username email profilePicture',
      match: { _id: { $nin: currentUser ? currentUser.blockedUsers : [] } },
    });
    if (!user) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
    res.json(user.following || []);
  } catch (err) {
    console.error('Get following error:', err);
    res.status(500).json({ msg: err.message || 'Takip edilen bilgisi alınamadı' });
  }
});

router.get('/user/:id/blocked', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('blockedUsers', 'username email profilePicture');
    if (!user) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
    res.json(user.blockedUsers || []);
  } catch (err) {
    console.error('Get blocked users error:', err);
    res.status(500).json({ msg: err.message || 'Engellenen kullanıcı bilgisi alınamadı' });
  }
});

// Follow / Unfollow / Block / Unblock / Ban / Unban
router.post('/user/:id/follow', authMiddleware, async (req, res) => {
  try {
    if (req.userId === req.params.id) return res.status(400).json({ msg: 'Kendinizi takip edemezsiniz' });
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.userId);
    if (!userToFollow || !currentUser) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
    if (currentUser.blockedUsers.includes(req.params.id)) {
      return res.status(400).json({ msg: 'Engellediğiniz kullanıcıyı takip edemezsiniz' });
    }
    if (currentUser.following.includes(req.params.id)) {
      return res.status(400).json({ msg: 'Zaten takip ediyorsunuz' });
    }
    currentUser.following.push(req.params.id);
    currentUser.followingCount = (currentUser.followingCount || 0) + 1;
    userToFollow.followers.push(req.userId);
    userToFollow.followersCount = (userToFollow.followersCount || 0) + 1;
    await currentUser.save();
    await userToFollow.save();
    res.json({ msg: 'Takip edildi' });
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ msg: err.message || 'Takip işlemi başarısız' });
  }
});

router.post('/user/:id/unfollow', authMiddleware, async (req, res) => {
  try {
    if (req.userId === req.params.id) return res.status(400).json({ msg: 'Kendinizi takipten çıkaramazsınız' });
    const userToUnfollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.userId);
    if (!userToUnfollow || !currentUser) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
    if (!currentUser.following.includes(req.params.id)) {
      return res.status(400).json({ msg: 'Zaten takip etmiyorsunuz' });
    }
    currentUser.following.pull(req.params.id);
    currentUser.followingCount = (currentUser.followingCount || 0) - 1;
    userToUnfollow.followers.pull(req.userId);
    userToUnfollow.followersCount = (userToUnfollow.followersCount || 0) - 1;
    await currentUser.save();
    await userToUnfollow.save();
    res.json({ msg: 'Takip bırakıldı' });
  } catch (err) {
    console.error('Unfollow error:', err);
    res.status(500).json({ msg: err.message || 'Takip bırakma başarısız' });
  }
});

router.post('/user/:id/block', authMiddleware, async (req, res) => {
  try {
    if (req.userId === req.params.id) return res.status(400).json({ msg: 'Kendinizi engelleyemezsiniz' });
    const userToBlock = await User.findById(req.params.id);
    const currentUser = await User.findById(req.userId);
    if (!userToBlock || !currentUser) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
    if (currentUser.blockedUsers.includes(req.params.id)) {
      return res.status(400).json({ msg: 'Kullanıcı zaten engellenmiş' });
    }
    currentUser.blockedUsers.push(req.params.id);
    currentUser.following.pull(req.params.id);
    userToBlock.followers.pull(req.userId);
    currentUser.followingCount = (currentUser.followingCount || 0) - 1;
    userToBlock.followersCount = (userToBlock.followersCount || 0) - 1;
    await currentUser.save();
    await userToBlock.save();
    res.json({ msg: 'Kullanıcı engellendi' });
  } catch (err) {
    console.error('Block error:', err);
    res.status(500).json({ msg: err.message || 'Engelleme başarısız' });
  }
});

router.post('/user/:id/unblock', authMiddleware, async (req, res) => {
  try {
    if (req.userId === req.params.id) return res.status(400).json({ msg: 'Kendinizi engelini kaldıramazsınız' });
    const userToUnblock = await User.findById(req.params.id);
    const currentUser = await User.findById(req.userId);
    if (!userToUnblock || !currentUser) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
    if (!currentUser.blockedUsers.includes(req.params.id)) {
      return res.status(400).json({ msg: 'Kullanıcı engellenmemiş' });
    }
    currentUser.blockedUsers.pull(req.params.id);
    await currentUser.save();
    res.json({ msg: 'Engel kaldırıldı' });
  } catch (err) {
    console.error('Unblock error:', err);
    res.status(500).json({ msg: err.message || 'Engel kaldırma başarısız' });
  }
});

router.post('/user/:id/ban', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    if (req.userId === req.params.id) return res.status(400).json({ msg: 'Kendinizi banlayamazsınız' });
    const userToBan = await User.findById(req.params.id);
    if (!userToBan) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
    if (userToBan.isBanned) return res.status(400).json({ msg: 'Kullanıcı zaten banlı' });
    userToBan.isBanned = true;
    await userToBan.save();
    res.json({ msg: 'Kullanıcı banlandı' });
  } catch (err) {
    console.error('Ban error:', err);
    res.status(500).json({ msg: err.message || 'Banlama başarısız' });
  }
});

router.post('/user/:id/unban', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    if (req.userId === req.params.id) return res.status(400).json({ msg: 'Kendi banınızı kaldıramazsınız' });
    const userToUnban = await User.findById(req.params.id);
    if (!userToUnban) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
    if (!userToUnban.isBanned) return res.status(400).json({ msg: 'Kullanıcı banlı değil' });
    userToUnban.isBanned = false;
    await userToUnban.save();
    res.json({ msg: 'Ban kaldırıldı' });
  } catch (err) {
    console.error('Unban error:', err);
    res.status(500).json({ msg: err.message || 'Ban kaldırma başarısız' });
  }
});

// Todos
router.get('/todos', authMiddleware, async (req, res) => {
  try {
    let query = { user: req.user.id };
    if (req.query.date) {
      query.date = new Date(req.query.date);
      query.date.setHours(0, 0, 0, 0);
    }
    const todos = await Todo.find(query);
    res.json(todos);
  } catch (err) {
    console.error('Get todos error:', err);
    res.status(500).json({ msg: err.message || 'Todo bilgisi alınamadı' });
  }
});

router.post('/todos', authMiddleware, async (req, res) => {
  try {
    const { text, date } = req.body;
    if (!text) return res.status(400).json({ msg: 'Todo metni gerekli' });
    const todo = new Todo({
      text,
      date: date ? new Date(date) : new Date(),
      user: req.user.id,
    });
    await todo.save();
    res.json(todo);
  } catch (err) {
    console.error('Create todo error:', err);
    res.status(500).json({ msg: err.message || 'Todo oluşturma başarısız' });
  }
});

router.put('/todos/:id', authMiddleware, async (req, res) => {
  try {
    const { completed } = req.body;
    if (typeof completed !== 'boolean') return res.status(400).json({ msg: 'Completed boolean olmalı' });
    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { completed },
      { new: true }
    );
    if (!todo) return res.status(404).json({ msg: 'Todo bulunamadı' });
    res.json(todo);
  } catch (err) {
    console.error('Update todo error:', err);
    res.status(500).json({ msg: err.message || 'Todo güncelleme başarısız' });
  }
});

router.delete('/todos/:id', authMiddleware, async (req, res) => {
  try {
    await Todo.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ msg: 'Deleted' });
  } catch (err) {
    console.error('Delete todo error:', err);
    res.status(500).json({ msg: err.message || 'Todo silme başarısız' });
  }
});

// Messages
router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
    }).populate('sender receiver', 'username');
    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ msg: err.message || 'Mesaj bilgisi alınamadı' });
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
    console.error('Create message error:', err);
    res.status(500).json({ msg: err.message || 'Mesaj oluşturma başarısız' });
  }
});

// User Search
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ msg: 'Arama terimi gerekli' });

    // Regex'i güvenli hale getir: ^ ile baş harfi, /i case-insensitive
    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Özel karakterleri escape et
    const regex = new RegExp('^' + escapedQ, 'i');

    const users = await User.find({ username: regex })
      .select('username email profilePicture')
      .collation({ locale: 'tr', strength: 1 }) // Türkçe case-insensitive: 'e' = 'E', strength 1 primary match
      .lean(); // Plain objects: Serialization bug'unu atlar

    res.json(users || []);
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ msg: err.message || 'Kullanıcı arama başarısız' });
  }
});

export default router;
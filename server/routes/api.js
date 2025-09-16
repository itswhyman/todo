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
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

console.log('API routes initialized');

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
  limits: { fileSize: 5 * 1024 * 1024 },
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

const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ msg: 'Admin yetkisi gerekli' });
  }
  next();
};

export default function () {
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
      res.json({ token, user: { id: user._id.toString(), username, email } });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(400).json({ msg: 'Kayıt sırasında hata oluştu' });
    }
  });

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
      res.json({ token, user: { id: user._id.toString(), username: user.username, email } });
    } catch (err) {
      console.error('Login error:', err);
      res.status(400).json({ msg: 'Giriş sırasında hata oluştu' });
    }
  });

  router.get('/users/:id', authMiddleware, async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'Geçersiz kullanıcı ID' });
      }
      const user = await User.findById(req.params.id)
        .select('-password')
        .populate('todos')
        .populate({
          path: 'followers',
          select: 'username',
          match: { _id: { $nin: (await User.findById(req.user.id)).blockedUsers || [] } },
        })
        .populate({
          path: 'following',
          select: 'username',
          match: { _id: { $nin: (await User.findById(req.user.id)).blockedUsers || [] } },
        });
      if (!user) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
      const currentUser = await User.findById(req.user.id);
      res.json({
        ...user.toJSON(),
        blockedByCurrentUser: currentUser.blockedUsers?.some(b => b._id.equals(user._id)) || false,
      });
    } catch (err) {
      console.error('Get user error:', err);
      res.status(500).json({ msg: 'Kullanıcı bilgisi alınamadı' });
    }
  });

  router.put('/users/:id', [authMiddleware, upload.single('file')], async (req, res) => {
    try {
      if (req.user.id !== req.params.id) {
        return res.status(403).json({ msg: 'Kendi profilinizi güncelleyebilirsiniz' });
      }
      const { username, bio, profilePicture } = req.body;
      const updateData = {};
      if (username) {
        if (username.length < 3) return res.status(400).json({ msg: 'Kullanıcı adı en az 3 karakter olmalı' });
        updateData.username = username;
      }
      if (bio) updateData.bio = bio;
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
      res.status(500).json({ msg: 'Güncelleme sırasında hata oluştu' });
    }
  });

  router.put('/users/:id/password', authMiddleware, async (req, res) => {
    try {
      if (req.user.id !== req.params.id) {
        return res.status(403).json({ msg: 'Kendi şifrenizi değiştirebilirsiniz' });
      }
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ msg: 'Eski ve yeni şifre gerekli' });
      }
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) return res.status(400).json({ msg: 'Eski şifre yanlış' });
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await User.findByIdAndUpdate(req.user.id, { password: hashedPassword });
      res.json({ msg: 'Şifre başarıyla değiştirildi' });
    } catch (err) {
      console.error('Password update error:', err);
      res.status(500).json({ msg: 'Şifre değiştirme başarısız' });
    }
  });

  router.get('/users/:id/followers', authMiddleware, async (req, res) => {
    try {
      const currentUser = await User.findById(req.user.id);
      const user = await User.findById(req.params.id).populate({
        path: 'followers',
        select: 'username email profilePicture',
        match: { _id: { $nin: currentUser ? currentUser.blockedUsers : [] } },
      });
      if (!user) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
      res.json(user.followers || []);
    } catch (err) {
      console.error('Get followers error:', err);
      res.status(500).json({ msg: 'Takipçi bilgisi alınamadı' });
    }
  });

  router.get('/users/:id/following', authMiddleware, async (req, res) => {
    try {
      const currentUser = await User.findById(req.user.id);
      const user = await User.findById(req.params.id).populate({
        path: 'following',
        select: 'username email profilePicture',
        match: { _id: { $nin: currentUser ? currentUser.blockedUsers : [] } },
      });
      if (!user) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
      res.json(user.following || []);
    } catch (err) {
      console.error('Get following error:', err);
      res.status(500).json({ msg: 'Takip edilen bilgisi alınamadı' });
    }
  });

  router.get('/users/:id/blocked', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.params.id).populate('blockedUsers', 'username email profilePicture');
      if (!user) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
      res.json(user.blockedUsers || []);
    } catch (err) {
      console.error('Get blocked users error:', err);
      res.status(500).json({ msg: 'Engellenen kullanıcı bilgisi alınamadı' });
    }
  });

  router.post('/users/:id/follow', authMiddleware, async (req, res) => {
    try {
      if (req.user.id === req.params.id) return res.status(400).json({ msg: 'Kendinizi takip edemezsiniz' });
      const userToFollow = await User.findById(req.params.id);
      const currentUser = await User.findById(req.user.id);
      if (!userToFollow || !currentUser) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
      if (currentUser.blockedUsers.includes(req.params.id)) {
        return res.status(400).json({ msg: 'Engellediğiniz kullanıcıyı takip edemezsiniz' });
      }
      if (currentUser.following.includes(req.params.id)) {
        return res.status(400).json({ msg: 'Zaten takip ediyorsunuz' });
      }
      currentUser.following.push(req.params.id);
      currentUser.followingCount = (currentUser.followingCount || 0) + 1;
      userToFollow.followers.push(req.user.id);
      userToFollow.followersCount = (userToFollow.followersCount || 0) + 1;
      await currentUser.save();
      await userToFollow.save();
      res.json({ msg: 'Takip edildi' });
    } catch (err) {
      console.error('Follow error:', err);
      res.status(500).json({ msg: 'Takip işlemi başarısız' });
    }
  });

  router.post('/users/:id/unfollow', authMiddleware, async (req, res) => {
    try {
      if (req.user.id === req.params.id) return res.status(400).json({ msg: 'Kendinizi takipten çıkaramazsınız' });
      const userToUnfollow = await User.findById(req.params.id);
      const currentUser = await User.findById(req.user.id);
      if (!userToUnfollow || !currentUser) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
      if (!currentUser.following.includes(req.params.id)) {
        return res.status(400).json({ msg: 'Zaten takip etmiyorsunuz' });
      }
      currentUser.following.pull(req.params.id);
      userToUnfollow.followers.pull(req.user.id);
      currentUser.followingCount = Math.max(0, (currentUser.followingCount || 0) - 1);
      userToUnfollow.followersCount = Math.max(0, (userToUnfollow.followersCount || 0) - 1);
      await currentUser.save();
      await userToUnfollow.save();
      res.json({ msg: 'Takip bırakıldı' });
    } catch (err) {
      console.error('Unfollow error:', err);
      res.status(500).json({ msg: 'Takip bırakma başarısız' });
    }
  });

  router.post('/users/:id/block', authMiddleware, async (req, res) => {
    try {
      if (req.user.id === req.params.id) return res.status(400).json({ msg: 'Kendinizi engelleyemezsiniz' });
      const userToBlock = await User.findById(req.params.id);
      const currentUser = await User.findById(req.user.id);
      if (!userToBlock || !currentUser) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
      if (currentUser.blockedUsers.includes(req.params.id)) {
        return res.status(400).json({ msg: 'Kullanıcı zaten engellenmiş' });
      }
      currentUser.blockedUsers.push(req.params.id);
      currentUser.following.pull(req.params.id);
      userToBlock.followers.pull(req.user.id);
      currentUser.followingCount = Math.max(0, (currentUser.followingCount || 0) - 1);
      userToBlock.followersCount = Math.max(0, (userToBlock.followersCount || 0) - 1);
      await currentUser.save();
      await userToBlock.save();
      res.json({ msg: 'Kullanıcı engellendi' });
    } catch (err) {
      console.error('Block error:', err);
      res.status(500).json({ msg: 'Engelleme başarısız' });
    }
  });

  router.post('/users/:id/unblock', authMiddleware, async (req, res) => {
    try {
      if (req.user.id === req.params.id) return res.status(400).json({ msg: 'Kendinizi engelini kaldıramazsınız' });
      const userToUnblock = await User.findById(req.params.id);
      const currentUser = await User.findById(req.user.id);
      if (!userToUnblock || !currentUser) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
      if (!currentUser.blockedUsers.includes(req.params.id)) {
        return res.status(400).json({ msg: 'Kullanıcı engellenmemiş' });
      }
      currentUser.blockedUsers.pull(req.params.id);
      await currentUser.save();
      res.json({ msg: 'Engel kaldırıldı' });
    } catch (err) {
      console.error('Unblock error:', err);
      res.status(500).json({ msg: 'Engel kaldırma başarısız' });
    }
  });

  router.post('/users/:id/ban', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
      if (req.user.id === req.params.id) return res.status(400).json({ msg: 'Kendinizi banlayamazsınız' });
      const userToBan = await User.findById(req.params.id);
      if (!userToBan) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
      if (userToBan.isBanned) return res.status(400).json({ msg: 'Kullanıcı zaten banlı' });
      userToBan.isBanned = true;
      await userToBan.save();
      res.json({ msg: 'Kullanıcı banlandı' });
    } catch (err) {
      console.error('Ban error:', err);
      res.status(500).json({ msg: 'Banlama başarısız' });
    }
  });

  router.post('/users/:id/unban', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
      if (req.user.id === req.params.id) return res.status(400).json({ msg: 'Kendi banınızı kaldıramazsınız' });
      const userToUnban = await User.findById(req.params.id);
      if (!userToUnban) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
      if (!userToUnban.isBanned) return res.status(400).json({ msg: 'Kullanıcı banlı değil' });
      userToUnban.isBanned = false;
      await userToUnban.save();
      res.json({ msg: 'Ban kaldırıldı' });
    } catch (err) {
      console.error('Unban error:', err);
      res.status(500).json({ msg: 'Ban kaldırma başarısız' });
    }
  });

  router.get('/todos', authMiddleware, async (req, res) => {
    try {
      let query = { user: req.user.id };
      if (req.query.date) {
        const date = new Date(req.query.date);
        date.setUTCHours(date.getUTCHours() + 3);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        query.date = { $gte: startOfDay, $lte: endOfDay };
      }
      const todos = await Todo.find(query);
      res.json(todos);
    } catch (err) {
      console.error('Get todos error:', err);
      res.status(500).json({ msg: 'Todo bilgisi alınamadı' });
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
      res.status(500).json({ msg: 'Todo oluşturma başarısız' });
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
      res.status(500).json({ msg: 'Todo güncelleme başarısız' });
    }
  });

  router.delete('/todos/:id', authMiddleware, async (req, res) => {
    try {
      await Todo.findOneAndDelete({ _id: req.params.id, user: req.user.id });
      res.json({ msg: 'Deleted' });
    } catch (err) {
      console.error('Delete todo error:', err);
      res.status(500).json({ msg: 'Todo silme başarısız' });
    }
  });

  router.get('/messages', authMiddleware, async (req, res) => {
    try {
      const messages = await Message.find({
        $or: [
          { sender: req.user.id, receiver: { $ne: req.user.id }, isDeleted: { $ne: true } },
          { receiver: req.user.id, isDeleted: { $ne: true } },
        ],
      })
        .populate('sender receiver', 'username profilePicture')
        .sort({ timestamp: 1 });
      res.json(messages);
    } catch (err) {
      console.error('Get messages error:', err);
      res.status(500).json({ msg: 'Mesaj bilgisi alınamadı' });
    }
  });

  router.post('/messages', authMiddleware, async (req, res) => {
    try {
      const { text, receiver } = req.body;
      if (!text || !receiver) return res.status(400).json({ msg: 'Mesaj ve alıcı gerekli' });
      if (!mongoose.Types.ObjectId.isValid(receiver)) {
        return res.status(400).json({ msg: 'Geçersiz alıcı ID' });
      }
      const receiverUser = await User.findById(receiver);
      if (!receiverUser) return res.status(404).json({ msg: 'Alıcı kullanıcı bulunamadı' });
      if (receiverUser.isBanned) return res.status(403).json({ msg: 'Alıcı kullanıcı banlı' });
      const currentUser = await User.findById(req.user.id);
      if (currentUser.blockedUsers.includes(receiver)) {
        return res.status(403).json({ msg: 'Engellenen bir kullanıcıya mesaj gönderilemez' });
      }
      const message = new Message({ text, sender: req.user.id, receiver });
      await message.save();
      const populatedMessage = await Message.findById(message._id).populate('sender receiver', 'username profilePicture');
      global.wss.clients.forEach(client => {
        if (
          client.readyState === WebSocket.OPEN &&
          (client.userId === req.user.id.toString() || client.userId === receiver)
        ) {
          client.send(JSON.stringify({ type: 'newMessage', message: populatedMessage }));
        }
      });
      res.status(201).json(populatedMessage);
    } catch (err) {
      console.error('Create message error:', err);
      res.status(500).json({ msg: 'Mesaj oluşturma başarısız' });
    }
  });

  router.post('/notifications', authMiddleware, async (req, res) => {
    try {
      const { userId, message } = req.body;
      if (!userId || !message) return res.status(400).json({ msg: 'Kullanıcı ID ve mesaj gerekli' });
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ msg: 'Geçersiz kullanıcı ID' });
      }
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ msg: 'Kullanıcı bulunamadı' });
      const notification = new Notification({ userId, message });
      await notification.save();
      const populatedNotification = await Notification.findById(notification._id).lean();
      global.wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.userId === userId) {
          client.send(JSON.stringify({ type: 'newNotification', notification: populatedNotification }));
        }
      });
      res.status(201).json(populatedNotification);
    } catch (err) {
      console.error('Create notification error:', err);
      res.status(500).json({ msg: 'Bildirim oluşturma başarısız' });
    }
  });

  router.get('/users', authMiddleware, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ msg: 'Arama terimi gerekli' });
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedQ, 'i');
      const currentUser = await User.findById(req.user.id);
      const users = await User.find({
        username: regex,
        _id: { $ne: req.user.id, $nin: currentUser.blockedUsers || [] },
      })
        .select('username email profilePicture')
        .collation({ locale: 'tr', strength: 1 })
        .lean();
      res.json(users || []);
    } catch (err) {
      console.error('Search users error:', err);
      res.status(500).json({ msg: 'Kullanıcı arama başarısız' });
    }
  });

  return router;
}
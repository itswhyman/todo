import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Todo from '../models/Todo.js';
import Message from '../models/Message.js';

const router = express.Router();

// Auth Middleware
const authMiddleware = (req, res, next) => {
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

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ username, email, password });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret');
    res.json({ token, user: { id: user._id, username, email } });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret');
    res.json({ token, user: { id: user._id, username: user.username, email } });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// Get User
router.get('/user/:id', authMiddleware, async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  res.json(user);
});

// Todos
router.get('/todos', authMiddleware, async (req, res) => {
  const todos = await Todo.find({ user: req.user.id });
  res.json(todos);
});

router.post('/todos', authMiddleware, async (req, res) => {
  const todo = new Todo({ ...req.body, user: req.user.id });
  await todo.save();
  res.json(todo);
});

router.delete('/todos/:id', authMiddleware, async (req, res) => {
  await Todo.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  res.json({ msg: 'Deleted' });
});

// Messages
router.get('/messages', authMiddleware, async (req, res) => {
  const messages = await Message.find({ $or: [{ sender: req.user.id }, { receiver: req.user.id }] }).populate('sender receiver', 'username');
  res.json(messages);
});

router.post('/messages', authMiddleware, async (req, res) => {
  const message = new Message({ ...req.body, sender: req.user.id });
  await message.save();
  res.json(message);
});

// User Search
router.get('/users', authMiddleware, async (req, res) => {
  const { q } = req.query;
  const users = await User.find({ username: new RegExp(q, 'i') }).select('username email');
  res.json(users);
});

export default router;
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: null },
  bio: { type: String, default: null },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  todos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Todo' }],
  isBanned: { type: Boolean, default: false },
  followersCount: { type: Number, default: 0 }, // Fiziksel field (virtual yerine)
  followingCount: { type: Number, default: 0 }, // Fiziksel field
});

// Virtual fields (opsiyonel, fiziksel field'lar eklendiği için kaldırılabilir)
userSchema.virtual('virtualFollowersCount').get(function () {
  try {
    return Array.isArray(this.followers) ? this.followers.length : 0;
  } catch (err) {
    console.warn('FollowersCount virtual error:', err.message);
    return 0;
  }
});

userSchema.virtual('virtualFollowingCount').get(function () {
  try {
    return Array.isArray(this.following) ? this.following.length : 0;
  } catch (err) {
    console.warn('FollowingCount virtual error:', err.message);
    return 0;
  }
});

userSchema.virtual('blockedUsersCount').get(function () {
  try {
    return Array.isArray(this.blockedUsers) ? this.blockedUsers.length : 0;
  } catch (err) {
    console.warn('BlockedUsersCount virtual error:', err.message);
    return 0;
  }
});

// Virtual'ları JSON'a dahil ET (frontend için)
userSchema.set('toJSON', {
  virtuals: true, // Virtual field'ları dahil et
  transform: (doc, ret) => {
    // Undefined alanları temizle
    if (ret.followers === undefined) ret.followers = [];
    if (ret.following === undefined) ret.following = [];
    if (ret.blockedUsers === undefined) ret.blockedUsers = [];
    // Virtual'ları fizikselmiş gibi ekle (geriye uyumluluk için)
    ret.followersCount = ret.followersCount || (Array.isArray(ret.followers) ? ret.followers.length : 0);
    ret.followingCount = ret.followingCount || (Array.isArray(ret.following) ? ret.following.length : 0);
    return ret;
  },
});

// Password hash hook
userSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    console.error('Password hash error:', err);
    next(err);
  }
});

userSchema.methods.comparePassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (err) {
    console.error('Compare password error:', err);
    throw err;
  }
};

export default mongoose.model('User', userSchema);
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

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
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
});

// Virtual fields (opsiyonel, fiziksel field'lar eklendiği için kaldırılabilir)
userSchema.virtual('virtualFollowersCount').get(function () {
  return Array.isArray(this.followers) ? this.followers.length : 0;
});

userSchema.virtual('virtualFollowingCount').get(function () {
  return Array.isArray(this.following) ? this.following.length : 0;
});

userSchema.virtual('blockedUsersCount').get(function () {
  return Array.isArray(this.blockedUsers) ? this.blockedUsers.length : 0;
});

// Virtual'ları JSON'a dahil ET
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.followers = ret.followers || [];
    ret.following = ret.following || [];
    ret.blockedUsers = ret.blockedUsers || [];
    ret.followersCount = ret.followersCount || ret.followers.length;
    ret.followingCount = ret.followingCount || ret.following.length;
    delete ret.password; // Şifreyi JSON'dan çıkar
    return ret;
  },
});

// Password hash hook
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (err) {
    throw err;
  }
};

export default mongoose.model('User', userSchema);
import mongoose from 'mongoose';
import User from './models/User.js';

async function fixNegativeCounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todoapp');
    console.log('MongoDB connected');

    // Negatif followersCount ve followingCount değerlerini sıfıra çek
    const resultFollowers = await User.updateMany(
      { followersCount: { $lt: 0 } },
      { $set: { followersCount: 0 } }
    );
    const resultFollowing = await User.updateMany(
      { followingCount: { $lt: 0 } },
      { $set: { followingCount: 0 } }
    );

    console.log(`Fixed ${resultFollowers.modifiedCount} users with negative followersCount`);
    console.log(`Fixed ${resultFollowing.modifiedCount} users with negative followingCount`);

    // Opsiyonel: Sayaçları followers ve following dizileriyle senkronize et
    const users = await User.find({});
    for (const user of users) {
      const newFollowersCount = Array.isArray(user.followers) ? user.followers.length : 0;
      const newFollowingCount = Array.isArray(user.following) ? user.following.length : 0;
      if (user.followersCount !== newFollowersCount || user.followingCount !== newFollowingCount) {
        user.followersCount = newFollowersCount;
        user.followingCount = newFollowingCount;
        await user.save();
        console.log(`Synced counts for ${user.username}: followersCount=${user.followersCount}, followingCount=${user.followingCount}`);
      }
    }

    console.log('All negative counts fixed and synced');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error fixing counts:', err);
  }
}

fixNegativeCounts();
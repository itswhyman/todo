import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 1000 },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
});

// İndeks ekleme (performans için)
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ timestamp: -1 });

// Pre-save hook (doğrulama)
messageSchema.pre('save', function(next) {
  if (this.text.trim().length === 0) {
    return next(new Error('Mesaj içeriği boş olamaz'));
  }
  if (this.isDeleted && this.isRead) {
    return next(new Error('Silinmiş mesaj okunmuş olamaz'));
  }
  next();
});

export default mongoose.model('Message', messageSchema);
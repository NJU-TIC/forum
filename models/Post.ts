import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  shares: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Post || mongoose.model('Post', PostSchema);
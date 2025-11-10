import mongoose, { Document, Model, Schema } from 'mongoose';

// Import User interface for type referencing
import { IUser } from './User';

// Define interface for Post document to ensure type safety
export interface IPost extends Document {
  content: string;
  author: mongoose.Types.ObjectId | IUser; // Can be ObjectId or populated IUser
  likes: mongoose.Types.ObjectId[];
  bookmarks: mongoose.Types.ObjectId[];
  shares: string[];
  createdAt: Date;
}

// Define the Mongoose schema for Post
const PostSchema: Schema = new Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  shares: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

// Export the Post model, ensuring it's not re-compiled if it already exists
export default (mongoose.models.Post as Model<IPost>) || mongoose.model<IPost>('Post', PostSchema);
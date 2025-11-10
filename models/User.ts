import mongoose, { Document, Model, Schema } from 'mongoose';

// Define interface for User document to ensure type safety
export interface IUser extends Document {
  email: string;
  password?: string; // Password can be optional for some operations (e.g., fetching user data without password)
  isAdmin: boolean;
  createdAt: Date;
}

// Define the Mongoose schema for User
const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Export the User model, ensuring it's not re-compiled if it already exists
export default (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
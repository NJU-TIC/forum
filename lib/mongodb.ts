import mongoose from 'mongoose';

// MongoDB connection URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI!;

// Ensure MONGODB_URI is defined
if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in your environment variables');
}

// Global cache for MongoDB connection to prevent multiple connections
declare global {
  var mongoose: any;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Establishes a connection to MongoDB using cached connection pattern
 * @returns {Promise<typeof mongoose>} Mongoose connection instance
 */
async function dbConnect() {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Create new connection promise if not exists
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable mongoose buffering
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  // Wait for connection to establish
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
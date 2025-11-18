import { MongoClient, Db, ObjectId, Collection, Document } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}

interface MongoCache {
  client: MongoClient | null;
  db: Db | null;
}

declare global {
  var mongodb: MongoCache | undefined;
}

const cached = global.mongodb || { client: null, db: null };

if (!global.mongodb) {
  global.mongodb = cached;
}

export async function connectToMongoDB(): Promise<{
  client: MongoClient;
  db: Db;
}> {
  if (cached.client && cached.db) {
    return { client: cached.client, db: cached.db };
  }

  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  const db = client.db();

  cached.client = client;
  cached.db = db;

  return { client, db };
}

// Helper functions for working with collections
export async function getCollection<S extends Document>(
  name: string,
): Promise<Collection<S>> {
  const { db } = await connectToMongoDB();
  return db.collection<S>(name);
}

// Type-safe collection access
export const collections = {
  users: () => getCollection("users"),
  posts: () => getCollection("posts"),
};

import { getCollection } from "../mongodb";
import { validateUser, validateUserSafe } from "../validation/user";
import {
  validatePost,
  validatePostSafe,
  validateQueriedPostSafe,
} from "../validation/post";
import bcrypt from "bcrypt";
import { ObjectId, UpdateFilter } from "mongodb";
import { QUser, User } from "@/schema/user";
import { Post, QPost } from "@/schema/post";

// User operations
export async function createUser(userData: unknown) {
  const validatedUser = validateUser(userData);

  const usersCollection = await getCollection<QUser>("users");
  const result = await usersCollection.insertOne(validatedUser as QUser);

  return {
    ...validatedUser,
    _id: result.insertedId.toString(),
  };
}

export async function findUserById(id: string) {
  const usersCollection = await getCollection("users");
  const user = await usersCollection.findOne({ _id: new ObjectId(id) });

  if (!user) return null;

  const validatedUser = validateUserSafe(user);
  if (!validatedUser) return null;

  return {
    ...validatedUser,
    _id: user._id.toString(),
  };
}

export async function findUserByName(name: string) {
  const usersCollection = await getCollection("users");
  const user = await usersCollection.findOne({ name });

  if (!user) return null;

  const validatedUser = validateUserSafe(user);
  if (!validatedUser) return null;

  return {
    ...validatedUser,
    _id: user._id.toString(),
  };
}

export async function findAllUsers() {
  const usersCollection = await getCollection("users");
  const users = await usersCollection.find({}).toArray();

  return users
    .map((user) => {
      const validatedUser = validateUserSafe(user);
      if (!validatedUser) return null;

      return {
        ...validatedUser,
        _id: user._id.toString(),
      };
    })
    .filter((user) => user !== null);
}

export async function updateUserById(id: string, updates: unknown) {
  const usersCollection = await getCollection("users");

  // Validate updates
  const validatedUpdates = validateUserSafe(updates);
  if (!validatedUpdates) {
    throw new Error("Invalid user data for update");
  }

  // Add updatedAt timestamp
  const updatesWithTimestamp = {
    ...validatedUpdates,
    updatedAt: new Date(),
  };

  const result = await usersCollection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updatesWithTimestamp },
    { returnDocument: "after" },
  );

  if (!result) return null;

  const validatedUser = validateUserSafe(result);
  if (!validatedUser) return null;

  return {
    ...validatedUser,
    _id: result._id.toString(),
  };
}

export async function deleteUserById(id: string): Promise<boolean> {
  const usersCollection = await getCollection("users");
  const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

export async function verifyUserPassword(
  userId: string,
  password: string,
): Promise<boolean> {
  const user = await findUserById(userId);
  if (!user || !user.credentials) return false;

  return bcrypt.compare(password, user.credentials.hash);
}

export async function generateCredentials(password: string) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return { salt, hash };
}

// Post operations
export async function createPost(postData: unknown) {
  const validatedPost: Post = validatePost(postData);
  const postsCollection = await getCollection("posts");
  const result = await postsCollection.insertOne(validatedPost);

  return {
    ...validatedPost,
    _id: result.insertedId.toString(),
  };
}

export async function findPostById(id: string): Promise<QPost | null> {
  const postsCollection = await getCollection("posts");
  const post = await postsCollection.findOne({ _id: new ObjectId(id) });

  if (!post) return null;

  const validatedPost = validateQueriedPostSafe(post);
  if (!validatedPost) return null;

  return {
    ...validatedPost,
    _id: post._id.toString(),
  };
}

export async function findAllPosts(): Promise<QPost[]> {
  const postsCollection = await getCollection("posts");
  const posts = await postsCollection.find({}).toArray();

  return posts
    .map((post) => {
      const validatedPost = validateQueriedPostSafe(post);
      if (!validatedPost) return null;

      return {
        ...validatedPost,
        _id: post._id.toString(),
      };
    })
    .filter((post) => post !== null);
}

export async function findAllPostsWithAuthors(): Promise<QPost[]> {
  const postsCollection = await getCollection("posts");
  const usersCollection = await getCollection("users");

  const posts = await postsCollection.find({}).toArray();

  // Get all unique author IDs
  const authorIds = [...new Set(posts.map((post) => post.author))];

  // Fetch all authors in one query
  const authors = await usersCollection
    .find({ _id: { $in: authorIds.map((id) => new ObjectId(id)) } })
    .toArray();

  // Create author lookup map
  const authorMap = new Map();
  authors.forEach((author) => {
    const validatedUser = validateUserSafe(author);
    if (validatedUser) {
      authorMap.set(author._id.toString(), {
        ...validatedUser,
        _id: author._id.toString(),
      });
    }
  });

  // Combine posts with author data
  return posts
    .map((qpost) => {
      const post = {
        ...qpost,
        _id: qpost._id.toString(),
      };
      const validatedPost = validateQueriedPostSafe(post);
      if (!validatedPost) return null;

      const author = authorMap.get(validatedPost.author);
      if (!author) return null;

      return {
        ...validatedPost,
        _id: post._id.toString(),
        author,
      };
    })
    .filter((post) => post !== null);
}

export async function findPostsByAuthor(authorId: string): Promise<QPost[]> {
  const postsCollection = await getCollection("posts");
  const posts = await postsCollection.find({ author: authorId }).toArray();

  return posts
    .map((post) => {
      const validatedPost = validateQueriedPostSafe(post);
      if (!validatedPost) return null;

      return {
        ...validatedPost,
        _id: post._id.toString(),
      };
    })
    .filter((post) => post !== null);
}

export async function updatePostById(
  id: string,
  updates: unknown,
): Promise<QPost | null> {
  const postsCollection = await getCollection("posts");

  // Validate updates
  const validatedUpdates = validatePostSafe(updates);
  if (!validatedUpdates) {
    throw new Error("Invalid post data for update");
  }

  // Add updatedAt timestamp
  const updatesWithTimestamp = {
    ...validatedUpdates,
    updatedAt: new Date(),
  };

  const result = await postsCollection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updatesWithTimestamp },
    { returnDocument: "after" },
  );

  if (!result) return null;

  const validatedPost = validateQueriedPostSafe(result);
  if (!validatedPost) return null;

  return {
    ...validatedPost,
    _id: result._id.toString(),
  };
}

export async function deletePostById(id: string): Promise<boolean> {
  const postsCollection = await getCollection("posts");
  const result = await postsCollection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

export async function incrementPostLikes(id: string): Promise<QPost | null> {
  const postsCollection = await getCollection("posts");

  const result = await postsCollection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $inc: { "interactions.likes": 1 },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" },
  );

  if (!result) return null;

  const validatedPost = validateQueriedPostSafe(result);
  if (!validatedPost) return null;

  return {
    ...validatedPost,
    _id: result._id.toString(),
  };
}

export async function incrementPostForwards(id: string): Promise<QPost | null> {
  const postsCollection = await getCollection("posts");

  const result = await postsCollection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $inc: { "interactions.forwards": 1 },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" },
  );

  if (!result) return null;

  const validatedPost = validateQueriedPostSafe(result);
  if (!validatedPost) return null;

  return {
    ...validatedPost,
    _id: result._id.toString(),
  };
}

export async function addCommentToPost(
  postId: string,
  authorId: string,
  content: string,
): Promise<QPost | null> {
  const postsCollection = await getCollection("posts");

  const comment = {
    author: authorId,
    body: { content: content },
  };

  const result = await postsCollection.findOneAndUpdate(
    { _id: new ObjectId(postId) },
    {
      $push: {
        "interactions.comments": comment,
      } as unknown as UpdateFilter<Document>,
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" },
  );

  if (!result) return null;

  const validatedPost = validateQueriedPostSafe(result);
  if (!validatedPost) return null;

  return {
    ...validatedPost,
    _id: result._id.toString(),
  };
}

// Utility functions
export async function clearDatabase() {
  const usersCollection = await getCollection("users");
  const postsCollection = await getCollection("posts");

  await usersCollection.deleteMany({});
  await postsCollection.deleteMany({});
}

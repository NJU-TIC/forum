import { getCollection } from "../mongodb";
import { validateUser, validateUserSafe } from "../validation/user";
import { validatePostSafe, validateQueriedPostSafe } from "../validation/post";
import bcrypt from "bcrypt";
import { Document, ObjectId, UpdateFilter, MongoServerError } from "mongodb";
import { QUser, SUser } from "@/schema/user";
import { Post, PostComment, QPost, SPost } from "@/schema/post";
import { Result } from "@/types/common/result";
import { json } from "node:stream/consumers";

type AuthorMap = Map<string, SUser>;
type InteractionPath = "interactions.likes" | "interactions.forwards";

export async function fetchAuthorsByIds(
  authorIds: string[],
): Promise<AuthorMap> {
  if (authorIds.length === 0) {
    return new Map();
  }

  const usersCollection = await getCollection<QUser>("users");
  const objectIds = authorIds.map((id) => new ObjectId(id));
  const authors = await usersCollection
    .find({ _id: { $in: objectIds } })
    .toArray();

  return authors.reduce<AuthorMap>((map, author) => {
    const validatedUser = validateUserSafe(author);
    if (validatedUser) {
      map.set(author._id.toString(), {
        ...validatedUser,
        _id: author._id.toString(),
      });
    }
    return map;
  }, new Map());
}

export async function fetchAuthorById(authorId: string): Promise<SUser | null> {
  const usersCollection = await getCollection<QUser>("users");
  const author = await usersCollection.findOne({
    _id: new ObjectId(authorId),
  });

  if (!author) return null;

  const validatedUser = validateUserSafe(author);
  if (!validatedUser) return null;

  return {
    ...validatedUser,
    _id: author._id.toString(),
  };
}

async function attachAuthorsToPosts(
  posts: SPost[],
): Promise<(SPost & { author: SUser })[]> {
  if (!posts || posts.length === 0) {
    return [];
  }

  const authorIds = [
    ...new Set(posts.map((post) => post.author).filter(Boolean)),
  ];
  const authorMap = await fetchAuthorsByIds(authorIds);

  const populated = await Promise.all(
    posts.map(async (post) => {
      if (!post.author) {
        console.warn(`Post ${post._id} has no author field`);
        return null;
      }

      const author: SUser | undefined = authorMap.get(post.author);
      if (!author) {
        console.warn(
          `Author not found for post ${post._id}, author ID: ${post.author}`,
        );
        return null;
      }

      return {
        ...post,
        author,
      };
    }),
  );

  const validPosts = populated.filter(
    (post): post is SPost & { author: SUser } => post !== null,
  );

  return validPosts;
}

async function addUserToInteraction(
  postId: string,
  userId: string,
  interactionPath: InteractionPath,
): Promise<SPost | null> {
  const postsCollection = await getCollection("posts");

  const update: UpdateFilter<Document> = {
    $addToSet: {
      [interactionPath]: userId,
    },
    $set: { updatedAt: new Date() },
  };

  const result = await postsCollection.findOneAndUpdate(
    { _id: new ObjectId(postId) },
    update,
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

async function toggleUserInteraction(
  postId: string,
  userId: string,
  interactionPath: InteractionPath,
): Promise<{ post: SPost; added: boolean } | null> {
  const postsCollection = await getCollection("posts");
  const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

  if (!post) return null;

  const currentList = (interactionPath === "interactions.likes"
    ? post.interactions?.likes
    : post.interactions?.forwards) || [];

  const alreadyExists = currentList.includes(userId);

  let result;
  if (alreadyExists) {
    result = await postsCollection.findOneAndUpdate(
      { _id: new ObjectId(postId) },
      { $pull: { [interactionPath]: userId }, $set: { updatedAt: new Date() } } as unknown as UpdateFilter<Document>,
      { returnDocument: "after" },
    );
  } else {
    result = await postsCollection.findOneAndUpdate(
      { _id: new ObjectId(postId) },
      { $addToSet: { [interactionPath]: userId }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" },
    );
  }

  if (!result) return null;

  const validatedPost = validateQueriedPostSafe(result);
  if (!validatedPost) return null;

  return {
    post: { ...validatedPost, _id: result._id.toString() },
    added: !alreadyExists,
  };
}

// User operations
export async function createUser(userData: unknown): Promise<SUser> {
  const validatedUser = validateUser(userData);

  const usersCollection = await getCollection<QUser>("users");
  const result = await usersCollection.insertOne(validatedUser as QUser);

  return {
    ...validatedUser,
    _id: result.insertedId.toString(),
  };
}

export async function findUserById(id: string): Promise<SUser | null> {
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

export async function findUserByName(name: string): Promise<SUser | null> {
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

export async function findAllUsers(): Promise<SUser[]> {
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

export async function updateUserById(
  id: string,
  updates: unknown,
): Promise<SUser | null> {
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

export async function updateUserNameById(
  id: string,
  newName: string,
): Promise<SUser | null> {
  const usersCollection = await getCollection<QUser>("users");

  // Ensure unique index on username; repeated calls are idempotent.
  await usersCollection.createIndex({ name: 1 }, { unique: true });

  try {
    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { name: newName, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!result) return null;

    const validatedUser = validateUserSafe(result);
    if (!validatedUser) return null;

    return {
      ...validatedUser,
      _id: result._id.toString(),
    };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new Error("Username already taken");
    }
    throw error;
  }
}

export async function deleteUserById(id: string): Promise<boolean> {
  const usersCollection = await getCollection("users");
  const result = await usersCollection.deleteOne({
    _id: new ObjectId(id),
  });
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
export async function createPost(postData: unknown): Promise<SPost> {
  const validatedPost = validatePostSafe(postData);
  if (!validatedPost) {
    throw new Error("Invalid post data");
  }
  const postsCollection = await getCollection("posts");
  const result = await postsCollection.insertOne(validatedPost);

  return {
    ...validatedPost,
    _id: result.insertedId.toString(),
  };
}

export async function findPostById(id: string): Promise<SPost | null> {
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

export async function findAllPosts(): Promise<SPost[]> {
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

export async function findAllPostsWithAuthors(): Promise<
  (SPost & { author: SUser })[]
> {
  const postsCollection = await getCollection<QPost>("posts");
  const posts = await postsCollection.find({}).toArray();

  const sanitizedPosts = posts
    .map((rawPost) => {
      const validatedPost = validateQueriedPostSafe(rawPost);
      if (!validatedPost) {
        return null;
      }
      const serializablePost = {
        ...validatedPost,
        _id: validatedPost._id.toString(),
      };
      return serializablePost;
    })
    .filter((post): post is SPost => post !== null);

  const result = await attachAuthorsToPosts(sanitizedPosts);
  return result;
}

export async function findPostsByAuthor(authorId: string): Promise<SPost[]> {
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
): Promise<SPost | null> {
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
  const result = await postsCollection.deleteOne({
    _id: new ObjectId(id),
  });
  return result.deletedCount > 0;
}

export async function incrementPostLikes(
  id: string,
  userId: string,
): Promise<SPost | null> {
  return addUserToInteraction(id, userId, "interactions.likes");
}

export async function togglePostLike(
  id: string,
  userId: string,
): Promise<{ post: SPost; added: boolean } | null> {
  return toggleUserInteraction(id, userId, "interactions.likes");
}

export async function incrementPostForwards(
  id: string,
  userId: string,
): Promise<SPost | null> {
  return addUserToInteraction(id, userId, "interactions.forwards");
}

export async function togglePostForward(
  id: string,
  userId: string,
): Promise<{ post: SPost; added: boolean } | null> {
  return toggleUserInteraction(id, userId, "interactions.forwards");
}

export async function addCommentToPost(
  postId: string,
  authorId: string,
  content: string,
): Promise<QPost | null> {
  const postsCollection = await getCollection<Post>("posts");

  // Added: load author for embedding display-friendly data into comments; require a found author.
  const author = await fetchAuthorById(authorId);
  if (!author) {
    return null;
  }

  const newCommentData = {
    author: authorId,
    body: { content: content, images: [] },
    createdAt: new Date(),
  } as PostComment;

  const update: UpdateFilter<Post> = {
    $push: {
      "interactions.comments": newCommentData,
    },
    $set: { updatedAt: new Date() },
  };

  const result = await postsCollection.findOneAndUpdate(
    { _id: new ObjectId(postId) },
    update,
    { returnDocument: "after" },
  );
  if (!result) return null;

  const validatedPost = validateQueriedPostSafe(result);
  if (!validatedPost) return null;

  return validatedPost;
}

// Update post title/body/images while preserving other fields.
export async function updatePostContent(
  postId: string,
  updates: {
    title?: string;
    content?: string;
    images?: string[];
  },
): Promise<Result<SPost>> {
  const postsCollection = await getCollection<Post>("posts");
  const set: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (typeof updates.title === "string") {
    set.title = updates.title;
  }
  if (typeof updates.content === "string") {
    set["body.content"] = updates.content;
  }
  if (updates.images) {
    set["body.images"] = updates.images;
  }

  const result = await postsCollection.findOneAndUpdate(
    { _id: new ObjectId(postId) },
    { $set: set } as UpdateFilter<Post>,
    { returnDocument: "after" },
  );

  if (!result) return { success: false, error: "Post not found" };

  const validatedPost = validateQueriedPostSafe(result);
  if (!validatedPost) return { success: false, error: "Invalid post data" };

  return {
    success: true,
    data: {
      ...validatedPost,
      _id: result._id.toString(),
    },
  };
}

// Utility functions
export async function clearDatabase() {
  const usersCollection = await getCollection("users");
  const postsCollection = await getCollection("posts");

  await usersCollection.deleteMany({});
  await postsCollection.deleteMany({});
}

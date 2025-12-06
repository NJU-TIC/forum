import { getCollection } from "../mongodb";
import { validateUser, validateUserSafe } from "../validation/user";
import { validatePostSafe, validateQueriedPostSafe } from "../validation/post";
import bcrypt from "bcrypt";
import { Document, ObjectId, UpdateFilter } from "mongodb";
import { QUser } from "@/schema/user";
import { QPost } from "@/schema/post";

type AuthorMap = Map<string, QUser>;
type InteractionPath = "interactions.likes" | "interactions.forwards";

async function fetchAuthorsByIds(authorIds: string[]): Promise<AuthorMap> {
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
      } as QUser);
    }
    return map;
  }, new Map());
}

export async function fetchAuthorById(authorId: string): Promise<QUser | null> {
  const usersCollection = await getCollection<QUser>("users");
  const author = await usersCollection.findOne({ _id: new ObjectId(authorId) });

  if (!author) return null;

  const validatedUser = validateUserSafe(author);
  if (!validatedUser) return null;

  return {
    ...validatedUser,
    _id: author._id.toString(),
  } as QUser;
}

async function attachAuthorsToPosts(
  posts: QPost[],
): Promise<(QPost & { author: QUser })[]> {
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

      let author = authorMap.get(post.author);

      if (!author) {
        author = await fetchAuthorById(post.author);
        if (author) {
          authorMap.set(post.author, author);
        }
      }

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
    (post): post is QPost & { author: QUser } => post !== null,
  );

  console.log(
    `Successfully attached authors to ${validPosts.length} out of ${posts.length} posts`,
  );
  return validPosts;
}

async function loadInteractionUser(userId: string): Promise<QUser | null> {
  const usersCollection = await getCollection("users");
  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

  if (!user) return null;

  const validatedUser = validateUserSafe(user);
  if (!validatedUser) return null;

  return {
    ...validatedUser,
    _id: user._id.toString(),
  } as QUser;
}

async function addUserToInteraction(
  postId: string,
  userId: string,
  interactionPath: InteractionPath,
): Promise<QPost | null> {
  const postsCollection = await getCollection("posts");
  const interactionUser = await loadInteractionUser(userId);

  if (!interactionUser) {
    return null;
  }

  const update: UpdateFilter<Document> = {
    $addToSet: {
      [interactionPath]: interactionUser,
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

export async function updateUserNameById(
  id: string,
  newName: string,
): Promise<QUser | null> {
  const usersCollection = await getCollection<QUser>("users");

  // Added: prevent duplicate usernames.
  const existing = await usersCollection.findOne({
    name: newName,
    _id: { $ne: new ObjectId(id) },
  });

  if (existing) {
    throw new Error("Username already taken");
  }

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

export async function findAllPostsWithAuthors(): Promise<
  (QPost & { author: QUser })[]
> {
  console.log("=== Starting findAllPostsWithAuthors ===");
  const postsCollection = await getCollection("posts");
  const posts = await postsCollection.find({}).toArray();
  console.log(`Found ${posts.length} raw posts from database`);

  const sanitizedPosts = posts
    .map((rawPost) => {
      console.log("Processing raw post:", {
        _id: rawPost._id.toString(),
        author: rawPost.author,
        hasTitle: !!rawPost.title,
        hasBody: !!rawPost.body,
      });

      const normalizedPost = {
        ...rawPost,
        _id: rawPost._id.toString(),
        author: rawPost.author.toString(),
      };
      const validatedPost = validateQueriedPostSafe(normalizedPost);
      if (!validatedPost) {
        console.log("Validation failed for post:", rawPost._id.toString());
        return null;
      }
      return validatedPost;
    })
    .filter((post): post is QPost => post !== null);

  console.log(`Validated ${sanitizedPosts.length} posts, attaching authors...`);
  const result = await attachAuthorsToPosts(sanitizedPosts);
  console.log(`Final result: ${result.length} posts with authors`);
  return result;
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

export async function incrementPostLikes(
  id: string,
  userId: string,
): Promise<QPost | null> {
  return addUserToInteraction(id, userId, "interactions.likes");
}

export async function incrementPostForwards(
  id: string,
  userId: string,
): Promise<QPost | null> {
  return addUserToInteraction(id, userId, "interactions.forwards");
}

export async function addCommentToPost(
  postId: string,
  authorId: string,
  content: string,
): Promise<QPost | null> {
  const postsCollection = await getCollection("posts");

  // Added: load author for embedding display-friendly data into comments; require a found author.
  const author = await fetchAuthorById(authorId);
  if (!author) {
    return null;
  }
  const commentAuthor = {
    _id: author._id?.toString() ?? authorId,
    name: author.name,
    isAdmin: author.isAdmin,
  };

  // Added: store createdAt for each comment.
  const comment = {
    author: commentAuthor,
    body: { content: content },
    createdAt: new Date(),
  };

  const update: UpdateFilter<Document> = {
    $push: {
      "interactions.comments": comment,
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

// Update post title/body/images while preserving other fields.
// Update post core fields (title/content/images) without affecting interactions.
export async function updatePostContent(
  postId: string,
  updates: {
    title?: string;
    content?: string;
    images?: string[];
  },
): Promise<QPost | null> {
  const postsCollection = await getCollection("posts");
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
    { $set: set },
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

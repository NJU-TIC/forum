import * as v from "valibot";
import { PostSchema, QueriedPostSchema } from "../../schema/post";

/**
 * Validate post data using Valibot schema
 */
export function validatePost(data: unknown) {
  return v.parse(PostSchema, data);
}

/**
 * Validate post data safely (returns null if invalid)
 */
export function validatePostSafe(data: unknown) {
  const result = v.safeParse(PostSchema, data);
  return result.success ? result.output : null;
}

/**
 * Validate queried post data safely (returns null if invalid)
 * Validates against QueriedPostSchema which includes _id, createdAt, updatedAt
 */
export function validateQueriedPostSafe(data: unknown) {
  const result = v.safeParse(QueriedPostSchema, data);
  return result.success ? result.output : null;
}

/**
 * Check if data matches post schema
 */
export function isValidPost(
  data: unknown,
): data is v.InferOutput<typeof PostSchema> {
  return v.safeParse(PostSchema, data).success;
}

/**
 * Create a post with validation
 * Takes raw post data, validates it, and returns a post ready for database storage
 */
export function createValidatedPost(data: {
  author: string;
  title: string;
  content: string;
  likes?: number;
  forwards?: number;
  comments?: Array<{ author: string; content: string }>;
}) {
  const postData = {
    _id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    author: data.author,
    title: data.title,
    body: {
      content: data.content,
    },
    interactions: {
      likes: data.likes || 0,
      forwards: data.forwards || 0,
      comments: (data.comments || []).map((comment) => ({
        author: comment.author,
        body: {
          content: comment.content,
        },
      })),
    },
  };

  return validatePost(postData);
}

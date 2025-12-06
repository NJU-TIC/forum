import * as v from "valibot";
import { UserSchema } from "./user";

export const ObjectID = v.string();

/**
 * Post body or comment body
 * Added optional images array to support post image attachments.
 */
export const PostBodySchema = v.object({
  content: v.string(),
  images: v.optional(v.array(v.string())),
});

// Added: allow comment author to be stored as either an ID or a lean user object for display.
const CommentAuthorSchema = v.union([
  ObjectID,
  v.object({
    _id: ObjectID,
    name: v.string(),
    isAdmin: v.optional(v.boolean()),
  }),
]);

export const PostCommentSchema = v.object({
  author: CommentAuthorSchema,
  body: PostBodySchema,
  // Added: keep comment timestamp for UI display.
  createdAt: v.optional(v.date()),
});

export const PostInteractionSchema = v.object({
  likes: v.array(UserSchema),
  forwards: v.array(UserSchema),
  comments: v.array(PostCommentSchema),
});

export const PostSchema = v.object({
  author: ObjectID,
  title: v.string(),
  body: PostBodySchema,
  interactions: PostInteractionSchema,
  createdAt: v.date(),
  updatedAt: v.date(),
});

export const QueriedPostSchema = v.intersect([
  PostSchema,
  v.object({
    _id: v.looseObject({}),
  }),
]);

export type Post = v.InferOutput<typeof PostSchema>;
export type QPost = v.InferOutput<typeof QueriedPostSchema>;
export type PostBody = v.InferOutput<typeof PostBodySchema>;
export type PostComment = v.InferOutput<typeof PostCommentSchema>;
export type PostInteraction = v.InferOutput<typeof PostInteractionSchema>;

import * as v from "valibot";

export const ObjectID = v.string();

/**
 * Post body or comment body
 */
export const PostBodySchema = v.object({
  content: v.string(),
});

export const PostCommentSchema = v.object({
  author: ObjectID,
  body: PostBodySchema,
});

export const PostInteractionSchema = v.object({
  likes: v.number(),
  forwards: v.number(),
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
    _id: v.string(),
  }),
]);

export type Post = v.InferOutput<typeof PostSchema>;
export type QPost = v.InferOutput<typeof QueriedPostSchema>;
export type PostBody = v.InferOutput<typeof PostBodySchema>;
export type PostComment = v.InferOutput<typeof PostCommentSchema>;
export type PostInteraction = v.InferOutput<typeof PostInteractionSchema>;

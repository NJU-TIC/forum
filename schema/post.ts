import * as v from "valibot";
import { UserSchema } from "./user";
import { ObjectId as MongoObjectId } from "mongodb";

export const ObjectID = v.string();

/**
 * Post body or comment body
 * Added optional images array to support post image attachments.
 */
export const PostBodySchema = v.object({
  content: v.string(),
  images: v.array(v.string()),
});

export const PostCommentSchema = v.object({
  author: ObjectID,
  body: PostBodySchema,
  createdAt: v.date(),
});

export const PostInteractionSchema = v.object({
  likes: v.array(ObjectID), // array of User
  forwards: v.array(ObjectID), // array of User
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
    _id: v.instance(MongoObjectId),
  }),
]);

export const SerializablePostSchema = v.intersect([
  PostSchema,
  v.object({
    _id: v.string(),
  }),
]);

export type Post = v.InferOutput<typeof PostSchema>;
export type QPost = v.InferOutput<typeof QueriedPostSchema>;
export type SPost = v.InferOutput<typeof SerializablePostSchema>;
export type PostBody = v.InferOutput<typeof PostBodySchema>;
export type PostComment = v.InferOutput<typeof PostCommentSchema>;
export type PostInteraction = v.InferOutput<typeof PostInteractionSchema>;

import * as v from "valibot";
import { ObjectId as MongoObjectId } from "mongodb";

export const ObjectID = v.string();

export const GameSchema = v.object({
  author: ObjectID,
  title: v.string(),
  description: v.string(),
  scoreMultiplier: v.optional(v.number(), 1),
  createdAt: v.date(),
  updatedAt: v.date(),
});

export const QueriedGameSchema = v.intersect([
  GameSchema,
  v.object({
    _id: v.instance(MongoObjectId),
  }),
]);

export const SerializableGameSchema = v.intersect([
  GameSchema,
  v.object({
    _id: v.string(),
  }),
]);

export type Game = v.InferOutput<typeof GameSchema>;
export type QGame = v.InferOutput<typeof QueriedGameSchema>;
export type SGame = v.InferOutput<typeof SerializableGameSchema>;

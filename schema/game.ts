import * as v from "valibot";
import { ObjectId as MongoObjectId } from "mongodb";

export const ObjectID = v.string();

export const GameSchema = v.object({
  author: ObjectID,
  title: v.string(),
  description: v.string(),
  createdAt: v.date(),
  updatedAt: v.date(),
});

export const GameFileSchema = v.object({
  gameId: ObjectID,
  path: v.string(),
  contentType: v.string(),
  createdAt: v.date(),
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
export type GameFile = v.InferOutput<typeof GameFileSchema>;
export type QGame = v.InferOutput<typeof QueriedGameSchema>;
export type SGame = v.InferOutput<typeof SerializableGameSchema>;

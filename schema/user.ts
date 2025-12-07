import { Document } from "mongodb";
import * as v from "valibot";
import { ObjectId as MongoObjectId } from "mongodb";

export const CredentialsSchema = v.object({
  salt: v.string(),
  hash: v.string(),
});

export const UserSchema = v.object({
  name: v.string(),
  email: v.string(),
  credentials: CredentialsSchema,
  isAdmin: v.boolean(),
  createdAt: v.date(),
  updatedAt: v.date(),
});

export const QueriedUserSchema = v.intersect([
  UserSchema,
  v.object({
    _id: v.instance(MongoObjectId),
  }),
]);

export const SerializableUserSchema = v.intersect([
  UserSchema,
  v.object({
    _id: v.string(),
  }),
]);

export type User = v.InferOutput<typeof UserSchema>;
export type QUser = v.InferOutput<typeof QueriedUserSchema>;
export type SUser = v.InferOutput<typeof SerializableUserSchema>;
export type Credentials = v.InferOutput<typeof CredentialsSchema>;

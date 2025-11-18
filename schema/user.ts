import { Document } from "mongodb";
import * as v from "valibot";

export const CredentialsSchema = v.object({
  salt: v.string(),
  hash: v.string(),
});

export const UserSchema = v.object({
  name: v.string(),
  id: v.string(),
  credentials: CredentialsSchema,
  isAdmin: v.boolean(),
  createdAt: v.string(), // ISO string
  updatedAt: v.string(), // ISO string
});

export const QueriedUserSchema = v.intersect([
  UserSchema,
  v.object({
    _id: v.string(),
  }),
]);

export type User = v.InferOutput<typeof UserSchema>;
export type QUser = v.InferOutput<typeof QueriedUserSchema> & Document;
export type Credentials = v.InferOutput<typeof CredentialsSchema>;

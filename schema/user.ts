import { Document } from "mongodb";
import * as v from "valibot";

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
    _id: v.looseObject({}),
  }),
]);

export type User = v.InferOutput<typeof UserSchema>;
export type QUser = v.InferOutput<typeof QueriedUserSchema>;
export type Credentials = v.InferOutput<typeof CredentialsSchema>;

import * as v from "valibot";
import { User, UserSchema } from "../../schema/user";

/**
 * Validate user data using Valibot schema
 */
export function validateUser(data: unknown): User {
  return v.parse(UserSchema, data);
}

/**
 * Validate user data safely (returns null if invalid)
 */
export function validateUserSafe(data: unknown) {
  const result = v.safeParse(UserSchema, data);
  return result.success ? result.output : null;
}

/**
 * Check if data matches user schema
 */
export function isValidUser(
  data: unknown,
): data is v.InferOutput<typeof UserSchema> {
  return v.safeParse(UserSchema, data).success;
}

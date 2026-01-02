"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import {
  createUser,
  findUserByName,
  findUserById,
  findAllUsers,
  generateCredentials,
} from "@/lib/db";
import { config } from "@/lib/config";
import { sendVerificationEmail } from "@/lib/email";
import { Result } from "@/types/common/result";
import { createRegistrationToken } from "@/lib/token";

import { verifyRegistrationToken } from "@/lib/token";

// Use database functions instead of in-memory storage

export async function verifyUserAction(token: string): Promise<Result<null>> {
  // Verify token
  const payload = await verifyRegistrationToken(token);

  if (!payload) {
    return { success: false, error: "Invalid or expired verification link." };
  }

  // Check if user already exists
  const existingUser = await findUserByName(payload.name);
  if (existingUser) {
    return { success: false, error: "User already exists." };
  }

  // Create user from token payload
  await createUser({
    name: payload.name,
    email: payload.email,
    credentials: payload.credentials,
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { success: true, data: null };
}

export async function signupAction(
  formData: FormData,
): Promise<Result<{ shouldSignIn: boolean; message: string }>> {
  const name = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { success: false, error: "Username, email, and password are required" };
  }

  // Validate email suffix
  const hasAllowedSuffix = config.allowedEmailSuffixes.some((suffix) =>
    email.endsWith(suffix),
  );
  if (!hasAllowedSuffix) {
    return {
      success: false,
      error: `Email must end with one of: ${config.allowedEmailSuffixes.join(", ")}`,
    };
  }

  const existingUser = await findUserByName(name);
  if (existingUser) {
    return { success: false, error: "User already exists" };
  }

  const credentials = await generateCredentials(password);

  // Generate stateless token
  const token = await createRegistrationToken({
    name,
    email,
    credentials,
  });

  // Send verification email
  const emailResult = await sendVerificationEmail(email, token);
  if (!emailResult.success) {
    console.error("Failed to send verification email:", emailResult.error);
    return {
      success: false,
      error: "Failed to send verification email. Please try again later.",
    };
  }

  return {
    success: true,
    data: {
      // No user returned yet as they are not active
      shouldSignIn: false,
      message: "Account created! Please check your email to verify your account.",
    },
  };
}

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  // Return credentials for client-side sign-in
  return {
    success: true,
    credentials: {
      username: username.trim(),
      password,
    },
  };
}

export async function logoutAction() {
  // Return success - client will handle signOut
  return { success: true, shouldSignOut: true };
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  if (!userId) {
    return null;
  }

  const user = await findUserById(userId);

  if (!user) {
    return null;
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

// Helper function for testing/debugging
export async function getUsers() {
  const allUsers = await findAllUsers();
  return allUsers.map((user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  }));
}

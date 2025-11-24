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

// Use database functions instead of in-memory storage

export async function signupAction(formData: FormData) {
  const name = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Username, email, and password are required" };
  }

  const existingUser = await findUserByName(name);
  if (existingUser) {
    return { error: "User already exists" };
  }

  const credentials = await generateCredentials(password);

  const userData = {
    name,
    email,
    credentials,
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const newUser = await createUser(userData);

  // After successful user creation, return success
  // The client will handle the sign-in

  return {
    success: true,
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt,
    },
    // Signal that the user should be signed in on the client
    shouldSignIn: true,
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

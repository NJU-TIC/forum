"use server";

import { signIn, signOut } from "@/auth";
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
  try {
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

    await signIn("credentials", {
      username: name,
      password,
      redirect: false,
    });

    return {
      success: true,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
    };
  } catch (error) {
    console.error("Signup error:", error);
    return { error: "Failed to create account. Please try again." };
  }
}

export async function loginAction(formData: FormData) {
  try {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!username || !password) {
      return { error: "Username and password are required" };
    }

    await signIn("credentials", {
      username: username.trim(),
      password,
      redirect: false,
    });

    const user = await findUserByName(username.trim());
    if (!user) {
      return { error: "Unable to load user profile after sign-in" };
    }

    return {
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "Failed to sign in. Please try again." };
  }
}

export async function logoutAction() {
  try {
    await signOut({ redirect: false });
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { error: "Failed to log out" };
  }
}

export async function getCurrentUser() {
  try {
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
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
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

"use server";

import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import {
  createUser,
  findUserByName,
  findUserById,
  findAllUsers,
} from "@/lib/db";

// Use database functions instead of in-memory storage

export async function signupAction(formData: FormData) {
  try {
    const name = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Basic validation
    if (!name || !email || !password) {
      return { error: "Username, email, and password are required" };
    }
    const idFromEmail = email.split("@")[0]; // Use part before @ as user ID

    // Check if user already exists
    const existingUser = await findUserByName(idFromEmail);
    if (existingUser) {
      // NOTE: The id generation isn't perfect
      return { error: "User already exists" };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new user in database
    const userData = {
      name,
      email,
      credentials: { salt, hash: passwordHash },
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newUser = await createUser(userData);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(
      "session",
      JSON.stringify({ userId: newUser._id, email: newUser.id }),
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      },
    );

    return {
      success: true,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.id,
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

    // Basic validation
    if (!username || !password) {
      return { error: "Username and password are required" };
    }

    // Find user by username
    const user = await findUserByName(username);

    if (!user || !user.credentials) {
      return { error: "Invalid email or password" };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.credentials.hash,
    );

    if (!isPasswordValid) {
      return { error: "Invalid email or password" };
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(
      "session",
      JSON.stringify({ userId: user._id, email: user.id }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      },
    );

    return {
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.id,
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
    const cookieStore = await cookies();
    cookieStore.delete("session");
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { error: "Failed to log out" };
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return null;
    }

    const session = JSON.parse(sessionCookie.value);
    const user = await findUserById(session.userId);

    if (!user) {
      return null;
    }

    return {
      id: user._id,
      name: user.name,
      email: user.id,
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
    email: user.id,
    createdAt: user.createdAt,
  }));
}

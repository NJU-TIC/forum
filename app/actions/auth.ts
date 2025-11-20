"use server";

import bcrypt from "bcrypt";
import { cookies } from "next/headers";

// Simple in-memory user storage (replace with database in production)
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const users: User[] = [];

export async function signupAction(formData: FormData) {
  try {
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Basic validation
    if (!username || !email || !password) {
      return { error: "Username, email, and password are required" };
    }

    if (password.length < 8) {
      return { error: "Password must be at least 8 characters long" };
    }

    // Check if user already exists
    const existingUser = users.find(
      (user) => user.username === username || user.email === email,
    );

    if (existingUser) {
      return { error: "Username or email already exists" };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new user
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 9),
      username,
      email,
      passwordHash,
      createdAt: new Date(),
    };

    users.push(newUser);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(
      "session",
      JSON.stringify({ userId: newUser.id, email: newUser.email }),
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
        id: newUser.id,
        username: newUser.username,
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
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Basic validation
    if (!email || !password) {
      return { error: "Email and password are required" };
    }

    // Find user by email
    const user = users.find((user) => user.email === email);

    if (!user) {
      return { error: "Invalid email or password" };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return { error: "Invalid email or password" };
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(
      "session",
      JSON.stringify({ userId: user.id, email: user.email }),
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
        id: user.id,
        username: user.username,
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
    const user = users.find((user) => user.id === session.userId);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
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
  return users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
  }));
}

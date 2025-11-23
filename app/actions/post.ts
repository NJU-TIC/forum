"use server";

import { cookies } from "next/headers";
import {
  createPost,
  incrementPostLikes as incrementPostLikesInDb,
  incrementPostForwards as incrementPostForwardsInDb,
  addCommentToPost as addCommentToPostInDb,
} from "@/lib/db";

export async function createPostAction(formData: FormData) {
  // Get current user from session
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie) {
    return { error: "You must be logged in to create a post" };
  }

  const session = JSON.parse(sessionCookie.value);
  const userId = session.userId;

  if (!userId) {
    return { error: "You must be logged in to create a post" };
  }

  // Get form data
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  // Basic validation
  if (!title || !content) {
    return { error: "Title and content are required" };
  }

  if (title.trim().length === 0 || content.trim().length === 0) {
    return { error: "Title and content cannot be empty" };
  }

  // Create post data matching the schema
  const postData = {
    author: userId,
    title: title.trim(),
    body: {
      content: content.trim(),
    },
    interactions: {
      likes: 0,
      forwards: 0,
      comments: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Save to database
  const newPost = await createPost(postData);

  return {
    success: true,
    post: newPost,
  };
}

export async function incrementPostLikes(postId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie) {
    return { error: "You must be logged in to like posts" };
  }

  const result = await incrementPostLikesInDb(postId);

  if (!result) {
    return { error: "Post not found" };
  }

  return {
    success: true,
    likes: result.interactions.likes,
  };
}

export async function incrementPostForwards(postId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie) {
    return { error: "You must be logged in to forward posts" };
  }

  const result = await incrementPostForwardsInDb(postId);

  if (!result) {
    return { error: "Post not found" };
  }

  return {
    success: true,
    forwards: result.interactions.forwards,
  };
}

export async function addCommentAction(postId: string, content: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie) {
    return { error: "You must be logged in to add comments" };
  }

  const session = JSON.parse(sessionCookie.value);
  const userId = session.userId;

  if (!userId) {
    return { error: "You must be logged in to add comments" };
  }

  if (!content || content.trim().length === 0) {
    return { error: "Comment content is required" };
  }

  const result = await addCommentToPostInDb(postId, userId, content.trim());

  if (!result) {
    return { error: "Post not found" };
  }

  return {
    success: true,
    comments: result.interactions.comments,
  };
}

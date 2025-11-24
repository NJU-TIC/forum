"use server";

import {
  createPost,
  incrementPostLikes as incrementPostLikesInDb,
  incrementPostForwards as incrementPostForwardsInDb,
  addCommentToPost as addCommentToPostInDb,
} from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createValidatedPost } from "@/lib/validation/post";

export async function createPostAction(formData: FormData) {
  const currentUser = await requireAuthenticatedUser().catch(() => null);

  if (!currentUser) {
    return { error: "You must be logged in to create a post" };
  }

  const userId = currentUser.id;

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

  // Create post data using the validation helper
  const postData = createValidatedPost({
    author: userId,
    title: title.trim(),
    content: content.trim(),
  });

  // Save to database
  try {
    const newPost = await createPost(postData);

    return {
      success: true,
      post: newPost,
    };
  } catch (error) {
    console.error("Error creating post:", error);
    return { error: "Failed to create post. Please try again." };
  }
}

export async function incrementPostLikes(postId: string) {
  const currentUser = await requireAuthenticatedUser().catch(() => null);

  if (!currentUser) {
    return { error: "You must be logged in to like posts" };
  }

  const result = await incrementPostLikesInDb(postId, currentUser.id);

  if (!result) {
    return { error: "Post not found" };
  }

  return {
    success: true,
    likes: result.interactions.likes.length,
  };
}

export async function incrementPostForwards(postId: string) {
  const currentUser = await requireAuthenticatedUser().catch(() => null);

  if (!currentUser) {
    return { error: "You must be logged in to forward posts" };
  }

  const result = await incrementPostForwardsInDb(postId, currentUser.id);

  if (!result) {
    return { error: "Post not found" };
  }

  return {
    success: true,
    forwards: result.interactions.forwards.length,
  };
}

export async function addCommentAction(postId: string, content: string) {
  const currentUser = await requireAuthenticatedUser().catch(() => null);

  if (!currentUser) {
    return { error: "You must be logged in to add comments" };
  }

  if (!content || content.trim().length === 0) {
    return { error: "Comment content is required" };
  }

  const result = await addCommentToPostInDb(
    postId,
    currentUser.id,
    content.trim(),
  );

  if (!result) {
    return { error: "Post not found" };
  }

  return {
    success: true,
    comments: result.interactions.comments,
  };
}

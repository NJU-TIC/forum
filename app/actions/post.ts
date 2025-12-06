"use server";

import {
  createPost,
  incrementPostLikes as incrementPostLikesInDb,
  incrementPostForwards as incrementPostForwardsInDb,
  addCommentToPost as addCommentToPostInDb,
  updatePostContent,
  findPostById,
} from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createValidatedPost } from "@/lib/validation/post";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Create a new post; handles optional image upload to public/uploads.
export async function createPostAction(formData: FormData) {
  const currentUser = await requireAuthenticatedUser().catch(() => null);

  if (!currentUser) {
    return { error: "You must be logged in to create a post" };
  }

  const userId = currentUser.id;

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const imageFile = formData.get("image") as File | null;

  // Basic validation
  if (!title || !content) {
    return { error: "Title and content are required" };
  }

  if (title.trim().length === 0 || content.trim().length === 0) {
    return { error: "Title and content cannot be empty" };
  }

  let imageUrl: string | null = null;

  // Handle optional image upload (saved under public/uploads).
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return { error: "Image is too large (max 5MB)" };
    }
    const ext = (path.extname(imageFile.name) || "").toLowerCase();
    if (!ALLOWED_IMAGE_EXT.includes(ext)) {
      return {
        error: "Unsupported image type. Use jpg, jpeg, png, webp, or gif",
      };
    }
    if (!ALLOWED_IMAGE_MIME.includes(imageFile.type)) {
      return { error: "Invalid image content type" };
    }
    try {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const filename = `${crypto.randomUUID()}${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, buffer);
      imageUrl = `/uploads/${filename}`;
    } catch (error) {
      console.error("File upload error (create):", error);
      return { error: "Failed to upload image. Please try again." };
    }
  }

  // Create post data using the validation helper
  const postData = createValidatedPost({
    author: userId,
    title: title.trim(),
    content: content.trim(),
    images: imageUrl ? [imageUrl] : [],
  });

  // Save to database

  const newPost = await createPost(postData);

  return {
    success: true,
    post: newPost,
  };
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

// Update an existing post; enforces ownership and allows replacing image.
export async function updatePostAction(postId: string, formData: FormData) {
  const currentUser = await requireAuthenticatedUser().catch(() => null);
  if (!currentUser) {
    return { error: "You must be logged in to update posts" };
  }

  const existing = await findPostById(postId);
  if (!existing) {
    return { error: "Post not found" };
  }

  if (existing.author !== currentUser.id) {
    return { error: "You can only edit your own posts" };
  }

  const title = (formData.get("title") as string) ?? "";
  const content = (formData.get("content") as string) ?? "";
  const imageFile = formData.get("image") as File | null;

  if (!title.trim() || !content.trim()) {
    return { error: "Title and content are required" };
  }

  let imageUrl: string | undefined;
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return { error: "Image is too large (max 5MB)" };
    }
    const ext = (path.extname(imageFile.name) || "").toLowerCase();
    if (!ALLOWED_IMAGE_EXT.includes(ext)) {
      return {
        error: "Unsupported image type. Use jpg, jpeg, png, webp, or gif",
      };
    }
    if (!ALLOWED_IMAGE_MIME.includes(imageFile.type)) {
      return { error: "Invalid image content type" };
    }
    try {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const filename = `${crypto.randomUUID()}${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, buffer);
      imageUrl = `/uploads/${filename}`;
    } catch (error) {
      console.error("File upload error (update):", error);
      return { error: "Failed to upload image. Please try again." };
    }
  }

  const updated = await updatePostContent(postId, {
    title: title.trim(),
    content: content.trim(),
    images: imageUrl
      ? [imageUrl]
      : Array.isArray(existing.body.images)
        ? existing.body.images
        : [],
  });

  if (!updated) {
    return { error: "Failed to update post" };
  }

  return { success: true, post: updated };
}

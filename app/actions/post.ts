"use server";

import {
  createPost,
  togglePostLike as togglePostLikeInDb,
  togglePostForward as togglePostForwardInDb,
  addCommentToPost as addCommentToPostInDb,
  updatePostContent,
  findPostById,
  fetchAuthorsByIds,
} from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createValidatedPost } from "@/lib/validation/post";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";
import { Result } from "@/types/common/result";
import { PostComment, SPost } from "@/schema/post";
import { SUser } from "@/schema/user";

const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

// Helper function to validate form data
function validatePostFormData(
  formData: FormData,
): Result<{ title: string; content: string; imageFile: File | null }> {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const imageFile = formData.get("image") as File | null;

  // Basic validation
  if (!title || !content) {
    return { success: false, error: "Title and content are required" };
  }

  if (title.trim().length === 0 || content.trim().length === 0) {
    return { success: false, error: "Title and content cannot be empty" };
  }

  return {
    success: true,
    data: { title, content, imageFile: imageFile },
  };
}

// Helper function to process image upload
async function processImageUpload(
  imageFile: File | null,
): Promise<Result<string>> {
  if (!imageFile || imageFile.size === 0) {
    return { success: true, data: "" };
  }

  if (imageFile.size > MAX_IMAGE_BYTES) {
    return {
      success: false,
      error: `Image is too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)}MB)`,
    };
  }

  const buffer = Buffer.from(await imageFile.arrayBuffer());
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType || !ALLOWED_IMAGE_MIME.includes(fileType.mime)) {
    return { success: false, error: "Invalid image content type" };
  }

  const ext = `.${fileType.ext.toLowerCase()}`;
  const filename = `${crypto.randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);

  return { success: true, data: `/uploads/${filename}` };
}

// Create a new post; handles optional image upload to public/uploads.
export async function createPostAction(
  formData: FormData,
): Promise<Result<{ post: SPost }>> {
  const currentUser = await requireAuthenticatedUser().catch(() => null);

  if (!currentUser) {
    return { success: false, error: "You must be logged in to create a post" };
  }

  const userId = currentUser.id;

  // Validate form data
  const validation = validatePostFormData(formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { title, content, imageFile } = validation.data;

  // Process image upload
  const imageResult = await processImageUpload(imageFile);
  if (!imageResult.success) {
    return { success: false, error: imageResult.error };
  }

  // Create post data using the validation helper
  const postData = createValidatedPost({
    author: userId,
    title: title.trim(),
    content: content.trim(),
    images: imageResult.data ? [imageResult.data] : [],
  });

  // Save to database
  const newPost = await createPost(postData);

  return {
    success: true,
    data: { post: newPost },
  };
}

export async function togglePostLike(
  postId: string,
): Promise<Result<{ count: number; liked: boolean }>> {
  const currentUser = await requireAuthenticatedUser().catch(() => null);

  if (!currentUser) {
    return { success: false, error: "You must be logged in to like posts" };
  }

  const result = await togglePostLikeInDb(postId, currentUser.id);

  if (!result) {
    return { success: false, error: "Post not found" };
  }

  return {
    success: true,
    data: {
      count: result.post.interactions.likes.length,
      liked: result.added,
    },
  };
}

export async function togglePostForward(
  postId: string,
): Promise<Result<{ count: number; forwarded: boolean }>> {
  const currentUser = await requireAuthenticatedUser().catch(() => null);

  if (!currentUser) {
    return { success: false, error: "You must be logged in to forward posts" };
  }

  const result = await togglePostForwardInDb(postId, currentUser.id);

  if (!result) {
    return { success: false, error: "Post not found" };
  }

  return {
    success: true,
    data: {
      count: result.post.interactions.forwards.length,
      forwarded: result.added,
    },
  };
}

export async function addCommentAction(
  postId: string,
  content: string,
): Promise<
  Result<{ comments: Array<PostComment & { author: SUser | null }> }>
> {
  const currentUser = await requireAuthenticatedUser().catch(() => null);

  if (!currentUser) {
    return { success: false, error: "You must be logged in to add comments" };
  }

  if (!content || content.trim().length === 0) {
    return { success: false, error: "Comment content is required" };
  }

  const result = await addCommentToPostInDb(
    postId,
    currentUser.id,
    content.trim(),
  );

  if (!result) {
    return { success: false, error: "Post not found" };
  }

  const comments = result.interactions.comments;

  const authorIds = comments.map((c) => c.author);
  const authorMap = await fetchAuthorsByIds(authorIds);
  const populatedComments = comments.map((c) => ({
    ...c,
    author: authorMap.get(c.author) || null,
  })) as Array<PostComment & { author: SUser | null }>;

  return {
    success: true,
    data: { comments: populatedComments },
  };
}

// Update an existing post; enforces ownership and allows replacing image.
export async function updatePostAction(
  postId: string,
  formData: FormData,
): Promise<Result<{ post: SPost }>> {
  const currentUser = await requireAuthenticatedUser().catch(() => null);
  if (!currentUser) {
    return { success: false, error: "You must be logged in to update posts" };
  }

  const existing = await findPostById(postId);
  if (!existing) {
    return { success: false, error: "Post not found" };
  }

  if (existing.author !== currentUser.id) {
    return { success: false, error: "You can only edit your own posts" };
  }

  // Validate form data
  const validation = validatePostFormData(formData);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const { title, content, imageFile } = validation.data;

  // Process image upload
  const imageResult = await processImageUpload(imageFile);
  if (!imageResult.success) {
    return { success: false, error: imageResult.error };
  }

  const updateResult = await updatePostContent(postId, {
    title: title.trim(),
    content: content.trim(),
    images: imageResult.data
      ? [imageResult.data]
      : Array.isArray(existing.body.images)
        ? existing.body.images
        : [],
  });

  if (!updateResult.success) {
    return { success: false, error: updateResult.error };
  }

  return { success: true, data: { post: updateResult.data } };
}

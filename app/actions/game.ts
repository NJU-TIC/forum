"use server";

import { createGame, findGameById, deleteGameById } from "@/lib/db/game";
import { uploadGameFiles, deleteGameFiles } from "@/lib/cos";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { Result } from "@/types/common/result";
import { SGame } from "@/schema/game";
import {
  createHtmlZipValidationError,
  inspectGameZip,
  type UploadGameActionError,
} from "@/lib/validation/game-zip";

const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB

// MIME type lookup for common web file extensions
const MIME_TYPES: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "application/javascript",
  mjs: "application/javascript",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  ico: "image/x-icon",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  txt: "text/plain",
  xml: "application/xml",
  pdf: "application/pdf",
};

function getContentType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  return MIME_TYPES[ext] || "application/octet-stream";
}

export async function uploadGameAction(
  formData: FormData,
): Promise<Result<{ game: SGame }, UploadGameActionError>> {
  const currentUser = await requireAuthenticatedUser().catch(() => null);

  if (!currentUser) {
    return { success: false, error: "You must be logged in to upload a game" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const zipFile = formData.get("zipFile") as File | null;

  if (!title || title.trim().length === 0) {
    return { success: false, error: "Title is required" };
  }

  if (!description || description.trim().length === 0) {
    return { success: false, error: "Description is required" };
  }

  if (!zipFile || zipFile.size === 0) {
    return { success: false, error: "ZIP file is required" };
  }

  if (zipFile.size > MAX_ZIP_BYTES) {
    return {
      success: false,
      error: `ZIP file is too large (max ${MAX_ZIP_BYTES / (1024 * 1024)}MB)`,
    };
  }

  const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
  const inspectionResult = await inspectGameZip(zipBuffer, {
    requireRootIndexHtml: true,
  });
  if (!inspectionResult.success) {
    return {
      success: false,
      error: inspectionResult.error,
    };
  }

  if (!inspectionResult.data.passed) {
    return {
      success: false,
      error: createHtmlZipValidationError(inspectionResult.data.violations),
    };
  }

  const { entries } = inspectionResult.data;

  // Save game metadata to database first
  const newGame = await createGame({
    author: currentUser.id,
    title: title.trim(),
    description: description.trim(),
  });

  // Upload all files to COS under the game ID prefix
  try {
    await uploadGameFiles(
      newGame._id,
      entries.map((entry) => ({
        path: entry.path,
        data: entry.data,
        contentType: getContentType(entry.path),
      })),
    );
  } catch (err) {
    console.error("[uploadGameAction] COS upload failed:", err);
    // If COS upload fails, clean up the DB record
    await deleteGameById(newGame._id);
    return {
      success: false,
      error: `Failed to upload game files: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return {
    success: true,
    data: { game: newGame },
  };
}

export async function deleteGameAction(
  gameId: string,
): Promise<Result<null>> {
  const currentUser = await requireAuthenticatedUser().catch(() => null);

  if (!currentUser) {
    return { success: false, error: "You must be logged in to delete games" };
  }

  const game = await findGameById(gameId);
  if (!game) {
    return { success: false, error: "Game not found" };
  }

  if (game.author !== currentUser.id) {
    return { success: false, error: "You can only delete your own games" };
  }

  // Delete COS files first, then DB record
  await deleteGameFiles(gameId);
  await deleteGameById(gameId);

  return { success: true, data: null };
}

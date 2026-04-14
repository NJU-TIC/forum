"use server";

import { createGame, findGameById, deleteGameById, type GameFileData } from "@/lib/db/game";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { Result } from "@/types/common/result";
import { SGame } from "@/schema/game";
import JSZip from "jszip";

const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file

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

function isHiddenOrSystemPath(filePath: string): boolean {
  const parts = filePath.split("/");
  return parts.some(
    (part) => part.startsWith(".") || part === "__MACOSX" || part === "Thumbs.db",
  );
}

export async function uploadGameAction(
  formData: FormData,
): Promise<Result<{ game: SGame }>> {
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

  // Extract ZIP
  let zip: JSZip;
  try {
    const buffer = Buffer.from(await zipFile.arrayBuffer());
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return { success: false, error: "Invalid ZIP file" };
  }

  // Collect files, skip hidden/system files and directories
  const entries: { path: string; data: Buffer }[] = [];
  const zipEntries = Object.entries(zip.files);

  for (const [relativePath, zipEntry] of zipEntries) {
    if (zipEntry.dir) continue;
    if (isHiddenOrSystemPath(relativePath)) continue;

    const data = await zipEntry.async("nodebuffer");
    if (data.length > MAX_FILE_BYTES) {
      return {
        success: false,
        error: `File "${relativePath}" is too large (max ${MAX_FILE_BYTES / (1024 * 1024)}MB per file)`,
      };
    }

    entries.push({ path: relativePath, data });
  }

  if (entries.length === 0) {
    return { success: false, error: "ZIP file contains no files" };
  }

  // Unwrap single top-level directory if present
  const topDirs = new Set(
    entries.map((e) => e.path.split("/")[0]),
  );
  if (topDirs.size === 1 && !entries.some((e) => e.path.split("/").length === 1)) {
    // All files are under a single top-level directory — unwrap it
    const prefix = [...topDirs][0] + "/";
    for (const entry of entries) {
      entry.path = entry.path.slice(prefix.length);
    }
  }

  // Validate index.html exists
  if (!entries.some((e) => e.path === "index.html" || e.path === "index.htm")) {
    return {
      success: false,
      error: "ZIP must contain an index.html (or index.htm) at the root level",
    };
  }

  // Build file data for DB storage
  const gameFiles: GameFileData[] = entries.map((entry) => ({
    gameId: "", // Will be set by createGame after insert
    path: entry.path,
    content: entry.data,
    contentType: getContentType(entry.path),
  }));

  // Save to database
  const newGame = await createGame(
    {
      author: currentUser.id,
      title: title.trim(),
      description: description.trim(),
    },
    gameFiles,
  );

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

  await deleteGameById(gameId);

  return { success: true, data: null };
}

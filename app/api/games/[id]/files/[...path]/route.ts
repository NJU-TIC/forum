import { findGameFile } from "@/lib/db/game";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; path?: string[] }> },
) {
  const { id, path: pathSegments } = await params;

  // Default to index.html if no path provided
  const filePath = pathSegments?.length
    ? pathSegments.join("/")
    : "index.html";

  const file = await findGameFile(id, filePath);

  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(file.content, {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

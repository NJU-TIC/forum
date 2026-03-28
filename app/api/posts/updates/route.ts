import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { fetchAuthorsByIds } from "@/lib/db";
import { validateQueriedPostSafe } from "@/lib/validation/post";
import type { QPost } from "@/schema/post";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function parseSince(raw: string | null): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseLimit(searchParams.get("limit"));
  const since = parseSince(searchParams.get("since"));

  const postsCollection = await getCollection<QPost>("posts");
  const query = since ? { createdAt: { $gte: since } } : {};
  const rawPosts = await postsCollection
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const posts = rawPosts
    .map((post) => {
      const validated = validateQueriedPostSafe(post);
      if (!validated) return null;
      return {
        id: post._id.toString(),
        title: validated.title,
        authorId: validated.author,
        createdAt: validated.createdAt.toISOString(),
      };
    })
    .filter((post): post is NonNullable<typeof post> => post !== null);

  const authorIds = Array.from(new Set(posts.map((post) => post.authorId)));
  const authorMap = await fetchAuthorsByIds(authorIds);
  const postsWithAuthor = posts.map((post) => ({
    ...post,
    authorName: authorMap.get(post.authorId)?.name ?? "未知用户",
  }));

  // Send oldest -> newest so client can notify in natural order.
  postsWithAuthor.reverse();

  return NextResponse.json(
    { posts: postsWithAuthor },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

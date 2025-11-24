import { PostCard } from "@/components/posts/PostCard";
import { findAllPosts, findUserById } from "@/lib/db";
import Link from "next/link";
import { cookies } from "next/headers";
import type { QPost } from "@/schema/post";
import type { QUser } from "@/schema/user";

type PopulatedPost = QPost & { author: QUser; createdAt: Date };

async function populatePostsWithAuthors(
  posts: QPost[],
): Promise<PopulatedPost[]> {
  const authorIds = Array.from(new Set(posts.map((post) => post.author)));
  const authors = await Promise.all(
    authorIds.map(async (id) => {
      const author = await findUserById(id);
      return author ? ([id, author] as const) : null;
    }),
  );

  const authorMap = new Map(
    authors.filter(
      (entry): entry is readonly [string, QUser] => entry !== null,
    ),
  );

  return posts
    .map((post) => {
      const author = authorMap.get(post.author);
      if (!author) return null;

      return {
        ...post,
        author,
        createdAt: new Date(post.createdAt),
      };
    })
    .filter((post): post is PopulatedPost => post !== null);
}

async function getPosts(): Promise<PopulatedPost[]> {
  const posts = await findAllPosts();
  return await populatePostsWithAuthors(posts);
}

export default async function HomePage() {
  const posts = await getPosts();

  // Check if user is logged in
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  const isLoggedIn = !!sessionCookie;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Forum Posts</h1>
        {isLoggedIn && (
          <Link
            href="/write-post"
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Write Post
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No posts yet. Be the first to create one!
          </p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

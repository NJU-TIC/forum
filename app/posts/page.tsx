import { PostCard } from "@/components/posts/PostCard";
import { findAllPostsWithAuthors } from "@/lib/db";
import Link from "next/link";
import { cookies } from "next/headers";

async function getPosts() {
  try {
    const posts = await findAllPostsWithAuthors();

    return posts;
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
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

import { PostCard } from "@/components/posts/PostCard";
import { findAllPostsWithAuthors } from "@/lib/db";

async function getPosts() {
  try {
    const posts = await findAllPostsWithAuthors();

    return posts
      .map((post) => {
        if (!post) return null;

        return {
          ...post,
          createdAt: new Date(post.createdAt),
        } as Parameters<typeof PostCard>[0]["post"];
      })
      .filter((post): post is NonNullable<typeof post> => post !== null);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
}

export async function HomePage() {
  const posts = await getPosts();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Forum Posts</h1>

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

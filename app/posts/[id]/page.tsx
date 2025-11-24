import { PostDetail } from "@/components/posts/PostDetail";
import { findPostById, findAllPostsWithAuthors } from "@/lib/db";
import { notFound } from "next/navigation";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

async function getPostWithAuthor(id: string) {
  const post = await findPostById(id);
  if (!post) return null;

  // Get author information
  const users = await findAllPostsWithAuthors();
  const postWithAuthor = users.find((p) => p._id === id);

  if (!postWithAuthor) return null;

  return {
    ...post,
    author: postWithAuthor.author,
    createdAt: new Date(post.createdAt),
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const post = await getPostWithAuthor(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PostDetail post={post} />
    </div>
  );
}

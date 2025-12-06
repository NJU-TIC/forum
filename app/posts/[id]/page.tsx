import { PostDetail } from "@/components/posts/PostDetail";
import { PostDetailMinimal } from "@/components/posts/PostDetailMinimal";
import { findPostById, fetchAuthorById } from "@/lib/db";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

async function getPostWithAuthor(id: string) {
  const post = await findPostById(id);

  if (!post) {
    console.log("Post not found by ID:", id);
    return null;
  }

  const author = await fetchAuthorById(post.author);

  if (!author) {
    console.log("Author not found for post:", post.author);
    return null;
  }

  // Combine post with author
  const postWithAuthor = {
    ...post,
    author,
    createdAt: post.createdAt,
  };

  return postWithAuthor;
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const post = await getPostWithAuthor(id);
  const currentUser = await getCurrentUser();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PostDetail post={post} currentUserId={currentUser?.id} />
    </div>
  );
}

import { EditPostForm } from "@/components/posts/EditPostForm";
import { getCurrentUser } from "@/app/actions/auth";
import { findPostById, fetchAuthorById } from "@/lib/db";
import { redirect, notFound } from "next/navigation";

interface PostEditPageProps {
  params: Promise<{ id: string }>;
}

async function getPostWithAuthor(id: string) {
  const post = await findPostById(id);

  if (!post) {
    return null;
  }

  const author = await fetchAuthorById(post.author);
  if (!author) {
    return null;
  }

  return {
    ...post,
    author,
  };
}

export default async function PostEditPage({ params }: PostEditPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const post = await getPostWithAuthor(id);

  if (!post) {
    notFound();
  }

  if (!currentUser || post.author._id !== currentUser.id) {
    redirect(`/posts/${id}`);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Post</h1>
        <p className="text-gray-600">
          Update your post content and optionally replace the image.
        </p>
      </div>

      <EditPostForm
        postId={id}
        initialTitle={post.title}
        initialContent={post.body.content}
        initialImages={post.body.images || []}
      />
    </div>
  );
}

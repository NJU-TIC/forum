import {
  findPostById,
  fetchAuthorById,
  fetchAuthorsByIds,
} from "@/lib/db";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import { PostComment as OriginalPostComment, QPost } from "@/schema/post";
import { QUser } from "@/schema/user";
import { PostDetail } from "@/components/posts/PostDetail"; // Keep this import

interface PostPageProps {
  params: Promise<{ id: string }>;
}

type PopulatedPostComment = Omit<OriginalPostComment, "author"> & {
  author: QUser | null;
};

type PopulatedQPost = Omit<QPost, "author" | "interactions"> & {
  author: QUser;
  interactions: {
    comments: PopulatedPostComment[];
    likes: string[];
    forwards: string[];
  };
};

async function getPostWithAuthor(
  id: string,
): Promise<PopulatedQPost | null> {
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
  const postWithAuthor: PopulatedQPost = {
    ...post,
    author,
    createdAt: post.createdAt,
    interactions: {
      ...post.interactions,
      comments: [], // Initialize as empty array
      likes: (post.interactions?.likes || []) as string[],
      forwards: (post.interactions?.forwards || []) as string[],
    },
  };

  // Now, populate the comments
  if (post.interactions?.comments) {
    const commentAuthorIds = post.interactions.comments.map(
      (c) => c.author,
    );
    const authorMap = await fetchAuthorsByIds(commentAuthorIds);
    postWithAuthor.interactions.comments =
      post.interactions.comments.map((c) => ({
        ...c,
        author: authorMap.get(c.author) || null,
      }));
  }

  return postWithAuthor;
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const post = await getPostWithAuthor(id);
  const currentUser = await getCurrentUser();

  if (!post) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PostDetail post={post} currentUserId={currentUser?.id} />
    </div>
  );
}

import {
  findPostById,
  fetchAuthorById,
  fetchAuthorsByIds,
  getPostTotalScores,
  getUserPostScoreSummary,
} from "@/lib/db";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import { PostComment as OriginalPostComment, SPost } from "@/schema/post";
import { SUser } from "@/schema/user";
import { PostDetail } from "@/components/posts/PostDetail";
import { SCORE_BUDGET } from "@/lib/scoring";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

type PopulatedPostComment = Omit<OriginalPostComment, "author"> & {
  author: SUser | null;
};

type PopulatedQPost = Omit<SPost, "author" | "interactions"> & {
  author: SUser;
  postTotalScore: number;
  currentUserScore: number;
  currentUserRemainingScore: number;
  interactions: {
    comments: PopulatedPostComment[];
    likes: string[];
    forwards: string[];
  };
};

async function getPostWithAuthor(
  id: string,
  currentUserId?: string,
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

  const [postTotalScoreMap, currentUserScoreSummary] = await Promise.all([
    getPostTotalScores([id]),
    currentUserId ? getUserPostScoreSummary(currentUserId) : null,
  ]);

  // Combine post with author
  const postWithAuthor: PopulatedQPost = {
    ...post,
    author,
    postTotalScore: postTotalScoreMap.get(id) ?? 0,
    currentUserScore: currentUserScoreSummary?.scores[id] ?? 0,
    currentUserRemainingScore: currentUserScoreSummary?.remainingScore ?? SCORE_BUDGET,
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
  const currentUser = await getCurrentUser();
  const post = await getPostWithAuthor(id, currentUser?.id);

  if (!post) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PostDetail
        post={post}
        currentUserId={currentUser?.id}
        initialRemainingScore={post.currentUserRemainingScore}
      />
    </div>
  );
}

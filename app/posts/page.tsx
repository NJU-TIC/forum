import { PostCard } from "@/components/posts/PostCard";
import {
  findAllPosts,
  findUserById,
  getPostTotalScores,
  getUserPostScoreSummary,
} from "@/lib/db";
import Link from "next/link";
import type { SPost } from "@/schema/post";
import type { SUser } from "@/schema/user";
import { getCurrentUser } from "@/app/actions/auth";
import { SCORE_BUDGET } from "@/lib/scoring";

type PopulatedPost = SPost & {
  author: SUser;
  createdAt: Date;
  postTotalScore: number;
  currentUserScore: number;
  currentUserRemainingScore: number;
};

async function populatePostsWithAuthors(
  posts: SPost[],
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
      (entry): entry is readonly [string, SUser] => entry !== null,
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
        postTotalScore: 0,
        currentUserScore: 0,
        currentUserRemainingScore: SCORE_BUDGET,
      };
    })
    .filter((post): post is PopulatedPost => post !== null);
}

async function getPosts(currentUserId?: string): Promise<{
  posts: PopulatedPost[];
  allocatedScore: number;
  remainingScore: number;
}> {
  const posts = await findAllPosts();
  const populatedPosts = await populatePostsWithAuthors(posts);

  const postIds = populatedPosts.map((post) => post._id);
  const [postTotalScoreMap, currentUserScoreSummary] = await Promise.all([
    getPostTotalScores(postIds),
    currentUserId ? getUserPostScoreSummary(currentUserId) : null,
  ]);

  return {
    posts: populatedPosts.map((post) => ({
      ...post,
      postTotalScore: postTotalScoreMap.get(post._id) ?? 0,
      currentUserScore: currentUserScoreSummary?.scores[post._id] ?? 0,
      currentUserRemainingScore: currentUserScoreSummary?.remainingScore ?? SCORE_BUDGET,
    })),
    allocatedScore: currentUserScoreSummary?.allocatedScore ?? 0,
    remainingScore: currentUserScoreSummary?.remainingScore ?? SCORE_BUDGET,
  };
}

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const { posts, allocatedScore, remainingScore } = await getPosts(currentUser?.id);
  const isLoggedIn = !!currentUser;

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
      {isLoggedIn && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          评分预算：已分配 {allocatedScore}/{SCORE_BUDGET}，剩余 {remainingScore}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No posts yet. Be the first to create one!
          </p>
        </div>
      ) : (
        <div>
          {posts.reverse().map((post) => (
            <PostCard
              key={post._id}
              post={post}
              currentUserId={currentUser?.id}
              initialRemainingScore={post.currentUserRemainingScore}
            />
          ))}
        </div>
      )}
    </div>
  );
}

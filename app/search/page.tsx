import { SearchPosts } from "@/components/search/SearchPosts";
import {
  findAllPostsWithAuthors,
  getPostTotalScores,
  getUserPostScoreSummary,
} from "@/lib/db";
import { getCurrentUser } from "@/app/actions/auth";
import { SCORE_BUDGET } from "@/lib/scoring";

export default async function SearchPage() {
  const currentUser = await getCurrentUser();
  const posts = await findAllPostsWithAuthors();
  const postIds = posts.map((post) => post._id);
  const [postTotalScoreMap, currentUserScoreSummary] = await Promise.all([
    getPostTotalScores(postIds),
    currentUser ? getUserPostScoreSummary(currentUser.id) : null,
  ]);
  const postsWithScores = posts.map((post) => ({
    ...post,
    postTotalScore: postTotalScoreMap.get(post._id) ?? 0,
    currentUserScore: currentUserScoreSummary?.scores[post._id] ?? 0,
  }));
  const initialRemainingScore =
    currentUserScoreSummary?.remainingScore ?? SCORE_BUDGET;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Search Posts</h1>
      <SearchPosts
        posts={postsWithScores}
        currentUserId={currentUser?.id}
        initialRemainingScore={initialRemainingScore}
      />
    </div>
  );
}

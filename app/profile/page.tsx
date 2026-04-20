import { ProfilePage } from "@/components/profile/ProfilePage";
import { getCurrentUser } from "@/app/actions/auth";
import { findUserById, findPostsByAuthor, getPostTotalScores } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function Profile() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const user = await findUserById(currentUser.id);
  if (!user) {
    redirect("/login");
  }

  const userPosts = await findPostsByAuthor(user._id);
  const postTotalScoreMap = await getPostTotalScores(
    userPosts.map((post) => post._id),
  );
  const scoredPosts = userPosts.map((post) => ({
    ...post,
    postTotalScore: postTotalScoreMap.get(post._id) ?? 0,
    currentUserScore: 0,
  }));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <ProfilePage user={user} posts={scoredPosts} />
    </div>
  );
}

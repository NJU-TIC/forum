import { ProfilePage } from "@/components/profile/ProfilePage";
import { getCurrentUser } from "@/app/actions/auth";
import { findUserById, findPostsByAuthor } from "@/lib/db";
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <ProfilePage user={user} posts={userPosts} />
    </div>
  );
}

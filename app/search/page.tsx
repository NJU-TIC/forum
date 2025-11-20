import { SearchPosts } from "@/components/search/SearchPosts";
import { findAllPostsWithAuthors } from "@/lib/db";

export default async function SearchPage() {
  const posts = await findAllPostsWithAuthors();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Search Posts</h1>
      <SearchPosts posts={posts} />
    </div>
  );
}

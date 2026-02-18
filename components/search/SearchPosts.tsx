"use client";

import { useState, useMemo } from "react";
import { PostCard } from "@/components/posts/PostCard";
import { SPost } from "@/schema/post";
import { SUser } from "@/schema/user";
import { Search, Filter } from "lucide-react";

interface SearchPostsProps {
  posts: (SPost & {
    author: SUser;
    createdAt: Date;
  })[];
}

export function SearchPosts({ posts }: SearchPostsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "mostLiked">(
    "newest",
  );

  const filteredAndSortedPosts = useMemo(() => {
    const filtered = posts.filter((post) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        post.title.toLowerCase().includes(searchLower) ||
        post.body.content.toLowerCase().includes(searchLower) ||
        post.author.name.toLowerCase().includes(searchLower)
      );
    });

    const sorted = filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "mostLiked":
          return b.interactions.likes.length - a.interactions.likes.length;
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return sorted;
  }, [posts, searchTerm, sortBy]);

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search posts by title, content, or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 h-4 w-4" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="mostLiked">Most Liked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Found {filteredAndSortedPosts.length} post
        {filteredAndSortedPosts.length !== 1 ? "s" : ""}
        {searchTerm && ` matching "${searchTerm}"`}
      </div>

      {/* Posts List */}
      {filteredAndSortedPosts.length === 0 ? (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No posts found
          </h3>
          <p className="text-gray-500">
            {searchTerm
              ? "Try adjusting your search terms or browse all posts"
              : "No posts available yet"}
          </p>
        </div>
      ) : (
        <div>
          {filteredAndSortedPosts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

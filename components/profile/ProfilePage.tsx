"use client";

import { QUser } from "@/schema/user";
import { QPost } from "@/schema/post";
import { PostCard } from "@/components/posts/PostCard";
import { User, Calendar, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ProfilePageProps {
  user: QUser & { _id: string };
  posts: (QPost & { createdAt: string })[];
}

export function ProfilePage({ user, posts }: ProfilePageProps) {
  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-600">@{user.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <FileText className="w-4 h-4" />
            <span>{posts.length} posts</span>
          </div>
          {user.isAdmin && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                Admin
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* User Posts */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">My Posts</h2>
        {posts.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-500">
              You haven&apos;t created any posts yet.
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Start by creating your first post!
            </p>
          </Card>
        ) : (
          <div>
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={{
                  ...post,
                  author: user as any,
                  createdAt: new Date(post.createdAt),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

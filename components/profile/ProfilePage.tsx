"use client";

import { useState } from "react";
import { SUser } from "@/schema/user";
import { SPost } from "@/schema/post";
import { PostCard } from "@/components/posts/PostCard";
import { User, Calendar, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UsernameForm } from "./UsernameForm";

interface ProfilePageProps {
  user: SUser;
  posts: SPost[];
}

export function ProfilePage({ user, posts }: ProfilePageProps) {
  // Track display name for header and modal visibility for editing.
  const [displayName, setDisplayName] = useState(user.name);
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
            <p className="text-gray-600">@{user._id}</p>
          </div>
          {/* Button to open profile edit modal. */}
          <button
            onClick={() => setShowEditor(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Edit profile
          </button>
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
                post={
                  {
                    ...post,
                    author: user,
                    createdAt: new Date(post.createdAt),
                  } as SPost & { author: SUser; createdAt: Date }
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal with username editor (could extend to more profile fields). */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-md p-6 relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Edit profile
                </h2>
                <p className="text-sm text-gray-500">
                  Update your username and save changes.
                </p>
              </div>
              <button
                onClick={() => setShowEditor(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <UsernameForm
              initialName={displayName}
              onSuccess={(name) => {
                setDisplayName(name);
                setShowEditor(false);
              }}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

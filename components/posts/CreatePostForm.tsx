"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

interface CreatePostFormProps {
  onPostCreated: (post: any) => void;
  isPosting?: boolean;
  setIsPosting?: (posting: boolean) => void;
}

export default function CreatePostForm({
  onPostCreated,
  isPosting = false,
  setIsPosting,
}: CreatePostFormProps) {
  const { token } = useAuth();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Post content cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/posts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (response.ok) {
        setContent("");
        onPostCreated(data.post);
      } else {
        setError(data.message || "Failed to create post");
      }
    } catch (err) {
      setError("An error occurred while creating the post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          required
        />
      </div>
      {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}

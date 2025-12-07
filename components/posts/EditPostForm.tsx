"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePostAction } from "@/app/actions/post";

interface EditPostFormProps {
  postId: string;
  initialTitle: string;
  initialContent: string;
  initialImages?: string[];
}

export function EditPostForm({
  postId,
  initialTitle,
  initialContent,
  initialImages = [],
}: EditPostFormProps) {
  // Client-side form for editing an existing post.
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Prefer a newly selected image; otherwise show existing first image if any.
  const currentImage = previewUrl || initialImages[0] || null;

  // Cleanup blob URL to avoid leaks when preview changes/unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    if (imageFile) {
      formData.append("image", imageFile);
    }

    const result = await updatePostAction(postId, formData);

    if (!result.success) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    router.push(`/posts/${postId}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your post title..."
          required
          disabled={isSaving}
        />
      </div>

      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Content
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
          placeholder="Write your post content..."
          required
          disabled={isSaving}
        />
      </div>

      <div>
        <label
          htmlFor="image"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Image (optional)
        </label>
        <input
          id="image"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setImageFile(file);
            setPreviewUrl(file ? URL.createObjectURL(file) : null);
          }}
          disabled={isSaving}
          className="block w-full text-sm text-gray-700 border border-dashed border-gray-300 rounded-lg px-4 py-3 bg-white cursor-pointer hover:border-blue-400"
        />
        {currentImage && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">Current/Preview image:</p>
            <img
              src={currentImage}
              alt="Preview"
              className="w-full max-w-md rounded-lg border object-cover"
            />
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/posts/${postId}`)}
          className="px-6 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

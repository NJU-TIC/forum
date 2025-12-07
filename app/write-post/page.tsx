"use client";

import { useRouter } from "next/navigation";
import { createPostAction } from "@/app/actions/post";
import { PostForm } from "@/components/posts/PostForm";

export default function WritePostPage() {
  const router = useRouter();

  const handleSuccess = (data: { post: { _id: string } }) => {
    router.push(`/posts/${data.post._id}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create New Post
        </h1>
        <p className="text-gray-600">Share your thoughts with the community</p>
      </div>
      <PostForm
        action={createPostAction}
        buttonText="Create Post"
        onSuccess={handleSuccess}
      />
    </div>
  );
}

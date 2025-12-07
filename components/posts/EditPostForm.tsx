"use client";

import { useRouter } from "next/navigation";
import { updatePostAction } from "@/app/actions/post";
import { PostForm } from "./PostForm";

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
  const router = useRouter();

  const action = updatePostAction.bind(null, postId);

  const handleSuccess = () => {
    router.push(`/posts/${postId}`);
  };

  return (
    <PostForm
      action={action}
      initialTitle={initialTitle}
      initialContent={initialContent}
      initialImages={initialImages}
      buttonText="Save changes"
      onSuccess={handleSuccess}
    />
  );
}

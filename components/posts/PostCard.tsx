"use client";

import { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { SPost } from "@/schema/post";
import { SUser } from "@/schema/user";
import { useRouter } from "next/navigation";
import { PostInteractions } from "./PostInteractions";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { PostHeader } from "./PostHeader";
import { cardDateFormatter } from "@/lib/formatters";

interface PostCardProps {
  post: SPost & {
    author: SUser;
    createdAt: Date;
  };
  currentUserId?: string;
}

export function PostCard({ post, currentUserId }: PostCardProps) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      setIsOverflowing(el.scrollHeight > el.clientHeight);
    }
  }, [post.body.content]);

  return (
    <Card
      className="p-6 mb-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => router.push(`/posts/${post._id}`)}
    >
      <div className="space-y-4">
        <PostHeader
          title={post.title}
          author={post.author}
          createdAt={post.createdAt}
          dateFormatter={cardDateFormatter}
        />

        <div
          ref={contentRef}
          className="max-h-[50vh] overflow-hidden"
          style={
            isOverflowing
              ? {
                  maskImage:
                    "linear-gradient(to bottom, black calc(100% - 5rem), transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, black calc(100% - 5rem), transparent 100%)",
                }
              : undefined
          }
        >
          <MarkdownRenderer content={post.body.content} />
        </div>

        <PostInteractions
          postId={post._id}
          initialLikes={post.interactions.likes.length}
          initialForwards={post.interactions.forwards.length}
          commentsCount={post.interactions.comments.length}
          initialLiked={
            currentUserId
              ? post.interactions.likes.includes(currentUserId)
              : false
          }
          initialForwarded={
            currentUserId
              ? post.interactions.forwards.includes(currentUserId)
              : false
          }
          onCommentClick={() => router.push(`/posts/${post._id}`)}
        />
      </div>
    </Card>
  );
}

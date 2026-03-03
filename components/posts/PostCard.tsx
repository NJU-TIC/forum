"use client";

import { Card } from "@/components/ui/card";
import { SPost } from "@/schema/post";
import { SUser } from "@/schema/user";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { postMarkdownComponents } from "./markdown-renderers";
import { PostInteractions } from "./PostInteractions";

const cardDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});

interface PostCardProps {
  post: SPost & {
    author: SUser;
    createdAt: Date;
  };
  currentUserId?: string;
}

export function PostCard({ post, currentUserId }: PostCardProps) {
  const router = useRouter();

  return (
    <Card
      className="p-6 mb-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => router.push(`/posts/${post._id}`)}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => router.push(`/posts/${post._id}`)}
            >
              {post.title}
            </h3>
            <p className="text-sm text-gray-500">
              By {post.author.name}
              {post.author.isAdmin && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  Admin
                </span>
              )}
            </p>
          </div>
          <div className="text-sm text-gray-400">
            {cardDateFormatter.format(new Date(post.createdAt))}
          </div>
        </div>

        <Markdown
          remarkPlugins={[remarkGfm]}
          components={postMarkdownComponents}
        >
          {post.body.content}
        </Markdown>

        <PostInteractions
          postId={post._id}
          initialLikes={post.interactions.likes.length}
          initialForwards={post.interactions.forwards.length}
          commentsCount={post.interactions.comments.length}
          initialLiked={currentUserId ? post.interactions.likes.includes(currentUserId) : false}
          initialForwarded={currentUserId ? post.interactions.forwards.includes(currentUserId) : false}
          onCommentClick={() => router.push(`/posts/${post._id}`)}
        />
      </div>
    </Card>
  );
}

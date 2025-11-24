"use client";

import { Card } from "@/components/ui/card";
import { QPost } from "@/schema/post";
import { QUser } from "@/schema/user";
import { incrementPostLikes, incrementPostForwards } from "@/app/actions/post";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface PostCardProps {
  post: QPost & {
    author: QUser;
    createdAt: Date;
  };
}

/**
 * A card displaying a post, with like, forward and comment buttons
 * @param post: The post to display
 * @returns
 */
export function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const [likes, setLikes] = useState(post.interactions.likes.length);
  const [forwards, setForwards] = useState(post.interactions.forwards.length);
  const [liked, setLiked] = useState(false);
  const [forwarded, setIsForwarding] = useState(false);

  const handleLike = async () => {
    if (liked) return;

    setLiked(true);
    const result = await incrementPostLikes(post._id);
    if (result.success) {
      setLikes(result.likes);
    }
    setLiked(false);
  };

  const handleForward = async () => {
    if (forwarded) return;

    setIsForwarding(true);
    const result = await incrementPostForwards(post._id);
    if (result.success) {
      setForwards(result.forwards);
    }
    setIsForwarding(false);
  };

  const handleComment = () => {
    router.push(`/posts/${post._id}`);
  };

  return (
    <Card className="p-6 mb-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
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
            {post.createdAt.toLocaleDateString()}
          </div>
        </div>

        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
                {children}
              </h1>
            ),

            h2: ({ children }) => (
              <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight">
                {children}
              </h2>
            ),

            p: ({ children }) => (
              <p className="leading-7 [&:not(:first-child)]:mt-6">{children}</p>
            ),

            ul: ({ children }) => (
              <ul className="my-6 ml-6 list-disc">{children}</ul>
            ),

            code(props) {
              const { children, className, node, ...rest } = props;
              const match = /language-(\w+)/.exec(className || "");
              return match ? (
                <SyntaxHighlighter
                  {...rest}
                  PreTag="div"
                  language={match[1]}
                  style={dark}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code {...rest} className={className}>
                  {children}
                </code>
              );
            },

            blockquote: ({ children }) => (
              <blockquote className="mt-6 border-l-2 pl-6 italic">
                {children}
              </blockquote>
            ),

            table: ({ children }) => (
              <div className="my-6 w-full overflow-x-auto">
                <table className="w-full text-sm">{children}</table>
              </div>
            ),

            th: ({ children }) => (
              <th className="border px-3 py-2 font-semibold">{children}</th>
            ),

            td: ({ children }) => (
              <td className="border px-3 py-2">{children}</td>
            ),
          }}
        >
          {post.body.content}
        </Markdown>

        <div className="flex items-center space-x-6 text-sm text-gray-500">
          <button
            onClick={handleLike}
            disabled={liked}
            className="flex items-center space-x-1 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Heart className={`h-4 w-4 ${liked ? "animate-pulse" : ""}`} />
            <span>{likes} likes</span>
          </button>

          <button
            onClick={handleForward}
            disabled={forwarded}
            className="flex items-center space-x-1 hover:text-blue-500 transition-colors disabled:opacity-50"
          >
            <Share2 className={`h-4 w-4 ${forwarded ? "animate-pulse" : ""}`} />
            <span>{forwards} forwards</span>
          </button>

          <button
            onClick={handleComment}
            className="flex items-center space-x-1 hover:text-green-500 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{post.interactions.comments.length} comments</span>
          </button>
        </div>
      </div>
    </Card>
  );
}

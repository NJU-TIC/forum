"use client";
import { Card } from "@/components/ui/card";
import { QPost, PostComment as OriginalPostComment } from "@/schema/post";
import { QUser } from "@/schema/user";
import { useState } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import {
  incrementPostLikes,
  incrementPostForwards,
  addCommentAction,
} from "@/app/actions/post";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";

type PopulatedPostComment = Omit<OriginalPostComment, "author"> & {
  author: QUser | null;
};

type PopulatedQPost = Omit<QPost, "author" | "interactions"> & {
  author: QUser;
  interactions: {
    comments: PopulatedPostComment[];
    likes: string[];
    forwards: string[];
  };
};

interface PostDetailProps {
  post: PopulatedQPost;
  // currentUserId is used to decide whether to show edit controls.
  currentUserId?: string;
}

export function PostDetail({ post, currentUserId }: PostDetailProps) {
  const [likes, setLikes] = useState(post.interactions?.likes?.length || 0);
  const [forwards, setForwards] = useState(
    post.interactions?.forwards?.length || 0,
  );
  const [comments, setComments] = useState<PopulatedPostComment[]>(
    post.interactions?.comments || [],
  );
  const [newComment, setNewComment] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);
    const result = await incrementPostLikes(post._id as string);
    if (result.success) {
      setLikes(result.data);
    }
    setIsLiking(false);
  };

  const handleForward = async () => {
    if (isForwarding) return;

    setIsForwarding(true);
    const result = await incrementPostForwards(post._id as string);
    if (result.success) {
      setForwards(result.data);
    }
    setIsForwarding(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isAddingComment) return;

    setIsAddingComment(true);
    const result = await addCommentAction(
      post._id as string,
      newComment.trim(),
    );
    if (result.success) {
      setComments(result.data.comments as PopulatedPostComment[]);
      setNewComment("");
    }
    setIsAddingComment(false);
  };

  return (
    <div className="space-y-6">
      {/* Post Content */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
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
              {new Date(post.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
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
                <p className="leading-7 [&:not(:first-child)]:mt-6">
                  {children}
                </p>
              ),

              ul: ({ children }) => (
                <ul className="my-6 ml-6 list-disc">{children}</ul>
              ),

              code(props) {
                const { children, className, node, ...rest } = props;
                const match = /language-(\w+)/.exec(className || "");
                return match ? (
                  <SyntaxHighlighter
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

          {/* Render attached images if present. */}
          {post.body.images && post.body.images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {post.body.images.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={`Post image ${idx + 1}`}
                  className="w-full rounded-lg border object-cover"
                />
              ))}
            </div>
          )}

          <div className="flex items-center space-x-6 text-sm text-gray-500 pt-4 border-t">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className="flex items-center space-x-1 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <Heart className={`h-4 w-4 ${isLiking ? "animate-pulse" : ""}`} />
              <span>{likes || 0} likes</span>
            </button>

            <button
              onClick={handleForward}
              disabled={isForwarding}
              className="flex items-center space-x-1 hover:text-blue-500 transition-colors disabled:opacity-50"
            >
              <Share2
                className={`h-4 w-4 ${isForwarding ? "animate-pulse" : ""}`}
              />
              <span>{forwards || 0} forwards</span>
            </button>

            <div className="flex items-center space-x-1">
              <MessageCircle className="h-4 w-4" />
              <span>{comments?.length || 0} comments</span>
            </div>

            {currentUserId && currentUserId === post.author._id && (
              <a
                href={`/posts/${post._id}/edit`}
                className="text-blue-600 hover:underline"
              >
                Edit post
              </a>
            )}
          </div>
        </div>
      </Card>

      {/* Comments Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments</h2>

        {/* Add Comment Form */}
        <form onSubmit={handleAddComment} className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isAddingComment}
            />
            <button
              type="submit"
              disabled={isAddingComment || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingComment ? "Adding..." : "Add Comment"}
            </button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment, index) => (
              <div key={index} className="border-l-2 border-gray-200 pl-4 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-900">
                    {getCommentAuthorDisplay(comment.author)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {comment.createdAt
                      ? new Date(comment.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )
                      : ""}
                  </span>
                </div>
                <p className="text-gray-700">{comment.body.content}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

// Added: normalize comment author display using name when available.
function getCommentAuthorDisplay(author: QUser | null) {
  if (!author) {
    return "Unknown";
  }
  return author.name;
}

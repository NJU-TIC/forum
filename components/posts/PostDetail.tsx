"use client";
import { Card } from "@/components/ui/card";
import { SPost, PostComment as OriginalPostComment } from "@/schema/post";
import { SUser } from "@/schema/user";
import { useState } from "react";
import { addCommentAction } from "@/app/actions/post";
import { PostInteractions } from "./PostInteractions";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { PostHeader } from "./PostHeader";
import { detailDateFormatter } from "@/lib/formatters";

type PopulatedPostComment = Omit<OriginalPostComment, "author"> & {
  author: SUser | null;
};

type PopulatedQPost = Omit<SPost, "author" | "interactions"> & {
  author: SUser;
  interactions: {
    comments: PopulatedPostComment[];
    likes: string[];
    forwards: string[];
  };
};

interface PostDetailProps {
  post: PopulatedQPost;
  currentUserId?: string;
}

export function PostDetail({ post, currentUserId }: PostDetailProps) {
  const [comments, setComments] = useState<PopulatedPostComment[]>(
    post.interactions?.comments || [],
  );
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isAddingComment) return;

    setIsAddingComment(true);
    const result = await addCommentAction(
      post._id.toString(),
      newComment.trim(),
    );
    if (result.success) {
      setComments(result.data.comments as PopulatedPostComment[]);
      setNewComment("");
    }
    setIsAddingComment(false);
  };

  const isAuthor =
    currentUserId && currentUserId === post.author._id.toString();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <PostHeader
            title={post.title}
            author={post.author}
            createdAt={post.createdAt}
            dateFormatter={detailDateFormatter}
            titleClassName="text-2xl font-bold text-gray-900"
          />

          <MarkdownRenderer content={post.body.content} />

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

          <div className="pt-4 border-t">
            <PostInteractions
              postId={post._id.toString()}
              initialLikes={post.interactions?.likes?.length || 0}
              initialForwards={post.interactions?.forwards?.length || 0}
              commentsCount={comments.length}
              initialLiked={
                currentUserId
                  ? post.interactions?.likes?.includes(currentUserId)
                  : false
              }
              initialForwarded={
                currentUserId
                  ? post.interactions?.forwards?.includes(currentUserId)
                  : false
              }
              showEditLink={!!isAuthor}
              editHref={`/posts/${post._id.toString()}/edit`}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">评论</h2>

        <form onSubmit={handleAddComment} className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="说点什么吧..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isAddingComment}
            />
            <button
              type="submit"
              disabled={isAddingComment || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingComment ? "发送中..." : "发表评论"}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              暂无评论。来发表第一条评论吧！
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
                      ? detailDateFormatter.format(new Date(comment.createdAt))
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

function getCommentAuthorDisplay(author: SUser | null) {
  if (!author) {
    return "未知用户";
  }
  return author.name;
}

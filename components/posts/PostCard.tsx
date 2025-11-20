"use client";

import { Card } from "@/components/ui/card";
import { QPost } from "@/schema/post";
import { QUser } from "@/schema/user";
import { incrementPostLikes, incrementPostForwards } from "@/app/actions/post";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Share2 } from "lucide-react";

interface PostCardProps {
  post: QPost & {
    author: QUser;
    createdAt: Date;
  };
}

export function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const [likes, setLikes] = useState(post.interactions.likes);
  const [forwards, setForwards] = useState(post.interactions.forwards);
  const [isLiking, setIsLiking] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);
    try {
      const result = await incrementPostLikes(post._id);
      if (result.success) {
        setLikes(result.likes);
      }
    } catch (error) {
      console.error("Error liking post:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleForward = async () => {
    if (isForwarding) return;

    setIsForwarding(true);
    try {
      const result = await incrementPostForwards(post._id);
      if (result.success) {
        setForwards(result.forwards);
      }
    } catch (error) {
      console.error("Error forwarding post:", error);
    } finally {
      setIsForwarding(false);
    }
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

        <div className="text-gray-700">{post.body.content}</div>

        <div className="flex items-center space-x-6 text-sm text-gray-500">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className="flex items-center space-x-1 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Heart className={`h-4 w-4 ${isLiking ? "animate-pulse" : ""}`} />
            <span>{likes} likes</span>
          </button>

          <button
            onClick={handleForward}
            disabled={isForwarding}
            className="flex items-center space-x-1 hover:text-blue-500 transition-colors disabled:opacity-50"
          >
            <Share2
              className={`h-4 w-4 ${isForwarding ? "animate-pulse" : ""}`}
            />
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

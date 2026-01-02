"use client";

import { useState } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import {
  togglePostLike,
  togglePostForward,
} from "@/app/actions/post";

interface PostInteractionsProps {
  postId: string;
  initialLikes: number;
  initialForwards: number;
  commentsCount: number;
  initialLiked?: boolean;
  initialForwarded?: boolean;
  onCommentClick?: () => void;
  showEditLink?: boolean;
  editHref?: string;
}

export function PostInteractions({
  postId,
  initialLikes,
  initialForwards,
  commentsCount,
  initialLiked = false,
  initialForwarded = false,
  onCommentClick,
  showEditLink,
  editHref,
}: PostInteractionsProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [forwards, setForwards] = useState(initialForwards);
  const [liked, setLiked] = useState(initialLiked);
  const [forwarded, setForwarded] = useState(initialForwarded);
  const [likeLoading, setLikeLoading] = useState(false);
  const [forwardLoading, setForwardLoading] = useState(false);

  const handleLike = async () => {
    if (likeLoading) return;

    setLikeLoading(true);
    const result = await togglePostLike(postId);
    if (result.success) {
      setLikes(result.data.count);
      setLiked(result.data.liked);
    } else if (result.error) {
      alert(result.error);
    }
    setLikeLoading(false);
  };

  const handleForward = async () => {
    if (forwardLoading) return;

    setForwardLoading(true);
    const result = await togglePostForward(postId);
    if (result.success) {
      setForwards(result.data.count);
      setForwarded(result.data.forwarded);
    } else if (result.error) {
      alert(result.error);
    }
    setForwardLoading(false);
  };

  return (
    <div className="flex items-center space-x-6 text-sm text-gray-500">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleLike();
        }}
        disabled={likeLoading}
        className={`flex items-center space-x-1 transition-colors ${liked ? "text-red-500" : "hover:text-red-500"} disabled:opacity-50`}
      >
        <Heart className={`h-4 w-4 ${likeLoading ? "animate-pulse" : ""} ${liked ? "fill-current" : ""}`} />
        <span>{likes} likes</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleForward();
        }}
        disabled={forwardLoading}
        className={`flex items-center space-x-1 transition-colors ${forwarded ? "text-blue-500" : "hover:text-blue-500"} disabled:opacity-50`}
      >
        <Share2 className={`h-4 w-4 ${forwardLoading ? "animate-pulse" : ""} ${forwarded ? "fill-current" : ""}`} />
        <span>{forwards} forwards</span>
      </button>

      {onCommentClick ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCommentClick();
          }}
          className="flex items-center space-x-1 hover:text-green-500 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{commentsCount} comments</span>
        </button>
      ) : (
        <div className="flex items-center space-x-1">
          <MessageCircle className="h-4 w-4" />
          <span>{commentsCount} comments</span>
        </div>
      )}

      {showEditLink && editHref && (
        <a
          href={editHref}
          className="text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Edit post
        </a>
      )}
    </div>
  );
}

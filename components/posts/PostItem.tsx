'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

interface PostItemProps {
  post: {
    _id: string;
    content: string;
    author: {
      _id: string;
      email: string;
      isAdmin: boolean;
    };
    likes: string[];
    bookmarks: string[];
    shares: string[];
    createdAt: string | Date;
  };
  onDelete: (postId: string) => void;
}

export default function PostItem({ post, onDelete }: PostItemProps) {
  const { user, token } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(post.likes.length);
  const [bookmarksCount, setBookmarksCount] = useState(post.bookmarks.length);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (user) {
      setIsLiked(post.likes.includes(user._id));
      setIsBookmarked(post.bookmarks.includes(user._id));
    }
  }, [user, post]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${post._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });


      if (response.ok) {
        onDelete(post._id);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete post');
      }
    } catch (err) {
      setError('An error occurred while deleting the post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLike = async () => {
    if (!token) {
      alert('Please login to like posts');
      return;
    }

    try {
      const response = await fetch(`/api/posts/${post._id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const { likesCount } = await response.json();
        setLikesCount(likesCount);
        setIsLiked(!isLiked);
      }
    } catch (err) {
      console.error('Like failed', err);
    }
  };

  const handleBookmark = async () => {
    if (!token) {
      alert('Please login to bookmark posts');
      return;
    }

    try {
      const response = await fetch(`/api/posts/${post._id}/bookmark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const { bookmarksCount } = await response.json();
        setBookmarksCount(bookmarksCount);
        setIsBookmarked(!isBookmarked);
      }
    } catch (err) {
      console.error('Bookmark failed', err);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check this post out',
          text: post.content,
          url: window.location.origin + '/post/' + post._id,
        });
      } else {
        await navigator.clipboard.writeText(window.location.origin + '/post/' + post._id);
        alert('Post URL copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const isAuthor = user && user._id === post.author._id;
  const isAdmin = user?.isAdmin;

  const formattedDate = new Date(post.createdAt).toLocaleString();

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      <div className="flex items-start">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{post.author.email.split('@')[0]}</h3>
              {post.author.isAdmin && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded ml-2">
                  Admin
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">{formattedDate}</span>
          </div>
          <p className="mt-2 text-gray-700 whitespace-pre-wrap">{post.content}</p>

          <div className="mt-4 flex items-center space-x-4">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-1 ${isLiked ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>

            <button
              onClick={handleBookmark}
              className={`flex items-center space-x-1 ${isBookmarked ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l7-3 7 3V4a2 2 0 00-2-2H5z" clipRule="evenodd" />
              </svg>
              {bookmarksCount > 0 && <span>{bookmarksCount}</span>}
            </button>

            <button
              onClick={handleShare}
              className="flex items-center space-x-1 text-gray-500 hover:text-green-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                <path d="M19.325 9.585a1 1 0 00-1.22-.538A10.027 10.027 0 0112 14c-4.236 0-7.94-2.657-9.115-6.415a1 1 0 00-1.22.538 11.945 11.945 0 0021.036 0z" />
              </svg>
              <span>Share</span>
            </button>
          </div>
        </div>
        {isAuthor || isAdmin ? (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-700"
          >
            {isDeleting ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
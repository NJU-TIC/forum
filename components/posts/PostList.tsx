'use client';

import { useEffect, useState } from 'react';
import PostItem from './PostItem';

interface PostListProps {
  initialPosts?: any[];
}

export default function PostList({ initialPosts = [] }: PostListProps) {
  const [posts, setPosts] = useState<any[]>(initialPosts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        const response = await fetch('/api/posts');
        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }
        const data = await response.json();
        setPosts(data);
      } catch (err) {
        setError('Error loading posts');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (initialPosts.length === 0) {
      fetchPosts();
    }
  }, [initialPosts]);

  const handleDelete = (deletedPostId: string) => {
    setPosts(posts => posts.filter(post => post._id !== deletedPostId));
  };

  if (loading) {
    return <div className="text-center py-8">Loading posts...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostItem
          key={post._id}
          post={post}
          onDelete={handleDelete}
        />
      ))}
      {posts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No posts yet. Be the first to create one!
        </div>
      )}
    </div>
  );
}
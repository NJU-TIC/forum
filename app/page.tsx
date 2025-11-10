'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useAuth } from '@/components/auth/AuthProvider';
import CreatePostForm from '@/components/posts/CreatePostForm';
import PostList from '@/components/posts/PostList';

export default function Home() {
  const { user, token } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      const fetchPosts = async () => {
        try {
          const response = await fetch('/api/posts');
          if (response.ok) {
            const data = await response.json();
            setPosts(data);
          }
        } catch (error) {
          console.error('Failed to fetch posts:', error);
        }
      };

      fetchPosts();
    }
  }, [token]);
  const handlePostCreated = (post: any) => {
    setPosts(prev => [post, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {token ? <CreatePostForm onPostCreated={handlePostCreated} /> : (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Please log in to post
            </h2>
            <p className="text-gray-600 mb-4">
              Sign in to create new posts and join discussions
            </p>
          </div>
        )}
        <PostList initialPosts={posts} />
      </main>
    </div>
  );
}
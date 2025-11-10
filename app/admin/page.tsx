'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useAuth } from '@/components/auth/AuthProvider';
import PostItem from '@/components/posts/PostItem';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user?.isAdmin) {
      // Redirect to home or show error
      return;
    }

    async function fetchPosts() {
      try {
        setLoading(true);
        const response = await fetch('/api/posts', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });


        if (response.ok) {
          const data = await response.json();
          setPosts(data);
        } else {
          setError('Failed to fetch posts');
        }
      } catch (err) {
        setError('Error loading posts');
      } finally {
        setLoading(false);
      }
    }


    fetchPosts();
  }, [token, user]);

  const handleDelete = async (postId: string) => {
    try {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setPosts(posts => posts.filter(post => post._id !== postId));
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete post');
      }
    } catch (err) {
      alert('An error occurred while deleting the post');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h2>
            <p className="text-gray-600 mb-6">Please log in to access the admin dashboard</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h2>
            <p className="text-gray-600 mb-6">You don't have admin privileges to access this dashboard</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="text-sm text-gray-500">
            {user.email} (Admin)
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-md">
            {error}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">No posts found</h3>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post._id} className="flex items-center">
                <div className="flex-1">
                  <PostItem
                    post={post}
                    onDelete={() => {}} // Admin will handle deletion
                  />
                </div>
                <button
                  onClick={() => handleDelete(post._id)}
                  className="ml-4 text-red-500 hover:text-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
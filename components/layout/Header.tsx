'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { useState } from 'react';
import AuthModal from '@/components/auth/AuthModal';

export default function Header() {
  const { user, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleLogin = (token: string, user: { _id: string; email: string; isAdmin: boolean }) => {
    // Login handled by AuthProvider
  };

  return (
    <>
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">NJU-TIC Forum</h1>
            </Link>
            <nav className="flex items-center space-x-8">
              {user ? (
                <>
                  <span className="text-gray-700">Welcome, {user.email.split('@')[0]}</span>
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
      />
    </>
  );
}
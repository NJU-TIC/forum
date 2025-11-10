'use client';

import { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (token: string, user: { _id: string; email: string; isAdmin: boolean }) => void;
}

export default function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [isLoginView, setIsLoginView] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoginView(true);
    }
  }, [isOpen]);
  const handleRegisterSuccess = () => {
    setIsLoginView(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 z-50">
          <div>
            <div className="mt-3 sm:mt-0 sm:ml-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isLoginView ? 'Log in to your account' : 'Create a new account'}
              </h3>
              <div className="mt-2">
                {isLoginView ? (
                  <LoginForm onLogin={(token, user) => {
                    onLogin(token, user);
                    onClose();
                  }} />
                ) : (
                  <RegisterForm onRegister={handleRegisterSuccess} />
                )}
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => setIsLoginView(!isLoginView)}
                  >
                    {isLoginView
                      ? 'Need an account? Register'
                      : 'Already have an account? Log in'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
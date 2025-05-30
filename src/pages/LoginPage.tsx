
import React from 'react';
import { Navigate } from 'react-router-dom';
import AuthModal from '../components/auth/AuthModal';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const { isAuthenticated } = useUser();
  const { loading } = useAuth();

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caregrowth-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthModal />;
};

export default LoginPage;

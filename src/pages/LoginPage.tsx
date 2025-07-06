
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AuthModal from '../components/auth/AuthModal';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const { isAuthenticated } = useUser();
  const { loading, user } = useAuth();
  const location = useLocation();
  
  // Check if user came from registration success page
  const fromRegistration = location.state?.fromRegistration;

  // Show loading state while auth is initializing - this prevents the flash
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caregrowth-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only redirect to dashboard if authenticated AND not coming from registration
  // This allows users from registration success to see the login form
  // Check both UserContext (isAuthenticated) and AuthContext (user) to handle timing issues
  if ((isAuthenticated || user) && !fromRegistration) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthModal />;
};

export default LoginPage;

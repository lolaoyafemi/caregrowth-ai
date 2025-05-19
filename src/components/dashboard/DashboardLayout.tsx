
import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';
import AuthModal from '../auth/AuthModal';

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(!isAuthenticated);

  const handleLogin = (email: string, password: string) => {
    // In a real app, this would validate against a backend
    console.log('Login attempt with:', email, password);
    if (email && password) {
      setIsAuthenticated(true);
      setAuthModalOpen(false);
    }
  };

  const handleSignup = (email: string, password: string, name: string) => {
    // In a real app, this would create a user account
    console.log('Signup attempt with:', email, password, name);
    if (email && password && name) {
      setIsAuthenticated(true);
      setAuthModalOpen(false);
    }
  };

  return (
    <>
      {isAuthenticated ? (
        <div className="flex h-screen">
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <DashboardHeader />
            <main className="flex-1 overflow-auto bg-gray-50">
              <Outlet />
            </main>
          </div>
        </div>
      ) : (
        <AuthModal 
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLogin={handleLogin}
          onSignup={handleSignup}
        />
      )}
    </>
  );
};

export default DashboardLayout;

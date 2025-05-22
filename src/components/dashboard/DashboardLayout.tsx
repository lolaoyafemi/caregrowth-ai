
import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';
import AuthModal from '../auth/AuthModal';
import { useUser, User, UserRole } from '../../contexts/UserContext';
import { toast } from "@/hooks/use-toast";

// Mock user data for demonstration
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Super Admin',
    email: 'admin@caregrowth.ai',
    role: 'super_admin'
  },
  {
    id: '2',
    name: 'Agency Owner',
    email: 'agency@example.com',
    role: 'agency_admin',
    agencyId: 'agency1'
  },
  {
    id: '3',
    name: 'Marketing Lead',
    email: 'marketing@example.com',
    role: 'marketing',
    agencyId: 'agency1'
  }
];

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(true);
  const { user, isAuthenticated, setUser } = useUser();
  const navigate = useNavigate();

  const handleLogin = (email: string, password: string) => {
    // In a real app, this would validate against a backend
    console.log('Login attempt with:', email, password);
    const foundUser = mockUsers.find(u => u.email === email);
    
    if (foundUser && password) {
      setUser(foundUser);
      setAuthModalOpen(false);
      
      // Welcome toast based on role
      const welcomeMessage = foundUser.role === 'super_admin' 
        ? 'Welcome to the Super Admin Dashboard' 
        : `Welcome to your ${foundUser.role.replace('_', ' ')} Dashboard`;
      
      toast({
        title: "Login Successful",
        description: welcomeMessage
      });
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid email or password",
        variant: "destructive"
      });
    }
  };

  const handleSignup = (email: string, password: string, name: string) => {
    // In a real app, this would create a user account
    console.log('Signup attempt with:', email, password, name);
    if (email && password && name) {
      // For demo purposes, create a new agency admin
      const newUser: User = {
        id: `user_${Date.now()}`,
        name,
        email,
        role: 'agency_admin',
        agencyId: `agency_${Date.now()}`
      };
      
      setUser(newUser);
      setAuthModalOpen(false);
      toast({
        title: "Account Created",
        description: "Welcome to CareGrowthAI!"
      });
    }
  };

  return (
    <>
      {isAuthenticated ? (
        <div className="flex h-screen">
          <Sidebar 
            collapsed={collapsed} 
            setCollapsed={setCollapsed} 
            userRole={user?.role} 
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <DashboardHeader userRole={user?.role} userName={user?.name} />
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

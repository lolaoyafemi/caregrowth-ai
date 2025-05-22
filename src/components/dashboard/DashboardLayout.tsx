
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
    // Super Admin login validation
    if (email === 'admin@caregrowth.ai' && password === 'SuperAdmin') {
      setUser(mockUsers[0]); // Set as Super Admin
      setAuthModalOpen(false);
      
      toast({
        title: "Super Admin Login Successful",
        description: "Welcome to the Super Admin Dashboard",
        variant: "default"
      });
      return;
    }
    
    // Agency admin validation - check if email contains @ and ends with .something
    // This will accept any valid email format (gmail, yahoo, etc.)
    const emailRegex = /.+@.+\..+/;
    if (emailRegex.test(email) && password) {
      // Find existing user or create a new agency admin
      const foundUser = mockUsers.find(u => u.email === email);
      
      if (foundUser) {
        setUser(foundUser);
      } else {
        // Create a new agency admin user
        const newUser: User = {
          id: `user_${Date.now()}`,
          name: email.split('@')[0], // Use part of email as name
          email,
          role: 'agency_admin',
          agencyId: `agency_${Date.now()}`
        };
        setUser(newUser);
      }
      
      setAuthModalOpen(false);
      toast({
        title: "Agency Admin Login Successful",
        description: "Welcome to your Agency Dashboard",
        variant: "default"
      });
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid email or password format",
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
        title: "Agency Admin Account Created",
        description: "Welcome to CareGrowthAI! You've been registered as an Agency Admin."
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
            <main className={`flex-1 overflow-auto ${user?.role === 'super_admin' ? 'bg-purple-50/30' : 'bg-gray-50'}`}>
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


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
      let welcomeMessage = '';
      let variant: 'default' | 'destructive' = 'default';
      
      if (foundUser.role === 'super_admin') {
        welcomeMessage = 'Welcome to the Super Admin Dashboard';
        variant = 'default';
      } else {
        welcomeMessage = `Welcome to your ${foundUser.role.replace('_', ' ')} Dashboard`;
      }
      
      toast({
        title: `Login Successful - ${foundUser.role === 'super_admin' ? 'Super Admin' : 'Agency Admin'}`,
        description: welcomeMessage,
        variant: variant
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
      
      {/* Login Role Hint for Demo Purposes */}
      {!isAuthenticated && (
        <div className="fixed bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 text-sm">
          <h3 className="font-semibold mb-2">Demo Login Credentials:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-2 rounded bg-purple-50 border border-purple-200">
              <p className="font-semibold text-purple-800">Super Admin:</p>
              <p>Email: admin@caregrowth.ai</p>
              <p>Password: any password</p>
            </div>
            <div className="p-2 rounded bg-blue-50 border border-blue-200">
              <p className="font-semibold text-blue-800">Agency Admin:</p>
              <p>Email: agency@example.com</p>
              <p>Password: any password</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardLayout;

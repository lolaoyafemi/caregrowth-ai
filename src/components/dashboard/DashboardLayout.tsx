
import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';
import { useUser } from '../../contexts/UserContext';
import { useAuth } from '../../contexts/AuthContext';

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user: userContextUser, isAuthenticated } = useUser();
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

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        userRole={userContextUser?.role} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader userRole={userContextUser?.role} userName={userContextUser?.name} />
        <main className={`flex-1 overflow-auto ${userContextUser?.role === 'super_admin' ? 'bg-green-50/30' : 'bg-gray-50'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

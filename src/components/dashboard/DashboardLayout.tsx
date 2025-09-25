import React, { useState, memo, Suspense } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';
import { useUser } from '../../contexts/UserContext';
import { useAuth } from '../../contexts/AuthContext';
import SupportNotificationListener from '../notifications/SupportNotificationListener';
import { useMemoryMonitoring } from '@/lib/performance';
import { logger } from '@/lib/logger';
// Optimized loading component
const DashboardLoadingScreen = memo(() => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading dashboard...</p>
    </div>
  </div>
));

// Dashboard outlet with error boundary
const DashboardOutlet = memo(() => (
  <Suspense fallback={
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  }>
    <Outlet />
  </Suspense>
));

const DashboardLayout = memo(() => {
  const [collapsed, setCollapsed] = useState(false);
  const { user: userContextUser, isAuthenticated } = useUser();
  const { loading } = useAuth();
  
  // Monitor memory usage in dashboard
  useMemoryMonitoring();

  if (loading) {
    return <DashboardLoadingScreen />;
  }

  if (!isAuthenticated) {
    logger.info('Unauthenticated user redirected to login');
    return <Navigate to="/login" replace />;
  }

  const isDarkMode = userContextUser?.role === 'super_admin';
  
  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        userRole={userContextUser?.role} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader 
          userRole={userContextUser?.role} 
          userName={userContextUser?.name} 
        />
        <main className={`flex-1 overflow-auto transition-colors duration-200 ${
          isDarkMode ? 'bg-emerald-50/30' : 'bg-background'
        }`}>
          <SupportNotificationListener />
          <DashboardOutlet />
        </main>
      </div>
    </div>
  );
});

export default DashboardLayout;

import React, { useState, useEffect, useCallback, memo, Suspense } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import DashboardHeader from './DashboardHeader';
import { useUser } from '../../contexts/UserContext';
import { useAuth } from '../../contexts/AuthContext';
import SupportNotificationListener from '../notifications/SupportNotificationListener';
import { useMemoryMonitoring } from '@/lib/performance';
import { logger } from '@/lib/logger';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const SCROLL_THRESHOLD = 60;

const DashboardLayout = memo(() => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fabVisible, setFabVisible] = useState(true);
  const { user: userContextUser, isAuthenticated } = useUser();
  const { loading } = useAuth();
  const isMobile = useIsMobile();
  
  // Monitor memory usage in dashboard
  useMemoryMonitoring();

  // Hide FAB on scroll (mobile/tablet only)
  useEffect(() => {
    if (!isMobile) return;
    let lastScrollY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          if (currentY > lastScrollY && currentY > SCROLL_THRESHOLD) {
            setFabVisible(false);
          } else {
            setFabVisible(true);
          }
          lastScrollY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isMobile]);

  // Close mobile sidebar on route change
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  if (loading) {
    return <DashboardLoadingScreen />;
  }

  if (!isAuthenticated) {
    logger.info('Unauthenticated user redirected to login');
    return <Navigate to="/login" replace />;
  }


  
  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar — always visible */}
      {!isMobile && (
        <Sidebar 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          userRole={userContextUser?.role} 
        />
      )}

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={closeMobile}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] shadow-2xl"
            >
              <Sidebar 
                collapsed={false} 
                setCollapsed={() => {}} 
                userRole={userContextUser?.role} 
              />
              <button
                onClick={closeMobile}
                className="absolute top-4 right-3 p-1.5 rounded-none bg-white/[0.06] text-white/50 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating action button — mobile/tablet only */}
      {isMobile && !mobileOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: fabVisible ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-6 left-5 z-40 h-12 w-12 flex items-center justify-center rounded-none bg-caregrowth-green/90 text-white shadow-lg shadow-caregrowth-green/20 active:scale-95 transition-transform"
        >
          <Menu size={20} />
        </motion.button>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader 
          userRole={userContextUser?.role} 
          userName={userContextUser?.name} 
        />
        <main className="flex-1 overflow-auto bg-[hsl(220,15%,8%)]">
          <SupportNotificationListener />
          <DashboardOutlet />
        </main>
      </div>
    </div>
  );
});

export default DashboardLayout;

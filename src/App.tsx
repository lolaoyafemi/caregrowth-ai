import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from './pages/Index';
// Removed legacy payment routes
import HelpPage from './pages/HelpPage';
import NotFound from './pages/NotFound';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import SocialMediaTool from './pages/SocialMediaTool';
import DocumentSearchTool from './pages/DocumentSearchTool';
import QAAssistantTool from './pages/QAAssistantTool';
import PromptsPage from './pages/PromptsPage';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import UsageMonitoringPage from './pages/admin/UsageMonitoringPage';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import TeamManagementPage from './pages/agency/TeamManagementPage';
import AgencyUsagePage from './pages/agency/AgencyUsagePage';
import KnowledgePage from './pages/KnowledgePage';
import LoginPage from './pages/LoginPage';
import RegistrationSuccessPage from './pages/RegistrationSuccessPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { UserProvider } from './contexts/UserContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SecurityProvider } from './components/security/SecurityProvider';
import { Toaster } from '@/components/ui/toaster';

// Create QueryClient instance
const queryClient = new QueryClient();

// Loading component to show during initial auth check
const AppLoadingScreen = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-caregrowth-blue mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Main app content that uses auth context
const AppContent = () => {
  const { loading } = useAuth();

  // Show loading screen during initial auth check
  if (loading) {
    return <AppLoadingScreen />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Toaster />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registration-success" element={<RegistrationSuccessPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {/* Legacy payment routes removed: unified Payment Link flow in use */}
          <Route path="/help" element={<HelpPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          
          {/* Dashboard routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="social-media" element={<SocialMediaTool />} />
            <Route path="document-search" element={<DocumentSearchTool />} />
            <Route path="qa-assistant" element={<QAAssistantTool />} />
            <Route path="prompts" element={<PromptsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            
            {/* Super Admin route */}
            <Route path="super-admin" element={<SuperAdminDashboard />} />
            
            {/* Admin routes */}
            <Route path="admin/users" element={<UserManagementPage />} />
            <Route path="admin/usage" element={<UsageMonitoringPage />} />
            
            {/* Agency routes */}
            <Route path="agency/team" element={<TeamManagementPage />} />
            <Route path="agency/usage" element={<AgencyUsagePage />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <AuthProvider>
          <SecurityProvider>
            <AppContent />
          </SecurityProvider>
        </AuthProvider>
      </UserProvider>
    </QueryClientProvider>
  );
};

export default App;
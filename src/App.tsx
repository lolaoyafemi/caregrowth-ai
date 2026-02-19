import React, { Suspense, lazy, memo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from './contexts/UserContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SecurityProvider } from './components/security/SecurityProvider';
import { Toaster } from '@/components/ui/toaster';
import GoogleOAuthCallbackListener from '@/components/drive/GoogleOAuthCallbackListener';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load components for better performance
const Index = lazy(() => import('./pages/Index'));
const StripePaymentPage = lazy(() => import('./pages/StripePaymentPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentCancelledPage = lazy(() => import('./pages/PaymentCancelledPage'));
const DashboardLayout = lazy(() => import('./components/dashboard/DashboardLayout'));
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const SocialMediaTool = lazy(() => import('./pages/SocialMediaTool'));
const ContentCalendarPage = lazy(() => import('./pages/ContentCalendarPage'));
const QAAssistantTool = lazy(() => import('./pages/QAAssistantTool'));
const PromptsPage = lazy(() => import('./pages/PromptsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const UsageMonitoringPage = lazy(() => import('./pages/admin/UsageMonitoringPage'));
const SuperAdminDashboard = lazy(() => import('./pages/admin/SuperAdminDashboard'));
const TeamManagementPage = lazy(() => import('./pages/agency/TeamManagementPage'));
const AgencyUsagePage = lazy(() => import('./pages/agency/AgencyUsagePage'));
const KnowledgePage = lazy(() => import('./pages/KnowledgePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegistrationSuccessPage = lazy(() => import('./pages/RegistrationSuccessPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

// Optimized QueryClient with better defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.status >= 400 && error?.status < 500 && ![408, 429].includes(error.status)) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Optimized loading component using semantic tokens
const AppLoadingScreen = memo(() => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
));

// Optimized loading fallback for lazy loaded components
const SuspenseFallback = memo(() => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
      <p className="text-sm text-muted-foreground">Loading page...</p>
    </div>
  </div>
));

// Main app content with optimizations
const AppContent = memo(() => {
  const { loading } = useAuth();

  if (loading) {
    return <AppLoadingScreen />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Toaster />
        <GoogleOAuthCallbackListener />
        <ErrorBoundary>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registration-success" element={<RegistrationSuccessPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route path="/success" element={<PaymentSuccessPage />} />
              <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
              <Route path="/stripe-payment" element={<StripePaymentPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              
              {/* Dashboard routes with nested lazy loading */}
              <Route path="/dashboard" element={
                <ErrorBoundary fallback={
                  <div className="flex h-screen items-center justify-center bg-background">
                    <div className="text-center">
                      <p className="text-destructive">Dashboard failed to load</p>
                      <button 
                        onClick={() => window.location.reload()} 
                        className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded"
                      >
                        Reload
                      </button>
                    </div>
                  </div>
                }>
                  <DashboardLayout />
                </ErrorBoundary>
              }>
                <Route index element={<DashboardHome />} />
                <Route path="social-media" element={<SocialMediaTool />} />
                {/* Content Calendar hidden - being built as standalone app */}
                <Route path="qa-assistant" element={<QAAssistantTool />} />
                <Route path="prompts" element={<PromptsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="help" element={<HelpPage />} />
                <Route path="knowledge" element={<KnowledgePage />} />
                <Route path="super-admin" element={<SuperAdminDashboard />} />
                <Route path="admin/users" element={<UserManagementPage />} />
                <Route path="admin/usage" element={<UsageMonitoringPage />} />
                <Route path="agency/team" element={<TeamManagementPage />} />
                <Route path="agency/usage" element={<AgencyUsagePage />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
});

const App = memo(() => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SecurityProvider>
          <UserProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </UserProvider>
        </SecurityProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
});

export default App;
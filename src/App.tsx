
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import SocialMediaTool from "./pages/SocialMediaTool";
import PromptsPage from "./pages/PromptsPage";
import DocumentSearchTool from "./pages/DocumentSearchTool";
import QAAssistantTool from "./pages/QAAssistantTool";
import NotFound from "./pages/NotFound";
import { UserProvider } from "./contexts/UserContext";

// Placeholder pages for new routes - these would be implemented fully in a real app
import UserManagementPage from "./pages/admin/UserManagementPage";
import UsageMonitoringPage from "./pages/admin/UsageMonitoringPage";
import ApiKeyManagementPage from "./pages/admin/ApiKeyManagementPage";
import TeamManagementPage from "./pages/agency/TeamManagementPage";
import AgencyUsagePage from "./pages/agency/AgencyUsagePage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            
            {/* Dashboard Routes */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              
              {/* Super Admin Routes */}
              <Route path="user-management" element={<UserManagementPage />} />
              <Route path="usage-monitoring" element={<UsageMonitoringPage />} />
              <Route path="api-keys" element={<ApiKeyManagementPage />} />
              
              {/* Agency Admin Routes */}
              <Route path="team-management" element={<TeamManagementPage />} />
              <Route path="agency-usage" element={<AgencyUsagePage />} />
              
              {/* Tool Routes */}
              <Route path="social-media" element={<SocialMediaTool />} />
              <Route path="document-search" element={<DocumentSearchTool />} />
              <Route path="qa-assistant" element={<QAAssistantTool />} />
              
              {/* General Routes */}
              <Route path="settings" element={<SettingsPage />} />
              <Route path="help" element={<HelpPage />} />
            </Route>
            
            {/* Not Found Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;

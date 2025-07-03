
import React from 'react';
import { useUser } from '../../contexts/UserContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, RefreshCw } from 'lucide-react';
import { useAdminData } from '@/hooks/useAdminData';
import SystemMetrics from '@/components/admin/SystemMetrics';
import RealtimeActivity from '@/components/admin/RealtimeActivity';
import OpenAIKeyManager from '@/components/admin/OpenAIKeyManager';
import CreditInventoryManager from '@/components/admin/CreditInventoryManager';
import CreditPricingControl from '@/components/admin/CreditPricingControl';

const SuperAdminDashboard = () => {
  const { user, hasPermission } = useUser();
  const { metrics, refetch: refetchAdminData } = useAdminData();

  // Check if user is super admin
  if (!hasPermission(['super_admin'])) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleRefreshAll = () => {
    refetchAdminData();
    // Force refresh of child components by reloading the page
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-green-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-green-700" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-gray-600">Credit Management & System Administration</p>
            </div>
          </div>
          <Button onClick={handleRefreshAll} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh All
          </Button>
        </div>

        {/* System Metrics */}
        <SystemMetrics metrics={metrics} />

        {/* Credit Inventory Summary */}
        <CreditInventoryManager />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Management Sections */}
          <div className="lg:col-span-2 space-y-6">
            {/* OpenAI API Key Manager */}
            <OpenAIKeyManager />

            {/* Credit Pricing Control */}
            <CreditPricingControl />
          </div>

          {/* Right Column - Real-time Activity */}
          <div>
            <RealtimeActivity />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;

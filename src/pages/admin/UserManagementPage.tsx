
import React from 'react';
import { useUser } from '@/contexts/UserContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Users, RefreshCw } from 'lucide-react';
import { useAdminData } from '@/hooks/useAdminData';
import UserManagementTable from '@/components/admin/UserManagementTable';
import SystemMetrics from '@/components/admin/SystemMetrics';
import RealtimeActivity from '@/components/admin/RealtimeActivity';

const UserManagementPage = () => {
  const { user, hasPermission } = useUser();
  const { 
    users, 
    metrics, 
    loading, 
    suspendUser, 
    activateUser, 
    deleteUser, 
    addCreditsToUser,
    refetch 
  } = useAdminData();
  
  // Only super admins can access this page
  if (!hasPermission(['super_admin'])) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-green-700" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600">Manage users, roles, and permissions</p>
            </div>
          </div>
          <Button onClick={refetch} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* System Metrics */}
        <SystemMetrics metrics={metrics} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Management Table */}
          <div className="lg:col-span-2">
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Users className="h-5 w-5" />
                  User Management ({users.length} users)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UserManagementTable
                  users={users}
                  onSuspendUser={suspendUser}
                  onActivateUser={activateUser}
                  onDeleteUser={deleteUser}
                  onAddCredits={addCreditsToUser}
                />
              </CardContent>
            </Card>
          </div>

          {/* Real-time Activity */}
          <div>
            <RealtimeActivity />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagementPage;

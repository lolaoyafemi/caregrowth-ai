
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, CreditCard, TrendingUp, Settings, Database, BookOpen, Wrench } from 'lucide-react';
import SystemMetrics from '@/components/admin/SystemMetrics';
import UserManagementTable from '@/components/admin/UserManagementTable';
import CreditManagement from '@/components/admin/CreditManagement';
import UsageAnalytics from '@/components/admin/UsageAnalytics';
import OpenAIKeyManager from '@/components/admin/OpenAIKeyManager';
import RealtimeActivity from '@/components/admin/RealtimeActivity';
import SharedDocumentManager from '@/components/admin/SharedDocumentManager';
import StuckPaymentFixer from '@/components/admin/StuckPaymentFixer';
import { useAdminData } from '@/hooks/useAdminData';

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const {
    users,
    agencies,
    metrics,
    loading,
    suspendUser,
    activateUser,
    deleteUser,
    addCreditsToUser,
    refetch
  } = useAdminData();

  const handleUpdateCredits = async (userId: string, credits: number) => {
    await addCreditsToUser(userId, credits);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            System administration and management tools
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Credits
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Knowledge
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Maintenance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <SystemMetrics metrics={metrics} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts, roles, and permissions
                </CardDescription>
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
          </TabsContent>

          <TabsContent value="credits" className="space-y-6">
            <CreditManagement onUpdateCredits={handleUpdateCredits} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <UsageAnalytics metrics={metrics} />
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-6">
            <SharedDocumentManager />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <OpenAIKeyManager />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <RealtimeActivity />
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Maintenance</CardTitle>
                <CardDescription>
                  Tools for fixing system issues and processing stuck payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <StuckPaymentFixer />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;


import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Shield, RefreshCw, BarChart3, CreditCard, Activity } from 'lucide-react';
import { useAdminData } from '@/hooks/useAdminData';
import { useUsageAnalytics } from '@/hooks/useUsageAnalytics';
import SystemMetrics from '@/components/admin/SystemMetrics';
import RealtimeActivity from '@/components/admin/RealtimeActivity';
import UsageAnalytics from '@/components/admin/UsageAnalytics';
import CreditManagement from '@/components/admin/CreditManagement';
import { toast } from 'sonner';

const UsageMonitoringPage = () => {
  const { user, hasPermission } = useUser();
  const { agencies, metrics, loading, refetch } = useAdminData();
  const { refetch: refetchAnalytics } = useUsageAnalytics();
  const [newAgencyName, setNewAgencyName] = useState('');
  const [newAgencyEmail, setNewAgencyEmail] = useState('');
  const [isAddingAgency, setIsAddingAgency] = useState(false);
  
  // Only super admins can access this page
  if (!hasPermission(['super_admin'])) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleAddAgency = async () => {
    if (!newAgencyName.trim() || !newAgencyEmail.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    console.log('Adding agency:', { name: newAgencyName, email: newAgencyEmail });
    toast.success('Agency added successfully');
    
    setNewAgencyName('');
    setNewAgencyEmail('');
    setIsAddingAgency(false);
    refetch();
  };

  const handleUpdateCredits = (userId: string, credits: number) => {
    console.log('Updating credits:', { userId, credits });
    refetch();
  };

  const handleRefresh = () => {
    refetch();
    refetchAnalytics();
    toast.success('Data refreshed');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading usage monitoring...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Usage Monitoring</h1>
              <p className="text-gray-600">Monitor system usage, performance, and credit management</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Dialog open={isAddingAgency} onOpenChange={setIsAddingAgency}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                  <PlusCircle className="h-4 w-4" />
                  Add Agency
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Agency</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="agencyName">Agency Name</Label>
                    <Input
                      id="agencyName"
                      value={newAgencyName}
                      onChange={(e) => setNewAgencyName(e.target.value)}
                      placeholder="Enter agency name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="agencyEmail">Admin Email</Label>
                    <Input
                      id="agencyEmail"
                      type="email"
                      value={newAgencyEmail}
                      onChange={(e) => setNewAgencyEmail(e.target.value)}
                      placeholder="Enter admin email"
                    />
                  </div>
                  <Button onClick={handleAddAgency} className="w-full bg-green-600 hover:bg-green-700">
                    Add Agency
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* System Metrics */}
        <SystemMetrics metrics={metrics} />

        {/* Main Content with Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Credit Management
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Real-time Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <UsageAnalytics metrics={metrics} />
          </TabsContent>

          <TabsContent value="credits" className="space-y-6">
            <CreditManagement onUpdateCredits={handleUpdateCredits} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RealtimeActivity />
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Current system status and performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium">API Response Time</span>
                      <span className="text-sm text-green-600">245ms</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium">Database Performance</span>
                      <span className="text-sm text-green-600">Excellent</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium">Credit Processing</span>
                      <span className="text-sm text-green-600">Operational</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium">Error Rate</span>
                      <span className="text-sm text-green-600">0.1%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UsageMonitoringPage;

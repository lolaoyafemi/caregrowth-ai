
import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Users, Building, TrendingUp, ChartBar, CircleDollarSign, BadgeDollarSign, Shield, RefreshCw, Trash2 } from 'lucide-react';
import { useAdminData } from '@/hooks/useAdminData';
import SystemMetrics from '@/components/admin/SystemMetrics';
import RealtimeActivity from '@/components/admin/RealtimeActivity';
import { toast } from 'sonner';

const UsageMonitoringPage = () => {
  const { user, hasPermission } = useUser();
  const { agencies, metrics, loading, refetch } = useAdminData();
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

    // Mock implementation - in a real app, you'd create the agency in the database
    console.log('Adding agency:', { name: newAgencyName, email: newAgencyEmail });
    toast.success('Agency added successfully');
    
    setNewAgencyName('');
    setNewAgencyEmail('');
    setIsAddingAgency(false);
    refetch();
  };

  const handleRemoveAgency = async (agencyId: string) => {
    if (!confirm('Are you sure you want to remove this agency?')) return;
    
    // Mock implementation
    console.log('Removing agency:', agencyId);
    toast.success('Agency removed successfully');
    refetch();
  };

  const handleToggleAgencyStatus = async (agencyId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    console.log('Toggling agency status:', agencyId, newStatus);
    toast.success(`Agency ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
    refetch();
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

  // Performance data with real metrics
  const performanceData = {
    tokensThisMonth: metrics.totalCreditsUsed,
    monthlyRevenue: metrics.monthlyRevenue,
    quarterlyRevenue: metrics.monthlyRevenue * 3,
    lifetimeRevenue: metrics.totalRevenue,
    topAgencies: agencies.slice(0, 3).map(agency => ({
      name: agency.name,
      spend: agency.credits_used * 0.01, // Mock pricing
      usage: agency.credits_used
    }))
  };

  return (
    <div className="min-h-screen bg-green-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-green-700" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Usage Monitoring</h1>
              <p className="text-gray-600">Monitor system usage and performance</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={refetch} variant="outline" className="gap-2">
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

        {/* Performance Overview */}
        <Card className="shadow-md border-t-4 border-t-green-600">
          <CardHeader className="flex flex-row items-center gap-2">
            <ChartBar className="h-6 w-6 text-green-600" />
            <div>
              <CardTitle>Platform Performance Overview</CardTitle>
              <CardDescription>Platform usage metrics and revenue insights</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-green-50 p-4 rounded-lg flex flex-col">
                <span className="text-sm text-gray-600">Total Tokens (This Month)</span>
                <div className="flex items-center mt-1">
                  <BadgeDollarSign className="h-5 w-5 mr-2 text-green-600" />
                  <span className="text-2xl font-semibold">{performanceData.tokensThisMonth.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg flex flex-col">
                <span className="text-sm text-gray-600">Monthly Revenue</span>
                <div className="flex items-center mt-1">
                  <CircleDollarSign className="h-5 w-5 mr-2 text-green-600" />
                  <span className="text-2xl font-semibold">${performanceData.monthlyRevenue.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg flex flex-col">
                <span className="text-sm text-gray-600">Lifetime Revenue</span>
                <div className="flex items-center mt-1">
                  <CircleDollarSign className="h-5 w-5 mr-2 text-green-600" />
                  <span className="text-2xl font-semibold">${performanceData.lifetimeRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              Top Performing Agencies
            </h3>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency Name</TableHead>
                  <TableHead>Monthly Spend</TableHead>
                  <TableHead>Token Usage</TableHead>
                  <TableHead>Auto-Renew</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.topAgencies.map((agency, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{agency.name}</TableCell>
                    <TableCell>${agency.spend.toLocaleString()}</TableCell>
                    <TableCell>{agency.usage.toLocaleString()}</TableCell>
                    <TableCell>
                      <Switch defaultChecked={index < 2} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agency Management */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Agency Management ({agencies.length} agencies)
                </CardTitle>
                <CardDescription>
                  Add, remove, and manage agencies on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agency</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Credits Used</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agencies.map((agency) => (
                        <TableRow key={agency.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center text-green-600 font-medium">
                                <Building className="h-5 w-5" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{agency.name}</div>
                                <div className="text-sm text-gray-500">{agency.admin_email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1 text-gray-500" />
                              <span>{agency.users_count}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <TrendingUp className="h-4 w-4 mr-1 text-gray-500" />
                              <span>{agency.credits_used.toLocaleString()}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {agency.last_active}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              agency.status === 'active' ? 'bg-green-100 text-green-800' : 
                              agency.status === 'suspended' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {agency.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleToggleAgencyStatus(agency.id, agency.status)}
                                className={agency.status === 'active' ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}
                              >
                                {agency.status === 'active' ? 'Suspend' : 'Activate'}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveAgency(agency.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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

export default UsageMonitoringPage;

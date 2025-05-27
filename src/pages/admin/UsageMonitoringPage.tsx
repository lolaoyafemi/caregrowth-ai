
import React from 'react';
import { useUser } from '@/contexts/UserContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Users, Building, TrendingUp, ChartBar, CircleDollarSign, BadgeDollarSign } from 'lucide-react';

const UsageMonitoringPage = () => {
  const { user, hasPermission } = useUser();
  
  // Only super admins can access this page
  if (!hasPermission(['super_admin'])) {
    return <Navigate to="/dashboard" replace />;
  }

  // Sample data for performance monitoring
  const performanceData = {
    tokensThisMonth: 2345678,
    monthlyRevenue: 14785.50,
    quarterlyRevenue: 43250.75,
    lifetimeRevenue: 197630.25,
    topAgencies: [
      { name: "Healthcare Solutions Ltd", spend: 4350.75, usage: 678500 },
      { name: "CarePlus Agency", spend: 3275.25, usage: 498700 },
      { name: "WellBeing Services", spend: 2980.50, usage: 425300 }
    ]
  };

  // Sample agency data
  const agencyData = [
    { name: 'Agency 1', users: 5, creditsUsed: 4000, lastActive: 'Today', status: 'Active' },
    { name: 'Agency 2', users: 3, creditsUsed: 3000, lastActive: 'Yesterday', status: 'Active' },
    { name: 'Agency 3', users: 7, creditsUsed: 2000, lastActive: 'Today', status: 'Active' },
    { name: 'Agency 4', users: 4, creditsUsed: 2780, lastActive: '3 days ago', status: 'Pending' },
    { name: 'Agency 5', users: 6, creditsUsed: 1890, lastActive: 'Today', status: 'Active' },
    { name: 'Agency 6', users: 8, creditsUsed: 2390, lastActive: 'Yesterday', status: 'Active' },
    { name: 'Agency 7', users: 2, creditsUsed: 3490, lastActive: 'Today', status: 'Active' },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Usage Monitoring</h1>
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Agency
        </Button>
      </div>

      {/* Performance Monitoring Section */}
      <Card className="shadow-md border-t-4 border-t-green-600 mb-6">
        <CardHeader className="flex flex-row items-center gap-2">
          <ChartBar className="h-6 w-6 text-green-600" />
          <div>
            <CardTitle>Platform Performance Overview</CardTitle>
            <CardDescription>
              Platform usage metrics and revenue insights
            </CardDescription>
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Agencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">24</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">128</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">API Credits Used (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">245,367</div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Agency Management</CardTitle>
          <CardDescription>
            Add, remove, and manage agencies on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agency
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credits Used
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {agencyData.map((agency, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center text-green-600 font-medium">
                          <Building className="h-5 w-5" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{agency.name}</div>
                          <div className="text-sm text-gray-500">{agency.name.toLowerCase().replace(' ', '')}@example.com</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-500" />
                        <span>{agency.users}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1 text-gray-500" />
                        <span>{agency.creditsUsed.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {agency.lastActive}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${agency.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {agency.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                      <button className="text-red-600 hover:text-red-900">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageMonitoringPage;

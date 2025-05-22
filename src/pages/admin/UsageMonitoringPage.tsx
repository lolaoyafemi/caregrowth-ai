
import React from 'react';
import { useUser } from '@/contexts/UserContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Sample data for the chart
const data = [
  { name: 'Agency 1', tokens: 4000 },
  { name: 'Agency 2', tokens: 3000 },
  { name: 'Agency 3', tokens: 2000 },
  { name: 'Agency 4', tokens: 2780 },
  { name: 'Agency 5', tokens: 1890 },
  { name: 'Agency 6', tokens: 2390 },
  { name: 'Agency 7', tokens: 3490 },
];

const UsageMonitoringPage = () => {
  const { user, hasPermission } = useUser();
  
  // Only super admins can access this page
  if (!hasPermission(['super_admin'])) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">System Usage Monitoring</h1>
      
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
            <CardTitle className="text-sm font-medium text-gray-500">API Tokens Used (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">245,367</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Token Usage by Agency</h2>
        <p className="text-sm text-gray-500 mb-4">As a Super Admin, you can monitor token usage across all agencies in the system.</p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              width={500}
              height={300}
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tokens" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">System-wide Recent Activity</h2>
        <p className="text-sm text-gray-500 mb-4">Monitor activities across all agencies.</p>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-b pb-3 last:border-0">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">Agency {i} generated social media content</p>
                  <p className="text-sm text-gray-500">Used 1,245 tokens</p>
                </div>
                <div className="text-sm text-gray-500">2 hours ago</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UsageMonitoringPage;


import React from 'react';
import { useUser } from '@/contexts/UserContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Sample data for the chart
const data = [
  { name: 'May 1', tokens: 4000 },
  { name: 'May 2', tokens: 3000 },
  { name: 'May 3', tokens: 2000 },
  { name: 'May 4', tokens: 2780 },
  { name: 'May 5', tokens: 1890 },
  { name: 'May 6', tokens: 2390 },
  { name: 'May 7', tokens: 3490 },
];

const AgencyUsagePage = () => {
  const { user, hasPermission } = useUser();
  
  // Only agency admins can access this page
  if (!hasPermission(['agency_admin'])) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Agency Usage Analytics</h1>
      <p className="text-gray-500 mb-6">As an Agency Admin, you can monitor your team's usage and activity.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Users (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">8</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">API Tokens Used (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">124,567</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Agency Token Usage (Last 7 Days)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
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
              <Area type="monotone" dataKey="tokens" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Usage by Tool</h2>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="py-2 text-left text-sm font-medium text-gray-500">Tool</th>
                <th className="py-2 text-right text-sm font-medium text-gray-500">Usage</th>
                <th className="py-2 text-right text-sm font-medium text-gray-500">Tokens</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-4 text-sm">Social Media Generator</td>
                <td className="py-4 text-sm text-right">42 generations</td>
                <td className="py-4 text-sm text-right">68,450</td>
              </tr>
              <tr>
                <td className="py-4 text-sm">Document Search</td>
                <td className="py-4 text-sm text-right">28 searches</td>
                <td className="py-4 text-sm text-right">34,721</td>
              </tr>
              <tr>
                <td className="py-4 text-sm">Q&A Assistant</td>
                <td className="py-4 text-sm text-right">85 questions</td>
                <td className="py-4 text-sm text-right">21,396</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Usage by Team Member</h2>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="py-2 text-left text-sm font-medium text-gray-500">User</th>
                <th className="py-2 text-left text-sm font-medium text-gray-500">Role</th>
                <th className="py-2 text-right text-sm font-medium text-gray-500">Tokens</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-4 text-sm">Agency Owner</td>
                <td className="py-4 text-sm">Agency Admin</td>
                <td className="py-4 text-sm text-right">45,320</td>
              </tr>
              <tr>
                <td className="py-4 text-sm">Marketing Lead</td>
                <td className="py-4 text-sm">Marketing</td>
                <td className="py-4 text-sm text-right">62,180</td>
              </tr>
              <tr>
                <td className="py-4 text-sm">HR Representative</td>
                <td className="py-4 text-sm">HR Admin</td>
                <td className="py-4 text-sm text-right">17,067</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AgencyUsagePage;

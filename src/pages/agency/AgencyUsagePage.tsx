
import React from 'react';
import { useUser } from '@/contexts/UserContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon, HelpCircle, Users, Coins, Settings } from 'lucide-react';

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
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Agency Usage Analytics</h1>
          <p className="text-gray-500">Monitor your team's usage and activity to optimize resource allocation</p>
        </div>
        
        <Card className="w-64 bg-gradient-to-br from-caregrowth-lightblue to-white border-caregrowth-blue">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Coins className="mr-2 h-4 w-4 text-caregrowth-blue" />
              Available Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-caregrowth-blue">11,250</div>
            <Button className="w-full mt-2 bg-caregrowth-blue hover:bg-caregrowth-blue/90 transition-all duration-200 text-sm">
              Purchase More
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Total Team Members
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Active users with access to your agency account</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12</div>
            <Button variant="outline" size="sm" className="mt-2 text-xs">Manage Team</Button>
          </CardContent>
        </Card>
        
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Active Users (Last 7 Days)
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Team members who logged in during the past week</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">8</div>
            <div className="mt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Team Activity</span>
                  <span>66%</span>
                </div>
                <Progress value={66} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                <Coins className="mr-2 h-4 w-4" />
                API Tokens Used (30 days)
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total tokens consumed by all features in the last month</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">124,567</div>
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span>Monthly allocation</span>
                <span>83% used</span>
              </div>
              <Progress value={83} className="h-2 mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 transition-all duration-200 hover:shadow-lg">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Coins className="mr-2 h-5 w-5 text-caregrowth-blue" />
          Agency Token Usage (Last 7 Days)
        </h2>
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
              <RechartsTooltip />
              <Area 
                type="monotone" 
                dataKey="tokens" 
                stroke="#8884d8" 
                fill="#8884d8" 
                fillOpacity={0.3}
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="outline" size="sm" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Adjust Token Allocation
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 transition-all duration-200 hover:shadow-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Usage by Tool
          </h2>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="py-2 text-left text-sm font-medium text-gray-500">Tool</th>
                <th className="py-2 text-right text-sm font-medium text-gray-500">Usage</th>
                <th className="py-2 text-right text-sm font-medium text-gray-500">Tokens</th>
                <th className="py-2 text-right text-sm font-medium text-gray-500">Efficiency</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="py-4 text-sm">Content Creation</td>
                <td className="py-4 text-sm text-right">42 generations</td>
                <td className="py-4 text-sm text-right">68,450</td>
                <td className="py-4 text-sm text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center">
                          <span className="text-green-600 font-medium">High</span>
                          <InfoIcon className="h-4 w-4 ml-1 text-gray-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>High token efficiency - good ROI for content production</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="py-4 text-sm">Research & Analysis</td>
                <td className="py-4 text-sm text-right">28 searches</td>
                <td className="py-4 text-sm text-right">34,721</td>
                <td className="py-4 text-sm text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center">
                          <span className="text-yellow-600 font-medium">Medium</span>
                          <InfoIcon className="h-4 w-4 ml-1 text-gray-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Average token usage - consider optimizing document size</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="py-4 text-sm">Customer Support AI</td>
                <td className="py-4 text-sm text-right">85 questions</td>
                <td className="py-4 text-sm text-right">21,396</td>
                <td className="py-4 text-sm text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center">
                          <span className="text-green-600 font-medium">High</span>
                          <InfoIcon className="h-4 w-4 ml-1 text-gray-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Excellent token efficiency - great for client support</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 transition-all duration-200 hover:shadow-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Usage by Team Member
          </h2>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="py-2 text-left text-sm font-medium text-gray-500">User</th>
                <th className="py-2 text-left text-sm font-medium text-gray-500">Role</th>
                <th className="py-2 text-right text-sm font-medium text-gray-500">Tokens</th>
                <th className="py-2 text-right text-sm font-medium text-gray-500">Trend</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="py-4 text-sm">Agency Owner</td>
                <td className="py-4 text-sm">Agency Admin</td>
                <td className="py-4 text-sm text-right">45,320</td>
                <td className="py-4 text-sm text-right text-green-500">↑ 12%</td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="py-4 text-sm">Marketing Lead</td>
                <td className="py-4 text-sm">Marketing</td>
                <td className="py-4 text-sm text-right">62,180</td>
                <td className="py-4 text-sm text-right text-green-500">↑ 24%</td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="py-4 text-sm">HR Representative</td>
                <td className="py-4 text-sm">HR Admin</td>
                <td className="py-4 text-sm text-right">17,067</td>
                <td className="py-4 text-sm text-right text-red-500">↓ 8%</td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              Set User Limits
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyUsagePage;

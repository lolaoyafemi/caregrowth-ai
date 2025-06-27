
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Activity, CreditCard, Users } from 'lucide-react';
import { useUsageAnalytics } from '@/hooks/useUsageAnalytics';

interface UsageAnalyticsProps {
  metrics: {
    totalCreditsUsed: number;
    monthlyRevenue: number;
    activeUsers: number;
  };
}

const UsageAnalytics = ({ metrics }: UsageAnalyticsProps) => {
  const { analyticsData, loading } = useUsageAnalytics();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-green-200">
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentStats = [
    {
      title: 'Daily Active Users',
      value: analyticsData.dailyActiveUsers.toString(),
      change: '+12%', // You could calculate this from trend data
      trend: 'up',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Credits Used Today',
      value: analyticsData.creditsUsedToday.toLocaleString(),
      change: '+8%',
      trend: 'up',
      icon: CreditCard,
      color: 'text-green-600'
    },
    {
      title: 'API Requests/min',
      value: analyticsData.apiRequestsPerMinute.toString(),
      change: '+5%',
      trend: 'up',
      icon: Activity,
      color: 'text-purple-600'
    },
    {
      title: 'Revenue Today',
      value: `$${analyticsData.revenueToday.toLocaleString()}`,
      change: '+15%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-emerald-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentStats.map((stat, index) => (
          <Card key={index} className="border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change} from yesterday
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Credit Usage Trend
            </CardTitle>
            <CardDescription>Daily credit consumption over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.usageTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="credits" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Tool Usage Distribution
            </CardTitle>
            <CardDescription>Credits used by each tool</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.toolUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tool" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="usage" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Usage Table */}
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle>Tool Usage Breakdown</CardTitle>
          <CardDescription>Detailed breakdown of how credits are being used</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.toolUsage.length > 0 ? (
              analyticsData.toolUsage.map((tool, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-gray-900">{tool.tool}</p>
                      <p className="text-sm text-gray-600">{tool.percentage}% of total usage</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{tool.usage.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">credits</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No tool usage data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageAnalytics;

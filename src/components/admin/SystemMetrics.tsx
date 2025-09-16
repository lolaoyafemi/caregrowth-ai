
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Building, 
  CreditCard, 
  DollarSign,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import type { SystemMetrics as SystemMetricsType } from '@/types/admin';

interface SystemMetricsProps {
  metrics: SystemMetricsType;
}

const SystemMetrics = ({ metrics }: SystemMetricsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const metricsData = [
    {
      title: 'Total Users',
      value: metrics.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active Users',
      value: metrics.activeUsers.toLocaleString(),
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Agencies',
      value: metrics.totalAgencies.toLocaleString(),
      icon: Building,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metricsData.map((metric, index) => (
        <Card key={index} className="border-green-200 p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-medium text-gray-600">
              {metric.title}
            </CardTitle>
            <div className={`p-3 rounded-lg ${metric.bgColor}`}>
              <metric.icon className={`h-6 w-6 ${metric.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${metric.color}`}>
              {metric.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SystemMetrics;

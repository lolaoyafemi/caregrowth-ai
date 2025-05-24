
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ChartBar, 
  CircleDollarSign, 
  Users, 
  BadgeDollarSign
} from 'lucide-react';

interface PerformanceMonitoringSectionProps {
  isVisible: boolean;
}

const PerformanceMonitoringSection = ({ isVisible }: PerformanceMonitoringSectionProps) => {
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

  if (!isVisible) return null;

  return (
    <Card className="shadow-md border-t-4 border-t-caregrowth-blue">
      <CardHeader className="flex flex-row items-center gap-2">
        <ChartBar className="h-6 w-6 text-caregrowth-blue" />
        <div>
          <CardTitle>Performance Monitoring</CardTitle>
          <CardDescription>
            Platform usage metrics and revenue insights
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-caregrowth-lightblue p-4 rounded-lg flex flex-col">
            <span className="text-sm text-gray-600">Total Tokens (This Month)</span>
            <div className="flex items-center mt-1">
              <BadgeDollarSign className="h-5 w-5 mr-2 text-caregrowth-blue" />
              <span className="text-2xl font-semibold">{performanceData.tokensThisMonth.toLocaleString()}</span>
            </div>
          </div>
          <div className="bg-caregrowth-lightgreen p-4 rounded-lg flex flex-col">
            <span className="text-sm text-gray-600">Monthly Revenue</span>
            <div className="flex items-center mt-1">
              <CircleDollarSign className="h-5 w-5 mr-2 text-caregrowth-green" />
              <span className="text-2xl font-semibold">${performanceData.monthlyRevenue.toLocaleString()}</span>
            </div>
          </div>
          <div className="bg-caregrowth-lightblue p-4 rounded-lg flex flex-col">
            <span className="text-sm text-gray-600">Lifetime Revenue</span>
            <div className="flex items-center mt-1">
              <CircleDollarSign className="h-5 w-5 mr-2 text-caregrowth-blue" />
              <span className="text-2xl font-semibold">${performanceData.lifetimeRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-caregrowth-blue" />
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
  );
};

export default PerformanceMonitoringSection;

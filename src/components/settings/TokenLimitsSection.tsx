
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Wallet } from 'lucide-react';

interface TokenLimitsSectionProps {
  isVisible: boolean;
}

const TokenLimitsSection = ({ isVisible }: TokenLimitsSectionProps) => {
  if (!isVisible) return null;

  return (
    <Card className="shadow-md border-t-4 border-t-caregrowth-blue transition-all duration-200 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center gap-2">
        <Wallet className="h-6 w-6 text-caregrowth-blue" />
        <div>
          <CardTitle>Token Limits & Allocation</CardTitle>
          <CardDescription>
            Manage how tokens are distributed across your team
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="bg-caregrowth-lightblue/30 p-4 rounded-md">
            <div className="flex justify-between">
              <div>
                <h3 className="text-sm font-medium">Monthly Token Budget</h3>
                <p className="text-2xl font-bold text-caregrowth-blue">150,000</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Used This Month</h3>
                <p className="text-2xl font-bold text-gray-700">124,567</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Remaining</h3>
                <p className="text-2xl font-bold text-green-600">25,433</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Auto-renew monthly allocation</p>
                <p className="text-sm text-gray-500">Automatically purchase tokens when low</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Low token alerts</p>
                <p className="text-sm text-gray-500">Get notified when tokens are below 20%</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Per-user allocation</p>
                <p className="text-sm text-gray-500">Set token limits for individual users</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Switch />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Enable to set individual token limits for each team member</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          <Button className="mt-6">Update Token Settings</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenLimitsSection;

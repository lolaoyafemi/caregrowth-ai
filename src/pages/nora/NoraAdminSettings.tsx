import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CreditManagement from '@/components/admin/CreditManagement';
import CreditPricingControl from '@/components/admin/CreditPricingControl';
import CreditInventoryManager from '@/components/admin/CreditInventoryManager';
import OpenAIKeyManager from '@/components/admin/OpenAIKeyManager';

const NoraAdminSettings = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Nora Admin Settings</h2>
        <p className="text-sm text-muted-foreground">Manage AI keys, credit pricing, and content generation settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">OpenAI API Keys</CardTitle>
            <CardDescription>Manage API keys for content generation</CardDescription>
          </CardHeader>
          <CardContent>
            <OpenAIKeyManager />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credit Pricing</CardTitle>
            <CardDescription>Set credit costs for content generation</CardDescription>
          </CardHeader>
          <CardContent>
            <CreditPricingControl />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credit Inventory</CardTitle>
          <CardDescription>Monitor and manage credit supply</CardDescription>
        </CardHeader>
        <CardContent>
          <CreditInventoryManager />
        </CardContent>
      </Card>
    </div>
  );
};

export default NoraAdminSettings;

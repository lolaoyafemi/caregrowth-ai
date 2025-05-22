
import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';

const ApiKeyManagementPage = () => {
  const { user, hasPermission } = useUser();
  const [apiKey, setApiKey] = useState('sk-********************');
  const [showKey, setShowKey] = useState(false);
  
  // Only super admins can access this page
  if (!hasPermission(['super_admin'])) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">API Key Management</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Master OpenAI API Key</CardTitle>
          <CardDescription>
            This API key will be used for all AI operations across the platform unless
            overridden by agency-specific keys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Input 
                type={showKey ? "text" : "password"} 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
                placeholder="Enter your OpenAI API key"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <Button>Update Key</Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: May 15, 2025 at 10:30 AM
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Agency-Specific API Keys</CardTitle>
          <CardDescription>
            Optionally configure specific agencies to use their own API keys instead
            of the master key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2].map((agency) => (
              <div key={agency} className="border-b pb-4 last:border-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Example Home Care Agency {agency}</h3>
                  <div>
                    <Button variant="outline" size="sm" className="mr-2">Edit</Button>
                    <Button variant="destructive" size="sm">Remove</Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">API Key (masked)</p>
                    <Input 
                      type="password" 
                      value="sk-********************" 
                      disabled
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Status</p>
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button className="mt-6" variant="outline">Add Agency API Key</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeyManagementPage;

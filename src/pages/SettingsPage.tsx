
import React from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const SettingsPage = () => {
  const { user } = useUser();
  
  const isSuperAdmin = user?.role === 'super_admin';
  const isAgencyAdmin = user?.role === 'agency_admin';

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="space-y-6">
        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Update your personal information and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue={user?.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" defaultValue={user?.email} readOnly />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label htmlFor="password">Change Password</Label>
                <Input id="password" type="password" placeholder="Enter new password" />
              </div>
            </div>
            <Button className="mt-6">Save Changes</Button>
          </CardContent>
        </Card>
        
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Control when and how you receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive important updates via email</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Usage Alerts</p>
                  <p className="text-sm text-gray-500">Get notified when approaching usage limits</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Team Member Notifications</p>
                  <p className="text-sm text-gray-500">Receive alerts when new users join</p>
                </div>
                <Switch defaultChecked={isAgencyAdmin || isSuperAdmin} />
              </div>
            </div>
            <Button className="mt-6">Save Preferences</Button>
          </CardContent>
        </Card>
        
        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>
              Customize your dashboard appearance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compact Layout</p>
                  <p className="text-sm text-gray-500">Use a more compact dashboard layout</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-gray-500">Use dark theme for the dashboard</p>
                </div>
                <Switch />
              </div>
            </div>
            <Button className="mt-6">Save Display Settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;

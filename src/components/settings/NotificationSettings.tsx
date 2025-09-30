
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { BellRing } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

const NotificationSettings = () => {
  const { user } = useUser();
  const isSuperAdmin = user?.role === 'super_admin';
  const isAgencyAdmin = user?.role === 'agency_admin';

  return (
    <Card className="shadow-md border-t-4 border-t-gray-400 transition-all duration-200 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center gap-2">
        <BellRing className="h-6 w-6 text-gray-700" />
        <div>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Control when and how you receive notifications.
          </CardDescription>
        </div>
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
          {/*<div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Team Member Notifications</p>
              <p className="text-sm text-gray-500">Receive alerts when new users join</p>
            </div>
            <Switch defaultChecked={isAgencyAdmin || isSuperAdmin} />
          </div>
        </div>*/}
        <Button className="mt-6 transition-all duration-200 hover:shadow">Save Preferences</Button>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;

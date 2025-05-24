
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CircleUser } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

const AccountSettings = () => {
  const { user } = useUser();

  return (
    <Card className="shadow-md border-t-4 border-t-gray-400 transition-all duration-200 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center gap-2">
        <CircleUser className="h-6 w-6 text-gray-700" />
        <div>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Update your personal information and preferences.
          </CardDescription>
        </div>
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
        <Button className="mt-6 transition-all duration-200 hover:shadow">Save Changes</Button>
      </CardContent>
    </Card>
  );
};

export default AccountSettings;

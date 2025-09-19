import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CircleUser } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AccountSettings = () => {
  const { user, setUser } = useUser();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || user?.name || '');
  const [password, setPassword] = useState('');

  const handleSaveChanges = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Update user profile in database
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update password if provided
      if (password.trim().length > 0) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password
        });
        
        if (passwordError) throw passwordError;
      }

      // Update local user context
      setUser({
        ...user,
        name: fullName,
        full_name: fullName
      });

      setPassword(''); // Clear password field
      
      toast({
        title: "Changes saved successfully",
        description: "Your account information has been updated.",
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error saving changes",
        description: error.message || "Failed to update your account information.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <Input 
              id="name" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" value={user?.email || ''} readOnly className="bg-muted" />
          </div>
          <div className="col-span-1 md:col-span-2 space-y-2">
            <Label htmlFor="password">Change Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password (leave blank to keep current)"
            />
          </div>
        </div>
        <Button 
          className="mt-6 transition-all duration-200 hover:shadow" 
          onClick={handleSaveChanges}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AccountSettings;
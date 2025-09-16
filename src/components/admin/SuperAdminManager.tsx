import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuperAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
  status: 'active' | 'suspended';
  created_at: string;
  last_sign_in_at: string | null;
}

const SuperAdminManager = () => {
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');

  const loadSuperAdmins = async () => {
    try {
      console.log('Loading super admins...');
      setLoading(true);

      // Fetch from user_profiles first (prioritized source)
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, email, business_name, role, status, created_at, last_sign_in_at')
        .eq('role', 'super_admin')
        .order('created_at', { ascending: false });

      let admins: SuperAdmin[] = [];

      if (profilesData && profilesData.length > 0) {
        admins = profilesData.map(admin => ({
          id: admin.user_id,
          email: admin.email || 'No email',
          name: admin.business_name || 'No name',
          role: admin.role,
          status: admin.status === 'suspended' ? 'suspended' : 'active',
          created_at: admin.created_at,
          last_sign_in_at: admin.last_sign_in_at
        }));
      }

      // If no data in user_profiles, try users table as fallback
      if (admins.length === 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email, name, role, created_at')
          .eq('role', 'super_admin')
          .order('created_at', { ascending: false });

        if (usersData) {
          admins = usersData.map(admin => ({
            id: admin.id,
            email: admin.email || 'No email',
            name: admin.name || 'No name',
            role: admin.role,
            status: 'active' as const,
            created_at: admin.created_at,
            last_sign_in_at: null
          }));
        }
      }

      setSuperAdmins(admins);
      console.log('Loaded super admins:', admins.length);
    } catch (error) {
      console.error('Error loading super admins:', error);
      toast.error('Failed to load super admins');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuperAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    try {
      console.log('Adding super admin:', newAdminEmail);
      
      // First check if user exists in auth.users (we can't directly query this, so we'll try to update user_profiles)
      const { data: existingProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, role, business_name')
        .eq('email', newAdminEmail.trim())
        .single();

      if (existingProfile) {
        // Update existing user to super_admin
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ 
            role: 'super_admin',
            business_name: newAdminName.trim() || existingProfile.business_name
          })
          .eq('user_id', existingProfile.user_id);

        if (updateError) {
          console.error('Error updating user to super admin:', updateError);
          toast.error('Failed to update user role');
          return;
        }

        toast.success('User updated to super admin successfully');
      } else {
        toast.error('User not found. The user must sign up first before being made a super admin.');
        return;
      }

      setShowAddDialog(false);
      setNewAdminEmail('');
      setNewAdminName('');
      await loadSuperAdmins();
    } catch (error) {
      console.error('Error adding super admin:', error);
      toast.error('Failed to add super admin');
    }
  };

  const handleSuspendAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: 'suspended' })
        .eq('user_id', adminId);

      if (error) {
        console.error('Error suspending admin:', error);
        toast.error('Failed to suspend admin');
        return;
      }

      toast.success('Admin suspended successfully');
      await loadSuperAdmins();
    } catch (error) {
      console.error('Error suspending admin:', error);
      toast.error('Failed to suspend admin');
    }
  };

  const handleActivateAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: 'active' })
        .eq('user_id', adminId);

      if (error) {
        console.error('Error activating admin:', error);
        toast.error('Failed to activate admin');
        return;
      }

      toast.success('Admin activated successfully');
      await loadSuperAdmins();
    } catch (error) {
      console.error('Error activating admin:', error);
      toast.error('Failed to activate admin');
    }
  };

  useEffect(() => {
    loadSuperAdmins();
  }, []);

  if (loading) {
    return (
      <Card className="border-green-200">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          Super Admin Management
        </CardTitle>
        <CardDescription>
          Manage super administrators who have full system access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Total Super Admins: {superAdmins.length}
            </p>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Super Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Super Admin</DialogTitle>
                  <DialogDescription>
                    Add an existing user as a super administrator. The user must have an account first.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name (Optional)</Label>
                    <Input
                      id="name"
                      placeholder="Administrator Name"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddSuperAdmin}>
                      Add Super Admin
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {superAdmins.length > 0 ? (
                  superAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.name}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="bg-red-100 text-red-800">
                          Super Admin
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={admin.status === 'active' ? 'default' : 'secondary'}
                          className={
                            admin.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {admin.status === 'active' ? 'Active' : 'Suspended'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {admin.last_sign_in_at 
                          ? new Date(admin.last_sign_in_at).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {admin.status === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSuspendAdmin(admin.id)}
                              className="gap-1"
                            >
                              <UserX className="h-3 w-3" />
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActivateAdmin(admin.id)}
                              className="gap-1"
                            >
                              <UserCheck className="h-3 w-3" />
                              Activate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No super administrators found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SuperAdminManager;
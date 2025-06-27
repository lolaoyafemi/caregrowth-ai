import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  credits: number;
  status: 'active' | 'suspended';
}

interface AdminAgency {
  id: string;
  name: string;
  admin_email: string;
  users_count: number;
  credits_used: number;
  last_active: string;
  status: 'active' | 'suspended' | 'pending';
  created_at: string;
}

interface SystemMetrics {
  totalUsers: number;
  totalAgencies: number;
  totalCreditsUsed: number;
  totalRevenue: number;
  monthlyRevenue: number;
  activeUsers: number;
}

export const useAdminData = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [agencies, setAgencies] = useState<AdminAgency[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    totalAgencies: 0,
    totalCreditsUsed: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedUsers = data?.map(user => ({
        id: user.id,
        email: user.email || '',
        name: user.name || '',
        role: user.role || 'user',
        created_at: user.created_at || new Date().toISOString(),
        last_sign_in_at: null, // This would come from auth.users if accessible
        credits: user.credits || 0,
        status: (user.role === 'suspended' ? 'suspended' : 'active') as 'active' | 'suspended'
      })) || [];
      
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchAgencies = async () => {
    try {
      // Mock data for now - in a real app, you'd have an agencies table
      const mockAgencies: AdminAgency[] = [
        {
          id: '1',
          name: 'CareFirst Agency',
          admin_email: 'admin@carefirst.com',
          users_count: 5,
          credits_used: 2500,
          last_active: '2024-01-15',
          status: 'active',
          created_at: '2024-01-01'
        },
        {
          id: '2',
          name: 'Golden Years Care',
          admin_email: 'admin@goldenyears.com',
          users_count: 3,
          credits_used: 1800,
          last_active: '2024-01-14',
          status: 'active',
          created_at: '2024-01-02'
        },
        {
          id: '3',
          name: 'Comfort Home Services',
          admin_email: 'admin@comfort.com',
          users_count: 7,
          credits_used: 3200,
          last_active: '2024-01-13',
          status: 'pending',
          created_at: '2024-01-03'
        }
      ];
      
      setAgencies(mockAgencies);
    } catch (error) {
      console.error('Error fetching agencies:', error);
      toast.error('Failed to load agencies');
    }
  };

  const fetchMetrics = async () => {
    try {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, created_at');

      const { data: creditsData } = await supabase
        .from('credit_usage_log')
        .select('credits_used');

      const { data: salesData } = await supabase
        .from('credit_sales_log')
        .select('amount_paid, timestamp');

      const totalUsers = usersData?.length || 0;
      const totalCreditsUsed = creditsData?.reduce((sum, log) => sum + log.credits_used, 0) || 0;
      const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.amount_paid), 0) || 0;
      
      // Calculate monthly revenue
      const currentMonth = new Date().getMonth();
      const monthlyRevenue = salesData?.filter(sale => 
        new Date(sale.timestamp).getMonth() === currentMonth
      ).reduce((sum, sale) => sum + Number(sale.amount_paid), 0) || 0;

      setMetrics({
        totalUsers,
        totalAgencies: agencies.length,
        totalCreditsUsed,
        totalRevenue,
        monthlyRevenue,
        activeUsers: Math.floor(totalUsers * 0.7) // Mock active users
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Failed to load metrics');
    }
  };

  const suspendUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'suspended' })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('User suspended successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    }
  };

  const activateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'user' })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('User activated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Failed to activate user');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const addCreditsToUser = async (userId: string, credits: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ credits: credits })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('Credits added successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error adding credits:', error);
      toast.error('Failed to add credits');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchAgencies()]);
      await fetchMetrics();
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    users,
    agencies,
    metrics,
    loading,
    suspendUser,
    activateUser,
    deleteUser,
    addCreditsToUser,
    refetch: () => {
      fetchUsers();
      fetchAgencies();
      fetchMetrics();
    }
  };
};

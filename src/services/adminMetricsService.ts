
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SystemMetrics, AdminAgency } from '@/types/admin';

export const fetchMetrics = async (agencies: AdminAgency[]): Promise<SystemMetrics> => {
  try {
    console.log('=== ADMIN METRICS SERVICE: Fetching metrics ===');
    
    // Fetch users from users table with credits from user_profiles
    const { data: usersData } = await supabase
      .from('users')
      .select(`
        id, 
        created_at, 
        role,
        user_profiles!user_profiles_user_id_fkey(credits)
      `);

    console.log('Users data for metrics:', usersData);

    const { data: creditsData } = await supabase
      .from('credit_usage_log')
      .select('credits_used');

    const { data: salesData } = await supabase
      .from('credit_sales_log')
      .select('amount_paid, timestamp');

    console.log('Credits usage data:', creditsData);
    console.log('Sales data:', salesData);

    const totalUsers = usersData?.length || 0;
    const totalCreditsUsed = creditsData?.reduce((sum, log) => sum + log.credits_used, 0) || 0;
    const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.amount_paid), 0) || 0;
    
    // Calculate monthly revenue
    const currentMonth = new Date().getMonth();
    const monthlyRevenue = salesData?.filter(sale => 
      new Date(sale.timestamp).getMonth() === currentMonth
    ).reduce((sum, sale) => sum + Number(sale.amount_paid), 0) || 0;

    // Calculate active users (all users are considered active since users table doesn't have status)
    const activeUsers = totalUsers;

    const metrics = {
      totalUsers,
      totalAgencies: agencies.length,
      totalCreditsUsed,
      totalRevenue,
      monthlyRevenue,
      activeUsers
    };

    console.log('Calculated metrics:', metrics);
    
    return metrics;
  } catch (error) {
    console.error('Error fetching metrics:', error);
    toast.error('Failed to load metrics');
    return {
      totalUsers: 0,
      totalAgencies: 0,
      totalCreditsUsed: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      activeUsers: 0
    };
  }
};

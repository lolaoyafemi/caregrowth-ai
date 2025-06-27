
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SystemMetrics, AdminAgency } from '@/types/admin';

export const fetchMetrics = async (agencies: AdminAgency[]): Promise<SystemMetrics> => {
  try {
    const { data: usersData } = await supabase
      .from('user_profiles')
      .select('user_id, created_at, status');

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

    // Calculate active users (users with status 'active')
    const activeUsers = usersData?.filter(user => user.status === 'active').length || 0;

    return {
      totalUsers,
      totalAgencies: agencies.length,
      totalCreditsUsed,
      totalRevenue,
      monthlyRevenue,
      activeUsers
    };
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

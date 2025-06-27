
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SystemMetrics, AdminAgency } from '@/types/admin';

export const fetchMetrics = async (agencies: AdminAgency[]): Promise<SystemMetrics> => {
  try {
    console.log('=== ADMIN METRICS SERVICE: Fetching metrics ===');
    
    // Try fetching from both users and user_profiles tables
    const { data: usersData } = await supabase
      .from('users')
      .select('id, created_at, role, credits');

    const { data: profilesData } = await supabase
      .from('user_profiles')
      .select('user_id, created_at, role, credits');

    console.log('Users data for metrics:', usersData);
    console.log('Profiles data for metrics:', profilesData);

    // Use whichever table has data
    let userData = [];
    if (usersData && usersData.length > 0) {
      userData = usersData;
    } else if (profilesData && profilesData.length > 0) {
      userData = profilesData.map(profile => ({
        id: profile.user_id,
        created_at: profile.created_at,
        role: profile.role,
        credits: profile.credits
      }));
    }

    const { data: creditsData } = await supabase
      .from('credit_usage_log')
      .select('credits_used');

    const { data: salesData } = await supabase
      .from('credit_sales_log')
      .select('amount_paid, timestamp');

    console.log('User data for metrics:', userData);
    console.log('Credits usage data:', creditsData);
    console.log('Sales data:', salesData);

    const totalUsers = userData?.length || 0;
    const totalCreditsUsed = creditsData?.reduce((sum, log) => sum + log.credits_used, 0) || 0;
    const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.amount_paid), 0) || 0;
    
    // Calculate monthly revenue
    const currentMonth = new Date().getMonth();
    const monthlyRevenue = salesData?.filter(sale => 
      new Date(sale.timestamp).getMonth() === currentMonth
    ).reduce((sum, sale) => sum + Number(sale.amount_paid), 0) || 0;

    // All users are considered active since we don't have reliable status tracking
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

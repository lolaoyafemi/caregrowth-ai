
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SystemMetrics, AdminAgency } from '@/types/admin';

export const fetchMetrics = async (agencies: AdminAgency[]): Promise<SystemMetrics> => {
  try {
    console.log('=== ADMIN METRICS SERVICE: Fetching metrics ===');
    
    // Fetch current credit pricing
    const { data: creditPricingData } = await supabase
      .from('credit_pricing')
      .select('price_per_credit')
      .single();
    
    const pricePerCredit = creditPricingData?.price_per_credit || 0.01;
    console.log('Current price per credit for metrics:', pricePerCredit);
    
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
      .select('credits_used, used_at');

    const { data: salesData } = await supabase
      .from('credit_sales_log')
      .select('amount_paid, timestamp');

    // Also fetch from payments table for additional revenue data
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('amount, created_at, status')
      .eq('status', 'completed');

    console.log('User data for metrics:', userData);
    console.log('Credits usage data:', creditsData);
    console.log('Sales data:', salesData);
    console.log('Payments data:', paymentsData);

    const totalUsers = userData?.length || 0;
    const totalCreditsUsed = creditsData?.reduce((sum, log) => sum + log.credits_used, 0) || 0;
    
    // Calculate total revenue from actual credit purchases and payments
    const salesRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.amount_paid), 0) || 0;
    const paymentsRevenue = paymentsData?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
    const totalRevenue = (salesRevenue + paymentsRevenue) / 100; // Convert from cents to dollars
    
    // Calculate monthly revenue from actual purchases
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlySalesRevenue = salesData?.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    }).reduce((sum, sale) => sum + Number(sale.amount_paid), 0) || 0;
    
    const monthlyPaymentsRevenue = paymentsData?.filter(payment => {
      const paymentDate = new Date(payment.created_at);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    }).reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
    
    const monthlyRevenue = (monthlySalesRevenue + monthlyPaymentsRevenue) / 100; // Convert from cents to dollars

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

    console.log('Calculated metrics with credit-based revenue:', metrics);
    
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

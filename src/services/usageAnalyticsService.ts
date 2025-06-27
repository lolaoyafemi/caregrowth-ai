
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UsageAnalyticsData {
  dailyActiveUsers: number;
  creditsUsedToday: number;
  apiRequestsPerMinute: number;
  revenueToday: number;
  usageTrend: Array<{
    date: string;
    credits: number;
    users: number;
    revenue: number;
  }>;
  toolUsage: Array<{
    tool: string;
    usage: number;
    percentage: number;
  }>;
}

export const fetchUsageAnalytics = async (): Promise<UsageAnalyticsData> => {
  try {
    console.log('=== USAGE ANALYTICS SERVICE: Fetching analytics data ===');
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Fetch daily active users (users who used credits today)
    const { data: dailyActiveUsersData } = await supabase
      .from('credit_usage_log')
      .select('user_id')
      .gte('used_at', startOfDay.toISOString())
      .group('user_id');
    
    const dailyActiveUsers = dailyActiveUsersData?.length || 0;
    
    // Fetch credits used today
    const { data: creditsUsedTodayData } = await supabase
      .from('credit_usage_log')
      .select('credits_used')
      .gte('used_at', startOfDay.toISOString());
    
    const creditsUsedToday = creditsUsedTodayData?.reduce((sum, log) => sum + log.credits_used, 0) || 0;
    
    // Fetch revenue today
    const { data: revenueTodayData } = await supabase
      .from('credit_sales_log')
      .select('amount_paid')
      .gte('timestamp', startOfDay.toISOString());
    
    const revenueToday = revenueTodayData?.reduce((sum, sale) => sum + Number(sale.amount_paid), 0) || 0;
    
    // Fetch usage trend for last 7 days
    const { data: usageTrendData } = await supabase
      .from('credit_usage_log')
      .select('used_at, credits_used, user_id')
      .gte('used_at', last7Days.toISOString())
      .order('used_at', { ascending: true });
    
    // Group usage trend by day
    const usageTrendMap = new Map();
    usageTrendData?.forEach(log => {
      const date = new Date(log.used_at).toISOString().split('T')[0];
      if (!usageTrendMap.has(date)) {
        usageTrendMap.set(date, { credits: 0, users: new Set(), revenue: 0 });
      }
      const dayData = usageTrendMap.get(date);
      dayData.credits += log.credits_used;
      dayData.users.add(log.user_id);
    });
    
    // Fetch revenue data for trend
    const { data: revenueTrendData } = await supabase
      .from('credit_sales_log')
      .select('timestamp, amount_paid')
      .gte('timestamp', last7Days.toISOString());
    
    revenueTrendData?.forEach(sale => {
      const date = new Date(sale.timestamp).toISOString().split('T')[0];
      if (usageTrendMap.has(date)) {
        usageTrendMap.get(date).revenue += Number(sale.amount_paid);
      }
    });
    
    const usageTrend = Array.from(usageTrendMap.entries()).map(([date, data]) => ({
      date,
      credits: data.credits,
      users: data.users.size,
      revenue: data.revenue
    })).slice(-7); // Last 7 days
    
    // Fetch tool usage distribution
    const { data: toolUsageData } = await supabase
      .from('credit_usage_log')
      .select('tool, credits_used');
    
    const toolUsageMap = new Map();
    let totalCreditsUsed = 0;
    
    toolUsageData?.forEach(log => {
      const tool = log.tool || 'Unknown';
      toolUsageMap.set(tool, (toolUsageMap.get(tool) || 0) + log.credits_used);
      totalCreditsUsed += log.credits_used;
    });
    
    const toolUsage = Array.from(toolUsageMap.entries()).map(([tool, usage]) => ({
      tool,
      usage,
      percentage: totalCreditsUsed > 0 ? Math.round((usage / totalCreditsUsed) * 100) : 0
    })).sort((a, b) => b.usage - a.usage);
    
    // Calculate API requests per minute (estimate based on credit usage)
    const apiRequestsPerMinute = Math.round(creditsUsedToday / (24 * 60) * 10); // Rough estimate
    
    const analyticsData = {
      dailyActiveUsers,
      creditsUsedToday,
      apiRequestsPerMinute,
      revenueToday,
      usageTrend,
      toolUsage
    };
    
    console.log('Usage analytics data:', analyticsData);
    return analyticsData;
    
  } catch (error) {
    console.error('Error fetching usage analytics:', error);
    toast.error('Failed to load usage analytics');
    return {
      dailyActiveUsers: 0,
      creditsUsedToday: 0,
      apiRequestsPerMinute: 0,
      revenueToday: 0,
      usageTrend: [],
      toolUsage: []
    };
  }
};


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
    requests: number;
  }>;
  toolUsage: Array<{
    tool: string;
    usage: number;
    percentage: number;
  }>;
  requestsTrend: Array<{
    time: string;
    requests: number;
  }>;
}

export const fetchUsageAnalytics = async (): Promise<UsageAnalyticsData> => {
  try {
    console.log('=== USAGE ANALYTICS SERVICE: Fetching analytics data ===');
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last24Hours = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    // Fetch current credit pricing
    const { data: creditPricingData } = await supabase
      .from('credit_pricing')
      .select('price_per_credit')
      .single();
    
    const pricePerCredit = creditPricingData?.price_per_credit || 0.01;
    console.log('Current price per credit:', pricePerCredit);
    
    // Fetch daily active users (users who used credits today)
    const { data: dailyActiveUsersData } = await supabase
      .from('credit_usage_log')
      .select('user_id')
      .gte('used_at', startOfDay.toISOString());
    
    const uniqueUsers = dailyActiveUsersData ? 
      new Set(dailyActiveUsersData.map(log => log.user_id)).size : 0;
    
    const dailyActiveUsers = uniqueUsers;
    
    // Fetch credits used today
    const { data: creditsUsedTodayData } = await supabase
      .from('credit_usage_log')
      .select('credits_used')
      .gte('used_at', startOfDay.toISOString());
    
    const creditsUsedToday = creditsUsedTodayData?.reduce((sum, log) => sum + log.credits_used, 0) || 0;
    
    // Calculate revenue today based on credits used * price per credit
    const revenueToday = creditsUsedToday * pricePerCredit * 100; // Convert to cents for consistency
    
    // Calculate API requests per minute based on recent activity
    const { data: recentRequestsData } = await supabase
      .from('credit_usage_log')
      .select('used_at')
      .gte('used_at', last24Hours.toISOString());
    
    const totalRequestsLast24Hours = recentRequestsData?.length || 0;
    const apiRequestsPerMinute = Math.round(totalRequestsLast24Hours / (24 * 60));
    
    // Fetch usage trend for last 7 days
    const { data: usageTrendData } = await supabase
      .from('credit_usage_log')
      .select('used_at, credits_used, user_id')
      .gte('used_at', last7Days.toISOString())
      .order('used_at', { ascending: true });
    
    // Group usage trend by day
    const usageTrendMap = new Map();
    const last7DaysArray = [];
    
    // Initialize last 7 days with zero values
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      last7DaysArray.push(dateKey);
      usageTrendMap.set(dateKey, { credits: 0, users: new Set(), revenue: 0, requests: 0 });
    }
    
    // Fill in actual data and calculate daily revenue based on credits used
    usageTrendData?.forEach(log => {
      const date = new Date(log.used_at).toISOString().split('T')[0];
      if (usageTrendMap.has(date)) {
        const dayData = usageTrendMap.get(date);
        dayData.credits += log.credits_used;
        dayData.users.add(log.user_id);
        dayData.requests += 1; // Each credit usage log represents an API request
        // Calculate revenue for this day based on credits used * current price
        dayData.revenue += log.credits_used * pricePerCredit * 100; // Convert to cents
      }
    });
    
    const usageTrend = last7DaysArray.map(date => ({
      date,
      credits: usageTrendMap.get(date).credits,
      users: usageTrendMap.get(date).users.size,
      revenue: usageTrendMap.get(date).revenue,
      requests: usageTrendMap.get(date).requests
    }));
    
    // Generate hourly requests trend for the last 24 hours
    const requestsTrend = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(today.getTime() - i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourlyRequests = recentRequestsData?.filter(log => {
        const logTime = new Date(log.used_at);
        return logTime >= hourStart && logTime < hourEnd;
      }).length || 0;
      
      requestsTrend.push({
        time: hourStart.toISOString(),
        requests: hourlyRequests
      });
    }
    
    // Fetch tool usage distribution with proper mapping
    const { data: toolUsageData } = await supabase
      .from('credit_usage_log')
      .select('tool, credits_used');
    
    const toolUsageMap = new Map();
    let totalCreditsUsed = 0;
    
    // Map tool names to display names
    const toolDisplayNames: { [key: string]: string } = {
      'social-media': 'Social Media',
      'generate-post': 'Social Media',
      'regenerate-section': 'Social Media',
      'document-search': 'Smart Document Search',
      'smart-document-search': 'Smart Document Search',
      'qa-assistant': 'Ask Jared'
    };
    
    toolUsageData?.forEach(log => {
      const displayName = toolDisplayNames[log.tool] || log.tool || 'Unknown';
      toolUsageMap.set(displayName, (toolUsageMap.get(displayName) || 0) + log.credits_used);
      totalCreditsUsed += log.credits_used;
    });
    
    const toolUsage = Array.from(toolUsageMap.entries()).map(([tool, usage]) => ({
      tool,
      usage,
      percentage: totalCreditsUsed > 0 ? Math.round((usage / totalCreditsUsed) * 100) : 0
    })).sort((a, b) => b.usage - a.usage);
    
    const analyticsData = {
      dailyActiveUsers,
      creditsUsedToday,
      apiRequestsPerMinute,
      revenueToday,
      usageTrend,
      toolUsage,
      requestsTrend
    };
    
    console.log('Usage analytics data with requests tracking:', analyticsData);
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
      toolUsage: [],
      requestsTrend: []
    };
  }
};

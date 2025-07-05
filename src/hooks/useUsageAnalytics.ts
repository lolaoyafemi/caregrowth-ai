
import { useState, useEffect } from 'react';
import { fetchUsageAnalytics, UsageAnalyticsData } from '@/services/usageAnalyticsService';

export const useUsageAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState<UsageAnalyticsData>({
    dailyActiveUsers: 0,
    creditsUsedToday: 0,
    apiRequestsPerMinute: 0,
    revenueToday: 0,
    usageTrend: [],
    toolUsage: [],
    requestsTrend: []
  });
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    const data = await fetchUsageAnalytics();
    setAnalyticsData(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
    
    // Set up auto-refresh every 30 seconds for real-time data
    const interval = setInterval(loadAnalytics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const refetch = () => {
    loadAnalytics();
  };

  return {
    analyticsData,
    loading,
    refetch
  };
};

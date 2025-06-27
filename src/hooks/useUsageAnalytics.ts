
import { useState, useEffect } from 'react';
import { fetchUsageAnalytics, UsageAnalyticsData } from '@/services/usageAnalyticsService';

export const useUsageAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState<UsageAnalyticsData>({
    dailyActiveUsers: 0,
    creditsUsedToday: 0,
    apiRequestsPerMinute: 0,
    revenueToday: 0,
    usageTrend: [],
    toolUsage: []
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

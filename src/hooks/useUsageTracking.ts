import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

interface UsageMetrics {
  socialMedia: { used: number; total: number; percent: number };
  documentSearch: { used: number; total: number; percent: number };
  qaAssistant: { used: number; total: number; percent: number };
}

export const useUsageTracking = () => {
  const { user } = useUser();
  const [metrics, setMetrics] = useState<UsageMetrics>({
    socialMedia: { used: 0, total: 50, percent: 0 },
    documentSearch: { used: 0, total: 5, percent: 0 },
    qaAssistant: { used: 0, total: 100, percent: 0 }
  });
  const [loading, setLoading] = useState(true);

  const fetchUsageMetrics = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get current month start
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Fetch usage data from credit_usage_log
      const { data: usageData, error } = await supabase
        .from('credit_usage_log')
        .select('tool, credits_used')
        .eq('user_id', user.id)
        .gte('used_at', monthStart.toISOString());

      if (error) {
        console.error('Error fetching usage data:', error);
        return;
      }

      // Count usage by tool
      let socialMediaUsed = 0;
      let documentSearchUsed = 0;
      let qaAssistantUsed = 0;

      usageData?.forEach(record => {
        switch (record.tool) {
          case 'social-media':
          case 'generate-post':
          case 'regenerate-section':
            socialMediaUsed += 1; // Count generations, not credits
            break;
          case 'document-search':
          case 'smart-document-search':
            documentSearchUsed += 1;
            break;
          case 'qa-assistant':
            qaAssistantUsed += 1;
            break;
        }
      });

      // Calculate percentages
      const socialMediaPercent = Math.round((socialMediaUsed / 50) * 100);
      const documentSearchPercent = Math.round((documentSearchUsed / 5) * 100);
      const qaAssistantPercent = Math.round((qaAssistantUsed / 100) * 100);

      setMetrics({
        socialMedia: { 
          used: socialMediaUsed, 
          total: 50, 
          percent: Math.min(socialMediaPercent, 100) 
        },
        documentSearch: { 
          used: documentSearchUsed, 
          total: 5, 
          percent: Math.min(documentSearchPercent, 100) 
        },
        qaAssistant: { 
          used: qaAssistantUsed, 
          total: 100, 
          percent: Math.min(qaAssistantPercent, 100) 
        }
      });

    } catch (error) {
      console.error('Error fetching usage metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementUsage = (tool: 'socialMedia' | 'documentSearch' | 'qaAssistant') => {
    setMetrics(prev => {
      const updated = { ...prev };
      const current = updated[tool];
      const newUsed = Math.min(current.used + 1, current.total);
      const newPercent = Math.round((newUsed / current.total) * 100);
      
      updated[tool] = {
        ...current,
        used: newUsed,
        percent: newPercent
      };
      
      return updated;
    });
  };

  useEffect(() => {
    fetchUsageMetrics();
  }, [user?.id]);

  // Refetch every 30 seconds to keep data fresh
  useEffect(() => {
    const interval = setInterval(fetchUsageMetrics, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  return {
    metrics,
    loading,
    refetch: fetchUsageMetrics,
    incrementUsage
  };
};

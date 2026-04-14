import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PredictiveAlert {
  id: string;
  type: string;
  message: string;
  action_label: string;
  action_path: string;
  severity: 'high' | 'medium' | 'low';
}

const PREDICTIVE_TYPES = [
  'predictive_visibility',
  'predictive_engagement',
  'predictive_conversion',
  'predictive_momentum',
];

const severityMap: Record<string, 'high' | 'medium' | 'low'> = {
  predictive_visibility: 'high',
  predictive_engagement: 'medium',
  predictive_conversion: 'medium',
  predictive_momentum: 'medium',
};

export function usePredictiveAlerts() {
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;

      const { data } = await supabase
        .from('interventions')
        .select('id, type, message, action_label, action_path, created_at')
        .eq('user_id', userData.user.id)
        .eq('status', 'pending')
        .in('type', PREDICTIVE_TYPES)
        .order('created_at', { ascending: false })
        .limit(3);

      const mapped: PredictiveAlert[] = (data ?? []).map(d => ({
        id: d.id,
        type: d.type,
        message: d.message,
        action_label: d.action_label,
        action_path: d.action_path,
        severity: severityMap[d.type] ?? 'medium',
      }));

      setAlerts(mapped);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const dismiss = useCallback(async (id: string) => {
    await supabase
      .from('interventions')
      .update({ status: 'dismissed' })
      .eq('id', id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  return { alerts, loading, dismiss, refetch: fetchAlerts };
}

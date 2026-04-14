import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Intervention {
  id: string;
  type: string;
  message: string;
  action_label: string;
  action_path: string;
  status: string;
  created_at: string;
}

export function useInterventions() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;

      const { data } = await supabase
        .from('interventions')
        .select('id, type, message, action_label, action_path, status, created_at')
        .eq('user_id', userData.user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      setInterventions((data as Intervention[]) ?? []);
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
    setInterventions(prev => prev.filter(i => i.id !== id));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { interventions, loading, dismiss, refetch: fetch };
}

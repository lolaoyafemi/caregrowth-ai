import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DecisionState {
  visibility_state: string;
  engagement_state: string;
  conversion_state: string;
  queue_count: number;
  published_this_week: number;
  engagement_count: number;
  lead_count: number;
}

export interface Decision {
  category: string;
  reason: string;
}

export interface DecisionEngineResult {
  decision: Decision | null;
  state: DecisionState | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDecisionEngine(): DecisionEngineResult {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [state, setState] = useState<DecisionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('decide-next-action');

      if (fnError) throw fnError;

      setDecision(data?.decision ?? null);
      setState(data?.state ?? null);
    } catch (err: any) {
      console.error('Decision engine error:', err);
      setError(err.message || 'Failed to get decision');
      // Fallback decision
      setDecision({ category: 'visibility', reason: 'Keeping you visible.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { decision, state, loading, error, refetch: fetch };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TodaysPost {
  id: string;
  hook: string | null;
  post_body: string;
  headline: string | null;
  platform: string;
  status: string;
  scheduled_at: string;
  engagement_hook: string | null;
  post_type: string | null;
  content_anchor: string | null;
}

export function useTodaysPost() {
  const [post, setPost] = useState<TodaysPost | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Get the next scheduled post (today or nearest future)
      const { data } = await supabase
        .from('content_posts')
        .select('id, hook, post_body, headline, platform, status, scheduled_at, engagement_hook, post_type, content_anchor')
        .eq('user_id', userData.user.id)
        .in('status', ['scheduled', 'needs_approval'])
        .gte('scheduled_at', todayStart.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      setPost(data as TodaysPost | null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { post, loading, refetch: fetch };
}

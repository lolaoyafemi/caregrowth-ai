import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityItem {
  id: string;
  type: 'published' | 'scheduled' | 'engagement';
  message: string;
  timestamp: string;
}

export function useActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      const userId = userData.user.id;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [publishedRes, scheduledRes] = await Promise.all([
        supabase
          .from('content_posts')
          .select('id, published_at, platform')
          .eq('user_id', userId)
          .eq('status', 'published')
          .gte('published_at', sevenDaysAgo.toISOString())
          .order('published_at', { ascending: false })
          .limit(5),
        supabase
          .from('content_posts')
          .select('id, scheduled_at, platform')
          .eq('user_id', userId)
          .eq('status', 'scheduled')
          .order('scheduled_at', { ascending: true })
          .limit(5),
      ]);

      const feed: ActivityItem[] = [];

      (publishedRes.data ?? []).forEach(p => {
        const day = new Date(p.published_at!).toLocaleDateString('en-US', { weekday: 'long' });
        feed.push({
          id: `pub-${p.id}`,
          type: 'published',
          message: `Post published on ${p.platform} – ${day}`,
          timestamp: p.published_at!,
        });
      });

      (scheduledRes.data ?? []).forEach(p => {
        const day = new Date(p.scheduled_at).toLocaleDateString('en-US', { weekday: 'long' });
        feed.push({
          id: `sch-${p.id}`,
          type: 'scheduled',
          message: `Post scheduled for ${p.platform} – ${day}`,
          timestamp: p.scheduled_at,
        });
      });

      // Sort by timestamp desc
      feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setItems(feed.slice(0, 8));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, refetch: fetch };
}

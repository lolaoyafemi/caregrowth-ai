import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type VisibilityLevel = 'good' | 'warning' | 'risk';

export interface VisibilityStatus {
  level: VisibilityLevel;
  headline: string;
  detail: string;
  postsPublishedThisWeek: number;
  queueCount: number;
  daysOfContentLeft: number;
  loading: boolean;
}

export function useVisibilityStatus() {
  const [status, setStatus] = useState<VisibilityStatus>({
    level: 'good',
    headline: '',
    detail: '',
    postsPublishedThisWeek: 0,
    queueCount: 0,
    daysOfContentLeft: 0,
    loading: true,
  });

  const fetch = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      const userId = userData.user.id;

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const [publishedRes, scheduledRes] = await Promise.all([
        supabase
          .from('content_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'published')
          .gte('published_at', weekStart.toISOString()),
        supabase
          .from('content_posts')
          .select('id, scheduled_at', { count: 'exact' })
          .eq('user_id', userId)
          .eq('status', 'scheduled')
          .gte('scheduled_at', now.toISOString())
          .order('scheduled_at', { ascending: true }),
      ]);

      const published = publishedRes.count ?? 0;
      const scheduled = scheduledRes.count ?? 0;
      const scheduledPosts = scheduledRes.data ?? [];

      // Estimate days of content left based on scheduled posts
      let daysLeft = 0;
      if (scheduledPosts.length > 0) {
        const lastDate = new Date(scheduledPosts[scheduledPosts.length - 1].scheduled_at);
        daysLeft = Math.max(0, Math.ceil((lastDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      let level: VisibilityLevel;
      let headline: string;
      let detail: string;

      if (scheduled === 0 && published === 0) {
        level = 'risk';
        headline = "You're currently invisible.";
        detail = "Nothing is keeping you visible right now.";
      } else if (daysLeft <= 2 || scheduled < 3) {
        level = 'warning';
        headline = "You're about to go quiet.";
        detail = `${daysLeft} day${daysLeft !== 1 ? 's' : ''} of content left.`;
      } else {
        level = 'good';
        headline = "You stayed visible this week.";
        detail = `${published} post${published !== 1 ? 's' : ''} published. No gaps.`;
      }

      setStatus({
        level,
        headline,
        detail,
        postsPublishedThisWeek: published,
        queueCount: scheduled,
        daysOfContentLeft: daysLeft,
        loading: false,
      });
    } catch {
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...status, refetch: fetch };
}

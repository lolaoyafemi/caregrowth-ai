import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { addDays, startOfDay, endOfDay } from 'date-fns';

export interface ProactiveNudge {
  id: string;
  type: 'calendar_gap' | 'best_performer' | 'format_balance' | 'connection_health' | 'seasonal';
  icon: string;
  message: string;
  cta?: string;
  action?: 'generate' | 'connect' | 'subscribe' | 'refresh' | 'none';
  priority: number; // lower = higher priority
}

interface PostSummary {
  scheduled_at: string;
  status: string;
  post_format: string;
  content_anchor: string | null;
  demand_moment_type: string | null;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
}

interface ConnectedAccount {
  platform: string;
  is_connected: boolean;
  token_expires_at: string | null;
}

const SEASONAL_TOPICS = [
  { months: [11, 0, 1], topic: 'holiday loneliness', message: 'The holidays can be isolating for seniors. Want me to prepare a few comforting posts?' },
  { months: [2, 3], topic: 'spring transitions', message: 'Spring often brings changes in care routines. Want me to line up some helpful posts?' },
  { months: [4, 5], topic: 'hospital discharge', message: "Families often feel overwhelmed around hospital discharge. Want me to prepare a few posts for that?" },
  { months: [6, 7], topic: 'caregiver burnout', message: "Summer can intensify caregiver fatigue. Want me to create posts that speak to that?" },
  { months: [8, 9, 10], topic: 'care planning', message: "Fall is when many families start planning long-term care. Want me to get some posts ready?" },
];

export function useProactiveNudge() {
  const [nudge, setNudge] = useState<ProactiveNudge | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const evaluate = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      const userId = userData.user.id;

      // Fetch data in parallel
      const [postsRes, connectionsRes, profileRes, creditsRes] = await Promise.all([
        supabase
          .from('content_posts')
          .select('scheduled_at, status, post_format, content_anchor, demand_moment_type, likes, comments, shares, impressions')
          .eq('user_id', userId),
        supabase
          .from('connected_accounts')
          .select('platform, is_connected, token_expires_at')
          .eq('user_id', userId),
        supabase
          .from('user_profiles')
          .select('credits, credits_expire_at, status, plan_name')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle(),
      ]);

      const posts: PostSummary[] = (postsRes.data || []).map((p: any) => ({
        scheduled_at: p.scheduled_at,
        status: p.status,
        post_format: p.post_format || 'single',
        content_anchor: p.content_anchor,
        demand_moment_type: p.demand_moment_type,
        likes: p.likes || 0,
        comments: p.comments || 0,
        shares: p.shares || 0,
        impressions: p.impressions || 0,
      }));

      const connections: ConnectedAccount[] = (connectionsRes.data || []).map((c: any) => ({
        platform: c.platform,
        is_connected: c.is_connected,
        token_expires_at: c.token_expires_at,
      }));

      const profile = profileRes.data;
      const hasActiveSub = !!creditsRes.data;
      const candidates: ProactiveNudge[] = [];

      // 1. Calendar Gap — check next 7 days for empty days
      const now = new Date();
      const futurePosts = posts.filter(
        p => p.status === 'scheduled' && new Date(p.scheduled_at) > now
      );
      const next7Days = Array.from({ length: 7 }, (_, i) => addDays(now, i + 1));
      const emptyDays = next7Days.filter(day => {
        const dayStart = startOfDay(day).getTime();
        const dayEnd = endOfDay(day).getTime();
        return !futurePosts.some(p => {
          const t = new Date(p.scheduled_at).getTime();
          return t >= dayStart && t <= dayEnd;
        });
      });

      if (emptyDays.length >= 4) {
        candidates.push({
          id: 'calendar_gap',
          type: 'calendar_gap',
          icon: '📅',
          message: "Your calendar is getting quiet. Want me to line up next week's posts?",
          cta: 'Generate Posts',
          action: 'generate',
          priority: 1,
        });
      }

      // 2. Best Performer — find top content_anchor from published posts
      const published = posts.filter(p => p.status === 'published');
      if (published.length >= 3) {
        const anchorScore: Record<string, number> = {};
        for (const p of published) {
          const anchor = p.content_anchor || 'general';
          anchorScore[anchor] = (anchorScore[anchor] || 0) + p.likes + p.comments + p.shares;
        }
        const sorted = Object.entries(anchorScore).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0 && sorted[0][1] > 0) {
          const topAnchor = sorted[0][0];
          candidates.push({
            id: 'best_performer',
            type: 'best_performer',
            icon: '⭐',
            message: `Your ${topAnchor} posts are getting the most attention right now. Want more like that next week?`,
            cta: 'Generate More',
            action: 'generate',
            priority: 2,
          });
        }
      }

      // 3. Format Balance — check if >80% are single format
      const recentPosts = posts.filter(p => new Date(p.scheduled_at) > addDays(now, -14));
      if (recentPosts.length >= 5) {
        const singleCount = recentPosts.filter(p => p.post_format === 'single').length;
        const carouselCount = recentPosts.filter(p => p.post_format === 'carousel').length;
        const singleRatio = singleCount / recentPosts.length;
        const carouselRatio = carouselCount / recentPosts.length;

        if (singleRatio > 0.8) {
          candidates.push({
            id: 'format_balance_carousel',
            type: 'format_balance',
            icon: '🎨',
            message: 'Your feed has leaned heavily on single posts lately. Want me to mix in a few carousels?',
            cta: 'Balance It Out',
            action: 'generate',
            priority: 3,
          });
        } else if (carouselRatio > 0.8) {
          candidates.push({
            id: 'format_balance_single',
            type: 'format_balance',
            icon: '🎨',
            message: "You've been posting lots of carousels. Want me to add some punchy single posts to the mix?",
            cta: 'Balance It Out',
            action: 'generate',
            priority: 3,
          });
        }
      }

      // 4. Connection Health
      // Check subscription
      if (!hasActiveSub && profile?.plan_name) {
        candidates.push({
          id: 'sub_inactive',
          type: 'connection_health',
          icon: '⏸️',
          message: 'Posting is paused because your subscription is inactive. Reactivate to resume your scheduled posts.',
          cta: 'Reactivate',
          action: 'subscribe',
          priority: 0, // highest
        });
      }

      // Check token expiry on connected accounts
      for (const conn of connections) {
        if (conn.is_connected && conn.token_expires_at) {
          const expiresAt = new Date(conn.token_expires_at);
          const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          if (daysUntilExpiry > 0 && daysUntilExpiry < 7) {
            const platformName = conn.platform.charAt(0).toUpperCase() + conn.platform.slice(1);
            candidates.push({
              id: `token_expiry_${conn.platform}`,
              type: 'connection_health',
              icon: '🔗',
              message: `${platformName} is still connected, but it needs a quick refresh soon to keep posting smoothly.`,
              cta: 'Refresh Connection',
              action: 'refresh',
              priority: 1,
            });
            break; // only show one
          }
        }
      }

      // Check credit expiry
      if (profile?.credits_expire_at) {
        const creditsExpire = new Date(profile.credits_expire_at);
        const daysUntil = (creditsExpire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntil > 0 && daysUntil < 5 && (profile.credits || 0) > 0) {
          candidates.push({
            id: 'credits_expiring',
            type: 'connection_health',
            icon: '⏳',
            message: `You have ${profile.credits} credits expiring soon. Use them to schedule more posts before they expire.`,
            cta: 'Generate Posts',
            action: 'generate',
            priority: 1,
          });
        }
      }

      // 5. Seasonal / Situational
      const currentMonth = now.getMonth();
      const seasonalMatch = SEASONAL_TOPICS.find(s => s.months.includes(currentMonth));
      // Only show seasonal if no higher-priority nudge with engagement data
      if (seasonalMatch && candidates.filter(c => c.priority <= 2).length === 0) {
        candidates.push({
          id: `seasonal_${seasonalMatch.topic}`,
          type: 'seasonal',
          icon: '🌿',
          message: seasonalMatch.message,
          cta: 'Prepare Posts',
          action: 'generate',
          priority: 4,
        });
      }

      // No recent activity nudge — if no posts generated in last 14 days
      if (posts.length === 0 || !posts.some(p => new Date(p.scheduled_at) > addDays(now, -14))) {
        candidates.push({
          id: 'no_activity',
          type: 'calendar_gap',
          icon: '👋',
          message: "It's been a while since your last batch. Want me to get your calendar going again?",
          cta: 'Get Started',
          action: 'generate',
          priority: 1,
        });
      }

      // Pick highest priority (lowest number)
      candidates.sort((a, b) => a.priority - b.priority);
      setNudge(candidates[0] || null);
    } catch (err) {
      console.error('Nudge evaluation error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    nudge: dismissed ? null : nudge,
    loading,
    dismiss,
    refetch: evaluate,
  };
}

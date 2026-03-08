import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StrategyCard {
  id: string;
  icon: string;
  insight: string;
  reason: string;
  ctaLabel: string;
  ctaLink: string;
  priority: number;
}

export function useStrategyFeed() {
  const [cards, setCards] = useState<StrategyCard[]>([]);
  const [loading, setLoading] = useState(true);

  const evaluate = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      const userId = userData.user.id;

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Parallel data fetches
      const [postsRes, profileRes, agencyRes] = await Promise.all([
        supabase
          .from('content_posts')
          .select('scheduled_at, status, content_anchor, likes, comments, shares, saves, post_format, demand_moment_type')
          .eq('user_id', userId),
        supabase
          .from('user_profiles')
          .select('business_name, core_service, ideal_client, services, service_area')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('agencies')
          .select('id')
          .eq('admin_user_id', userId)
          .maybeSingle(),
      ]);

      const posts = postsRes.data || [];
      const profile = profileRes.data;
      const results: StrategyCard[] = [];

      // 1. Calendar gap detection
      const futurePosts = posts.filter(
        p => new Date(p.scheduled_at) >= now && new Date(p.scheduled_at) <= nextWeek
      );
      const scheduledDays = new Set(
        futurePosts.map(p => new Date(p.scheduled_at).toDateString())
      );
      const emptyDays = 7 - scheduledDays.size;
      if (emptyDays >= 4) {
        results.push({
          id: 'calendar-gap',
          icon: '📅',
          insight: `You have ${emptyDays === 7 ? 'no' : 'only ' + (7 - emptyDays)} post${7 - emptyDays === 1 ? '' : 's'} scheduled next week.`,
          reason: 'Consistent posting keeps your agency visible to families actively searching for care.',
          ctaLabel: 'Generate a 7-day plan',
          ctaLink: '/dashboard/content-calendar',
          priority: 10,
        });
      }

      // 2. High-performing content anchor (with deeper analysis)
      const recentPublished = posts.filter(
        p => p.status === 'published' && new Date(p.scheduled_at) >= weekAgo
      );
      const anchorEngagement: Record<string, { total: number; comments: number; count: number }> = {};
      for (const p of recentPublished) {
        const anchor = p.content_anchor || 'general';
        if (!anchorEngagement[anchor]) anchorEngagement[anchor] = { total: 0, comments: 0, count: 0 };
        anchorEngagement[anchor].total += (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0);
        anchorEngagement[anchor].comments += (p.comments || 0);
        anchorEngagement[anchor].count++;
      }
      const topAnchor = Object.entries(anchorEngagement)
        .filter(([k]) => k !== 'general')
        .sort((a, b) => b[1].total - a[1].total)[0];

      if (topAnchor && topAnchor[1].total > 0) {
        results.push({
          id: 'top-anchor',
          icon: '🔥',
          insight: `Your "${topAnchor[0]}" posts are getting strong engagement.`,
          reason: 'Doubling down on what resonates builds trust and positions your agency as the go-to expert.',
          ctaLabel: 'Create more like this',
          ctaLink: '/dashboard/content-calendar',
          priority: 8,
        });
      }

      // 2b. Reassurance / demand moment insight
      const momentComments: Record<string, number> = {};
      for (const p of recentPublished) {
        const moment = p.demand_moment_type || 'general';
        momentComments[moment] = (momentComments[moment] || 0) + (p.comments || 0);
      }
      const topMoment = Object.entries(momentComments)
        .filter(([k]) => k !== 'general')
        .sort((a, b) => b[1] - a[1])[0];
      if (topMoment && topMoment[1] > 0) {
        results.push({
          id: 'demand-moment',
          icon: '💬',
          insight: `"${topMoment[0]}" posts are generating more comments.`,
          reason: 'Comments signal trust and interest — families engaging with your content are closer to reaching out.',
          ctaLabel: 'Create a similar post',
          ctaLink: '/dashboard/social-media',
          priority: 7,
        });
      }

      // 2c. Format performance insight
      const formatPerf: Record<string, { total: number; count: number }> = {};
      for (const p of recentPublished) {
        const fmt = p.post_format || 'single';
        if (!formatPerf[fmt]) formatPerf[fmt] = { total: 0, count: 0 };
        formatPerf[fmt].total += (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0);
        formatPerf[fmt].count++;
      }
      const fmtEntries = Object.entries(formatPerf).filter(([, v]) => v.count > 0);
      if (fmtEntries.length >= 2) {
        fmtEntries.sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count));
        const best = fmtEntries[0];
        const bestAvg = best[1].total / best[1].count;
        const secondAvg = fmtEntries[1][1].total / fmtEntries[1][1].count;
        if (bestAvg > secondAvg * 1.3) {
          const label = best[0] === 'carousel' ? 'Carousel posts' : best[0] === 'single' ? 'Single image posts' : `${best[0]} posts`;
          results.push({
            id: 'format-winner',
            icon: '📊',
            insight: `${label} are outperforming other formats.`,
            reason: `They average ${Math.round(bestAvg)} interactions — consider using this format more often.`,
            ctaLabel: 'Try this format',
            ctaLink: '/dashboard/content-calendar',
            priority: 6,
          });
        }
      }

      // 3. Incomplete onboarding / missing profile fields
      if (profile) {
        const missing: string[] = [];
        if (!profile.business_name) missing.push('business name');
        if (!profile.core_service) missing.push('core service');
        if (!profile.ideal_client) missing.push('ideal client');
        if (!profile.service_area) missing.push('service area');

        if (missing.length > 0) {
          results.push({
            id: 'incomplete-profile',
            icon: '✏️',
            insight: `Your profile is missing: ${missing.slice(0, 2).join(', ')}.`,
            reason: 'A complete profile helps our AI generate content that sounds like your agency, not a template.',
            ctaLabel: 'Complete your profile',
            ctaLink: '/dashboard/content-calendar',
            priority: 7,
          });
        }
      }

      // 4. Low posting activity (no posts generated in 14 days)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const recentAny = posts.filter(p => new Date(p.scheduled_at) >= twoWeeksAgo);
      if (recentAny.length === 0 && posts.length > 0) {
        results.push({
          id: 'low-activity',
          icon: '💤',
          insight: "It's been a while since your last content batch.",
          reason: 'Families search for care providers every day. Staying active keeps you top-of-mind when they need you.',
          ctaLabel: 'Start posting again',
          ctaLink: '/dashboard/content-calendar',
          priority: 9,
        });
      }

      // 5. Seasonal / situational opportunity
      const month = now.getMonth();
      const seasonalTopics: Record<number, { topic: string; insight: string }> = {
        0: { topic: 'New Year wellness', insight: 'Families often set caregiving goals in January. A post about fresh starts could resonate.' },
        1: { topic: 'heart health', insight: "February is Heart Health Month — a perfect time to address families' health concerns." },
        2: { topic: 'spring transitions', insight: 'Spring often brings care transitions. Families may be re-evaluating their options.' },
        3: { topic: 'caregiver appreciation', insight: 'With spring cleaning season, families reassess home care needs.' },
        4: { topic: 'hospital discharge', insight: 'Discharge rates rise in late spring. Families need guidance on next steps.' },
        5: { topic: 'summer safety', insight: "Summer heat brings safety concerns for seniors. It's a great topic to address." },
        6: { topic: 'caregiver burnout', insight: 'Mid-year is when caregiver fatigue peaks. Offer relief-focused content.' },
        7: { topic: 'back-to-school transitions', insight: 'When kids go back to school, family caregivers lose their support system.' },
        8: { topic: 'fall prevention', insight: "Falls Awareness Week is in September. It's a high-interest safety topic." },
        9: { topic: 'flu season prep', insight: 'Flu season preparation content helps position your agency as proactive.' },
        10: { topic: 'holiday planning', insight: 'Families start planning holiday care arrangements now.' },
        11: { topic: 'holiday loneliness', insight: 'Holiday loneliness is a major concern. Compassionate content stands out.' },
      };
      const seasonal = seasonalTopics[month];
      if (seasonal) {
        results.push({
          id: 'seasonal',
          icon: '🌱',
          insight: seasonal.insight,
          reason: `Timely content about "${seasonal.topic}" shows families you understand their world right now.`,
          ctaLabel: 'Create a timely post',
          ctaLink: '/dashboard/social-media',
          priority: 5,
        });
      }

      // 6. Format diversity suggestion
      const recentFormats = posts.filter(p => new Date(p.scheduled_at) >= weekAgo);
      const singleCount = recentFormats.filter(p => p.post_format === 'single').length;
      const carouselCount = recentFormats.filter(p => p.post_format === 'carousel').length;
      if (recentFormats.length >= 3 && singleCount > 0 && carouselCount === 0) {
        results.push({
          id: 'format-mix',
          icon: '🎨',
          insight: "Your recent posts have all been single images.",
          reason: 'Carousels tend to get more saves and shares. Mixing formats keeps your feed fresh and engaging.',
          ctaLabel: 'Try a carousel',
          ctaLink: '/dashboard/content-calendar',
          priority: 4,
        });
      }

      // Sort by priority, take top 4
      results.sort((a, b) => b.priority - a.priority);
      setCards(results.slice(0, 4));
    } catch (err) {
      console.error('Strategy feed error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  return { cards, loading, refetch: evaluate };
}

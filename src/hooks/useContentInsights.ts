import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ContentInsight {
  id: string;
  icon: string;
  headline: string;
  detail: string;
  category: 'topic' | 'anchor' | 'format' | 'trigger' | 'trend';
  strength: number; // 0-100 confidence/relevance score
}

interface PostRecord {
  content_anchor: string | null;
  demand_moment_type: string | null;
  topic_keywords: string[] | null;
  platform: string;
  post_format: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  impressions: number;
  status: string;
  scheduled_at: string;
  engagement_hook: string | null;
}

function engagementOf(p: PostRecord) {
  return (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0);
}

function rankMap(map: Record<string, { total: number; count: number }>) {
  return Object.entries(map)
    .filter(([k]) => k !== 'general' && k !== 'null')
    .map(([key, v]) => ({ key, total: v.total, avg: v.count > 0 ? v.total / v.count : 0, count: v.count }))
    .sort((a, b) => b.total - a.total);
}

export function useContentInsights() {
  const [insights, setInsights] = useState<ContentInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [topTopics, setTopTopics] = useState<string[]>([]);
  const [topAnchors, setTopAnchors] = useState<string[]>([]);
  const [bestFormat, setBestFormat] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;

      const { data, error } = await supabase
        .from('content_posts')
        .select('content_anchor, demand_moment_type, topic_keywords, platform, post_format, likes, comments, shares, saves, impressions, status, scheduled_at, engagement_hook')
        .eq('user_id', userData.user.id);

      if (error) throw error;
      const posts: PostRecord[] = (data || []) as PostRecord[];

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const published = posts.filter(p => p.status === 'published' && new Date(p.scheduled_at) >= thirtyDaysAgo);

      if (published.length < 2) {
        setInsights([{
          id: 'not-enough-data',
          icon: '📊',
          headline: 'Keep posting to unlock insights',
          detail: 'Once you have a few published posts, we\'ll show you what\'s working best.',
          category: 'trend',
          strength: 0,
        }]);
        setLoading(false);
        return;
      }

      const results: ContentInsight[] = [];

      // --- Top-performing topics (by topic_keywords) ---
      const topicMap: Record<string, { total: number; count: number }> = {};
      for (const p of published) {
        const eng = engagementOf(p);
        for (const kw of (p.topic_keywords || [])) {
          if (!topicMap[kw]) topicMap[kw] = { total: 0, count: 0 };
          topicMap[kw].total += eng;
          topicMap[kw].count++;
        }
      }
      const rankedTopics = rankMap(topicMap);
      const topTopicsList = rankedTopics.slice(0, 3).map(t => t.key);
      setTopTopics(topTopicsList);

      if (rankedTopics[0] && rankedTopics[0].total > 0) {
        results.push({
          id: 'top-topic',
          icon: '🎯',
          headline: `Posts about "${rankedTopics[0].key}" are getting the most engagement`,
          detail: `${rankedTopics[0].count} post${rankedTopics[0].count > 1 ? 's' : ''} on this topic averaged ${Math.round(rankedTopics[0].avg)} interactions each.`,
          category: 'topic',
          strength: Math.min(100, rankedTopics[0].total * 10),
        });
      }
      if (rankedTopics[1] && rankedTopics[1].total > 0) {
        results.push({
          id: 'second-topic',
          icon: '📌',
          headline: `"${rankedTopics[1].key}" is also resonating with families`,
          detail: `This topic is your second-highest performer with ${rankedTopics[1].total} total interactions.`,
          category: 'topic',
          strength: Math.min(100, rankedTopics[1].total * 8),
        });
      }

      // --- Best content anchors ---
      const anchorMap: Record<string, { total: number; count: number }> = {};
      for (const p of published) {
        const anchor = p.content_anchor || 'general';
        if (!anchorMap[anchor]) anchorMap[anchor] = { total: 0, count: 0 };
        anchorMap[anchor].total += engagementOf(p);
        anchorMap[anchor].count++;
      }
      const rankedAnchors = rankMap(anchorMap);
      setTopAnchors(rankedAnchors.slice(0, 3).map(a => a.key));

      if (rankedAnchors[0] && rankedAnchors[0].total > 0) {
        results.push({
          id: 'top-anchor',
          icon: '⚓',
          headline: `"${rankedAnchors[0].key}" content anchors drive the strongest response`,
          detail: `Consider creating more posts with this theme — it consistently performs well.`,
          category: 'anchor',
          strength: Math.min(100, rankedAnchors[0].total * 10),
        });
      }

      // --- Best performing format ---
      const formatMap: Record<string, { total: number; count: number }> = {};
      for (const p of published) {
        const fmt = p.post_format || 'single';
        if (!formatMap[fmt]) formatMap[fmt] = { total: 0, count: 0 };
        formatMap[fmt].total += engagementOf(p);
        formatMap[fmt].count++;
      }
      const rankedFormats = rankMap(formatMap);
      const topFormat = rankedFormats[0];
      setBestFormat(topFormat?.key || null);

      if (topFormat && rankedFormats.length > 1) {
        const second = rankedFormats[1];
        if (topFormat.avg > second.avg * 1.2) {
          const formatLabel = topFormat.key === 'carousel' ? 'Carousel posts' : topFormat.key === 'single' ? 'Single image posts' : `${topFormat.key} posts`;
          results.push({
            id: 'best-format',
            icon: '🎨',
            headline: `${formatLabel} are outperforming other formats`,
            detail: `They average ${Math.round(topFormat.avg)} interactions vs ${Math.round(second.avg)} for ${second.key} posts.`,
            category: 'format',
            strength: Math.min(100, Math.round((topFormat.avg / Math.max(second.avg, 1)) * 40)),
          });
        }
      }

      // --- Common engagement triggers ---
      const triggerMap: Record<string, { total: number; count: number }> = {};
      for (const p of published) {
        const moment = p.demand_moment_type || 'general';
        if (!triggerMap[moment]) triggerMap[moment] = { total: 0, count: 0 };
        triggerMap[moment].total += (p.comments || 0);
        triggerMap[moment].count++;
      }
      const rankedTriggers = rankMap(triggerMap);
      if (rankedTriggers[0] && rankedTriggers[0].total > 0) {
        results.push({
          id: 'engagement-trigger',
          icon: '💬',
          headline: `"${rankedTriggers[0].key}" posts are generating more comments`,
          detail: `These demand moments create natural conversation starters for families.`,
          category: 'trigger',
          strength: Math.min(100, rankedTriggers[0].total * 12),
        });
      }

      // --- Engagement hook type analysis ---
      const hookMap: Record<string, { total: number; count: number }> = {};
      for (const p of published) {
        const hook = p.engagement_hook || 'none';
        if (hook === 'none') continue;
        if (!hookMap[hook]) hookMap[hook] = { total: 0, count: 0 };
        hookMap[hook].total += (p.comments || 0) + (p.shares || 0);
        hookMap[hook].count++;
      }
      const rankedHooks = rankMap(hookMap);
      if (rankedHooks[0] && rankedHooks[0].total > 0) {
        results.push({
          id: 'hook-type',
          icon: '🪝',
          headline: `"${rankedHooks[0].key}" hooks spark the most conversation`,
          detail: `Posts using this engagement style get ${Math.round(rankedHooks[0].avg)} comments and shares on average.`,
          category: 'trigger',
          strength: Math.min(100, rankedHooks[0].total * 10),
        });
      }

      // Sort by strength, take top 6
      results.sort((a, b) => b.strength - a.strength);
      setInsights(results.slice(0, 6));
    } catch (err) {
      console.error('Content insights error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { analyze(); }, [analyze]);

  return { insights, loading, topTopics, topAnchors, bestFormat, refetch: analyze };
}

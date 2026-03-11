import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EvidenceInsight {
  id: string;
  category: 'trust' | 'inquiry' | 'suggestion';
  icon: string;
  title: string;
  message: string;
  metric?: number;
  trend?: 'up' | 'down' | 'neutral';
}

interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  saves: number;
  content_anchor: string | null;
  demand_moment_type: string | null;
  topic_keywords: string[] | null;
  status: string;
  scheduled_at: string;
}

export function useEvidencePanel() {
  const [insights, setInsights] = useState<EvidenceInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const analyzeData = useCallback((posts: PostMetrics[]): EvidenceInsight[] => {
    const results: EvidenceInsight[] = [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentPosts = posts.filter(
      p => p.status === 'published' && new Date(p.scheduled_at) >= weekAgo
    );

    const totalImpressions = recentPosts.reduce((s, p) => s + (p.impressions || 0), 0);
    const totalComments = recentPosts.reduce((s, p) => s + (p.comments || 0), 0);
    const totalLikes = recentPosts.reduce((s, p) => s + (p.likes || 0), 0);
    const totalShares = recentPosts.reduce((s, p) => s + (p.shares || 0), 0);
    const totalSaves = recentPosts.reduce((s, p) => s + (p.saves || 0), 0);


    // 1. Trust Signals — group by content_anchor
    const anchorEngagement: Record<string, number> = {};
    for (const p of recentPosts) {
      const anchor = p.content_anchor || 'general';
      const engagement = (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0);
      anchorEngagement[anchor] = (anchorEngagement[anchor] || 0) + engagement;
    }
    const topAnchor = Object.entries(anchorEngagement).sort((a, b) => b[1] - a[1])[0];

    results.push({
      id: 'trust',
      category: 'trust',
      icon: '🛡️',
      title: 'Trust Signals',
      message: topAnchor && topAnchor[1] > 0
        ? `Educational posts about "${topAnchor[0]}" are getting the most engagement.`
        : 'Keep posting educational content — trust builds over time.',
      metric: topAnchor?.[1] || 0,
      trend: topAnchor && topAnchor[1] > 0 ? 'up' : 'neutral',
    });

    // 4. Inquiry Triggers — group by demand_moment_type
    const momentEngagement: Record<string, number> = {};
    for (const p of recentPosts) {
      const moment = p.demand_moment_type || 'general';
      const engagement = (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
      momentEngagement[moment] = (momentEngagement[moment] || 0) + engagement;
    }
    const topMoment = Object.entries(momentEngagement).sort((a, b) => b[1] - a[1])[0];

    results.push({
      id: 'inquiry',
      category: 'inquiry',
      icon: '🔔',
      title: 'Inquiry Triggers',
      message: topMoment && topMoment[1] > 0
        ? `Posts about "${topMoment[0]}" are resonating most strongly.`
        : 'As engagement data comes in, we\'ll show which topics drive the most inquiries.',
      metric: topMoment?.[1] || 0,
      trend: topMoment && topMoment[1] > 0 ? 'up' : 'neutral',
    });

    // 5. Content Suggestions — group by topic_keywords
    const keywordEngagement: Record<string, number> = {};
    for (const p of recentPosts) {
      const keywords = p.topic_keywords || [];
      const engagement = (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0);
      for (const kw of keywords) {
        keywordEngagement[kw] = (keywordEngagement[kw] || 0) + engagement;
      }
    }
    const topKeyword = Object.entries(keywordEngagement).sort((a, b) => b[1] - a[1])[0];

    results.push({
      id: 'suggestion',
      category: 'suggestion',
      icon: '💡',
      title: 'Content Suggestion',
      message: topKeyword && topKeyword[1] > 0
        ? `Families are responding well to posts about "${topKeyword[0]}".`
        : 'More data needed — keep posting and we\'ll surface content themes that resonate.',
      metric: topKeyword?.[1] || 0,
      trend: topKeyword && topKeyword[1] > 0 ? 'up' : 'neutral',
    });

    return results;
  }, []);

  const fetchAndAnalyze = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;

      const { data, error } = await supabase
        .from('content_posts')
        .select('likes, comments, shares, impressions, saves, content_anchor, demand_moment_type, topic_keywords, status, scheduled_at')
        .eq('user_id', userData.user.id);

      if (error) throw error;

      const posts: PostMetrics[] = (data || []).map((p: any) => ({
        likes: p.likes || 0,
        comments: p.comments || 0,
        shares: p.shares || 0,
        impressions: p.impressions || 0,
        saves: p.saves || 0,
        content_anchor: p.content_anchor,
        demand_moment_type: p.demand_moment_type,
        topic_keywords: p.topic_keywords,
        status: p.status,
        scheduled_at: p.scheduled_at,
      }));

      setInsights(analyzeData(posts));
    } catch (err) {
      console.error('Evidence panel error:', err);
    } finally {
      setLoading(false);
    }
  }, [analyzeData]);

  useEffect(() => {
    fetchAndAnalyze();
  }, [fetchAndAnalyze]);

  return { insights, loading, refetch: fetchAndAnalyze };
}

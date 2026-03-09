import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ScenarioSuggestion {
  type: 'opportunity' | 'reminder' | 'seasonal';
  title: string;
  description: string;
  scenarioTitle: string;
  scenarioId?: string;
  category: string;
  icon: 'signal' | 'clock' | 'calendar';
}

export function useSmartScenarios() {
  const [suggestions, setSuggestions] = useState<ScenarioSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const generate = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      const userId = userData.user.id;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [leadRes, topicsRes, practiceRes, scenariosRes] = await Promise.all([
        // Recent lead signals (engagement signals)
        supabase
          .from('lead_signals')
          .select('comment_text, commenter_name, platform, post_id')
          .eq('status', 'new')
          .order('created_at', { ascending: false })
          .limit(10),

        // Recent content topics
        supabase
          .from('content_posts')
          .select('topic_keywords, content_anchor, demand_moment_type')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),

        // Recent practice sessions count
        supabase
          .from('voice_practice_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', sevenDaysAgo),

        // Available published scenarios
        supabase
          .from('training_scenarios')
          .select('id, title, description, category, tags')
          .eq('status', 'published')
          .limit(50),
      ]);

      const results: ScenarioSuggestion[] = [];
      const scenarios = scenariosRes.data ?? [];
      const practiceCount = practiceRes.count ?? 0;

      // 1. ENGAGEMENT SIGNALS → match lead comments to scenario categories
      const leads = leadRes.data ?? [];
      const commentKeywords = extractKeywords(leads.map((l) => l.comment_text ?? '').join(' '));

      const signalMatches = matchScenariosToKeywords(scenarios, commentKeywords);
      if (signalMatches.length > 0) {
        const match = signalMatches[0];
        results.push({
          type: 'opportunity',
          title: 'Families are asking about this topic',
          description: `Recent engagement signals relate to ${match.category?.toLowerCase() || 'care conversations'}.`,
          scenarioTitle: match.title,
          scenarioId: match.id,
          category: match.category,
          icon: 'signal',
        });
      }

      // 2. CONTENT TOPICS → suggest practice aligned with recent content
      const posts = topicsRes.data ?? [];
      const topicKeywords = extractKeywords(
        posts
          .flatMap((p) => [...(p.topic_keywords ?? []), p.content_anchor ?? '', p.demand_moment_type ?? ''])
          .join(' ')
      );

      const topicMatches = matchScenariosToKeywords(scenarios, topicKeywords);
      const usedIds = new Set(results.map((r) => r.scenarioId));
      const uniqueTopicMatch = topicMatches.find((m) => !usedIds.has(m.id));
      if (uniqueTopicMatch) {
        results.push({
          type: 'opportunity',
          title: 'Practice what you post about',
          description: `Your recent content covers ${uniqueTopicMatch.category?.toLowerCase() || 'caregiving topics'}. Practice handling those conversations.`,
          scenarioTitle: uniqueTopicMatch.title,
          scenarioId: uniqueTopicMatch.id,
          category: uniqueTopicMatch.category,
          icon: 'signal',
        });
      }

      // 3. SEASONAL PATTERNS
      const month = new Date().getMonth();
      const seasonalCategories = getSeasonalCategories(month);
      const seasonalMatch = scenarios.find(
        (s) =>
          !usedIds.has(s.id) &&
          seasonalCategories.some(
            (kw) =>
              s.title?.toLowerCase().includes(kw) ||
              s.category?.toLowerCase().includes(kw) ||
              s.tags?.some((t: string) => t.toLowerCase().includes(kw))
          )
      );
      if (seasonalMatch) {
        results.push({
          type: 'seasonal',
          title: 'Seasonal conversation prep',
          description: `This time of year, families often reach out about ${seasonalCategories[0]} concerns.`,
          scenarioTitle: seasonalMatch.title,
          scenarioId: seasonalMatch.id,
          category: seasonalMatch.category,
          icon: 'calendar',
        });
      }

      // 4. INACTIVITY REMINDER
      if (practiceCount === 0) {
        const fallback = scenarios.find((s) => !new Set(results.map((r) => r.scenarioId)).has(s.id));
        results.push({
          type: 'reminder',
          title: 'You haven\'t practiced this week',
          description: 'Regular practice improves how your team handles real calls.',
          scenarioTitle: fallback?.title ?? 'Intake Call Practice',
          scenarioId: fallback?.id,
          category: fallback?.category ?? 'Intake Calls',
          icon: 'clock',
        });
      }

      setSuggestions(results.slice(0, 3));
    } catch (err) {
      console.error('Smart scenario error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { generate(); }, [generate]);

  return { suggestions, loading };
}

/* ---- Helpers ---- */

const CARE_KEYWORDS = [
  'hospital', 'discharge', 'dementia', 'memory', 'cost', 'price', 'afford',
  'burnout', 'caregiver', 'respite', 'safety', 'trust', 'intake', 'loneliness',
  'companion', 'hospice', 'surgery', 'recovery', 'fall', 'medication',
];

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return CARE_KEYWORDS.filter((kw) => lower.includes(kw));
}

function matchScenariosToKeywords(
  scenarios: any[],
  keywords: string[]
): any[] {
  if (keywords.length === 0) return [];
  return scenarios
    .map((s) => {
      const blob = [s.title, s.description, s.category, ...(s.tags ?? [])]
        .join(' ')
        .toLowerCase();
      const score = keywords.filter((kw) => blob.includes(kw)).length;
      return { ...s, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

function getSeasonalCategories(month: number): string[] {
  // winter holidays
  if (month === 10 || month === 11) return ['loneliness', 'holiday', 'companion'];
  // flu season
  if (month === 0 || month === 1) return ['hospital', 'discharge', 'recovery'];
  // spring
  if (month >= 2 && month <= 4) return ['caregiver', 'burnout', 'respite'];
  // summer
  if (month >= 5 && month <= 7) return ['safety', 'fall', 'dementia'];
  // fall
  return ['intake', 'cost', 'trust'];
}

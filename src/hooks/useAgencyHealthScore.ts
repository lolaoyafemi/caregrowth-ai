import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HealthPillar {
  name: string;
  score: number;
  maxScore: number;
  description: string;
  actionLabel?: string;
  actionPath?: string;
}

export interface AgencyHealthScore {
  totalScore: number;
  pillars: HealthPillar[];
  suggestions: { text: string; actionLabel: string; actionPath: string }[];
  loading: boolean;
}

export function useAgencyHealthScore(): AgencyHealthScore {
  const [data, setData] = useState<AgencyHealthScore>({
    totalScore: 0,
    pillars: [],
    suggestions: [],
    loading: true,
  });

  const calculate = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      const userId = userData.user.id;

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Parallel fetch all metrics
      const [
        scheduledPostsRes,
        agencyRes,
        agencyProfileRes,
        voiceSessionsRes,
        recentActivityRes,
        leadSignalsRes,
      ] = await Promise.all([
        // 1. Visibility: scheduled posts
        supabase
          .from('content_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'scheduled'),

        // 2. Agency setup - get agency_id first
        supabase.from('agencies').select('id').eq('admin_user_id', userId).maybeSingle(),

        // Get agency profile (will use agency_id below)
        supabase.from('agency_profiles').select('*').limit(1),

        // 4. Practice Gym: voice sessions in past 7 days
        supabase
          .from('voice_practice_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', sevenDaysAgo),

        // 5. Consistency: any platform activity in past 7 days
        supabase
          .from('content_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', sevenDaysAgo),

        // 3. Engagement: lead signals responded to
        supabase
          .from('lead_signals')
          .select('id, status', { count: 'exact' })
          .in('status', ['reviewed', 'responded']),
      ]);

      // Calculate each pillar (20 points max each)
      const pillars: HealthPillar[] = [];

      // 1. VISIBILITY (scheduled posts)
      const scheduledCount = scheduledPostsRes.count ?? 0;
      const visibilityScore = Math.min(20, scheduledCount * 4); // 5+ posts = 20 points
      pillars.push({
        name: 'Visibility',
        score: visibilityScore,
        maxScore: 20,
        description: 'Content scheduled in calendar',
        actionLabel: 'Schedule Posts',
        actionPath: '/dashboard/content-calendar',
      });

      // 2. ENGAGEMENT (response to signals)
      const engagementCount = leadSignalsRes.count ?? 0;
      const engagementScore = Math.min(20, engagementCount * 5); // 4+ responses = 20 points
      pillars.push({
        name: 'Engagement',
        score: engagementScore,
        maxScore: 20,
        description: 'Community interaction',
        actionLabel: 'View Signals',
        actionPath: '/dashboard/content-calendar',
      });

      // 3. AGENCY SETUP COMPLETION
      let setupScore = 0;
      if (agencyRes.data?.id) {
        // Fetch the actual agency profile
        const { data: profile } = await supabase
          .from('agency_profiles')
          .select('*')
          .eq('agency_id', agencyRes.data.id)
          .maybeSingle();

        if (profile) {
          if (profile.agency_name) setupScore += 4;
          if (profile.service_area) setupScore += 4;
          if (profile.services_offered?.length > 0) setupScore += 4;
          if (profile.caregiving_focus?.length > 0) setupScore += 4;
          if (profile.tone_preference) setupScore += 4;
        }
      }
      pillars.push({
        name: 'Agency Setup',
        score: setupScore,
        maxScore: 20,
        description: 'Profile completeness',
        actionLabel: 'Complete Setup',
        actionPath: '/dashboard/agency-setup',
      });

      // 4. PRACTICE GYM USAGE
      const practiceCount = voiceSessionsRes.count ?? 0;
      const practiceScore = Math.min(20, practiceCount * 10); // 2+ sessions/week = 20 points
      pillars.push({
        name: 'Practice Gym',
        score: practiceScore,
        maxScore: 20,
        description: 'Weekly conversation practice',
        actionLabel: 'Start Practice',
        actionPath: '/dashboard/training-practice',
      });

      // 5. CONSISTENCY
      const recentCount = recentActivityRes.count ?? 0;
      const consistencyScore = Math.min(20, recentCount * 3); // 7+ activities = 20 points
      pillars.push({
        name: 'Consistency',
        score: consistencyScore,
        maxScore: 20,
        description: 'Activity over past 7 days',
        actionLabel: 'Create Content',
        actionPath: '/dashboard/social-media',
      });

      const totalScore = pillars.reduce((sum, p) => sum + p.score, 0);

      // Generate suggestions for lowest scoring pillars
      const suggestions: { text: string; actionLabel: string; actionPath: string }[] = [];
      const sortedPillars = [...pillars].sort((a, b) => a.score - b.score);

      sortedPillars.slice(0, 2).forEach((pillar) => {
        if (pillar.score < pillar.maxScore && pillar.actionPath) {
          const pointsNeeded = pillar.maxScore - pillar.score;
          suggestions.push({
            text: `Improve your ${pillar.name} score (+${pointsNeeded} points)`,
            actionLabel: pillar.actionLabel || 'Take Action',
            actionPath: pillar.actionPath,
          });
        }
      });

      setData({
        totalScore,
        pillars,
        suggestions,
        loading: false,
      });
    } catch (error) {
      console.error('Error calculating health score:', error);
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    calculate();
  }, [calculate]);

  return data;
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Predictive Intelligence Layer — analyze-trends
 *
 * Runs daily. For each user:
 * 1. Stores today's signal snapshot into signal_history
 * 2. Computes engagement, visibility, conversion trends (last 3d vs prev 3d)
 * 3. Detects early warning patterns
 * 4. Creates predictive interventions
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Get all users with state data
    const { data: states } = await supabase
      .from('user_state')
      .select('user_id, visibility_state, engagement_state, conversion_state, queue_count, engagement_score, conversion_score, momentum_score')
      .not('user_id', 'is', null);

    if (!states || states.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;
    const predictions: string[] = [];

    for (const state of states) {
      try {
        const userId = state.user_id;

        // ── Store today's signal snapshot ─────────────────────────
        // Normalize scores to 0-100
        const visScore = state.visibility_state === 'active' ? 100 : state.visibility_state === 'low' ? 40 : 0;
        const engScore = Math.min(100, Math.round((state.engagement_score ?? 0) / 40 * 100));
        const convScore = Math.min(100, Math.round((state.conversion_score ?? 0) / 20 * 100));
        const momScore = state.momentum_score ?? 0;

        await supabase
          .from('signal_history')
          .upsert({
            user_id: userId,
            date: today,
            visibility_score: visScore,
            engagement_score: engScore,
            conversion_score: convScore,
            momentum_score: momScore,
          }, { onConflict: 'user_id,date' });

        // ── Pull last 7 days of signal history ───────────────────
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
        const { data: history } = await supabase
          .from('signal_history')
          .select('date, visibility_score, engagement_score, conversion_score, momentum_score')
          .eq('user_id', userId)
          .gte('date', sevenDaysAgo)
          .order('date', { ascending: true });

        if (!history || history.length < 3) {
          processed++;
          continue; // Need at least 3 days of data for trend analysis
        }

        // ── Compute trends: last 3 days vs previous 3 days ──────
        const recent = history.slice(-3);
        const previous = history.slice(-6, -3);

        const avgRecent = {
          engagement: avg(recent.map(h => h.engagement_score)),
          conversion: avg(recent.map(h => h.conversion_score)),
          momentum: avg(recent.map(h => h.momentum_score)),
          visibility: avg(recent.map(h => h.visibility_score)),
        };

        const avgPrevious = previous.length >= 2 ? {
          engagement: avg(previous.map(h => h.engagement_score)),
          conversion: avg(previous.map(h => h.conversion_score)),
          momentum: avg(previous.map(h => h.momentum_score)),
          visibility: avg(previous.map(h => h.visibility_score)),
        } : null;

        // Determine trends
        const engTrend = !avgPrevious ? 'stable'
          : avgRecent.engagement > avgPrevious.engagement * 1.15 ? 'rising'
          : avgRecent.engagement < avgPrevious.engagement * 0.75 ? 'falling'
          : 'stable';

        const visTrend = state.queue_count <= 2 || (avgPrevious && avgRecent.visibility < avgPrevious.visibility * 0.7)
          ? 'at_risk' : 'stable';

        const convTrend = !avgPrevious ? 'flat'
          : avgRecent.conversion > avgPrevious.conversion * 1.15 ? 'rising'
          : avgRecent.conversion < avgPrevious.conversion * 0.7 ? 'declining'
          : 'flat';

        // Check momentum declining 3 cycles in a row
        const momDeclining = history.length >= 4 &&
          history.slice(-3).every((h, i) => {
            const prev = history[history.length - 4 + i];
            return prev && h.momentum_score < prev.momentum_score;
          });

        // ── Early Warning Detection & Interventions ──────────────
        const warnings: { type: string; severity: string; message: string; action_label: string; action_path: string }[] = [];

        // Visibility Risk Prediction
        if (visTrend === 'at_risk' && state.visibility_state !== 'empty') {
          warnings.push({
            type: 'predictive_visibility',
            severity: state.queue_count <= 1 ? 'high' : 'medium',
            message: "You're about to go quiet in the next 48 hours.",
            action_label: 'Generate posts',
            action_path: '/dashboard/content-calendar',
          });
        }

        // Engagement Decline Prediction
        if (engTrend === 'falling' && (state.engagement_score ?? 0) > 0) {
          warnings.push({
            type: 'predictive_engagement',
            severity: avgRecent.engagement < 20 ? 'high' : 'medium',
            message: 'Your engagement is starting to drop. Act now before it dies.',
            action_label: 'Boost engagement',
            action_path: '/dashboard/content-calendar',
          });
        }

        // Conversion Risk Prediction
        if (state.engagement_state === 'high' && convTrend === 'declining') {
          warnings.push({
            type: 'predictive_conversion',
            severity: 'medium',
            message: "You're getting attention… but losing buying intent.",
            action_label: 'Create offer post',
            action_path: '/dashboard/content-calendar',
          });
        }

        // Momentum Drop Prediction
        if (momDeclining) {
          warnings.push({
            type: 'predictive_momentum',
            severity: momScore < 40 ? 'high' : 'medium',
            message: "You're losing traction. Small drop now… bigger impact later.",
            action_label: 'Fix this now',
            action_path: '/dashboard/content-calendar',
          });
        }

        // Insert predictive interventions (avoid duplicates)
        for (const warning of warnings) {
          const { data: existing } = await supabase
            .from('interventions')
            .select('id')
            .eq('user_id', userId)
            .eq('type', warning.type)
            .eq('status', 'pending')
            .maybeSingle();

          if (!existing) {
            await supabase
              .from('interventions')
              .insert({
                user_id: userId,
                type: warning.type,
                message: warning.message,
                action_label: warning.action_label,
                action_path: warning.action_path,
                status: 'pending',
              });
            predictions.push(`${warning.type}:${warning.severity}`);
          }
        }

        processed++;
      } catch (userError) {
        console.error(`Error analyzing trends for user ${state.user_id}:`, userError);
      }
    }

    console.log(`✅ Trend analysis complete: ${processed} users, ${predictions.length} predictions`);

    return new Response(JSON.stringify({
      processed,
      total_users: states.length,
      predictions,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Trend analysis error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

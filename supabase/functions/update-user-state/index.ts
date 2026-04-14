import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Signal Optimization Layer — update-user-state
 *
 * Runs on a schedule (every 10-15 min) OR on-demand.
 * For each active user, computes:
 *   1. Visibility signal   (deterministic)
 *   2. Engagement signal    (weighted scoring)
 *   3. Conversion signal    (intent detection)
 *   4. Momentum score       (unified 0-100)
 * Then persists to user_state and creates interventions when needed.
 */

// ── Thresholds ────────────────────────────────────────────────────────
const ENGAGEMENT_HIGH_THRESHOLD = 20;
const CONVERSION_ACTIVE_THRESHOLD = 10;

// ── Intent keyword sets ───────────────────────────────────────────────
const LEAD_KEYWORDS = ['price', 'how much', 'interested', 'details', 'info', 'cost', 'rate', 'availability', 'consultation', 'free assessment', 'schedule', 'appointment'];
const WARM_KEYWORDS = ['helpful', 'i need this', 'nice post', 'great', 'thank you', 'amazing', 'love this', 'so true', 'needed this', 'exactly'];

function classifyIntent(text: string): { label: string; score: number } {
  const lower = text.toLowerCase();
  if (LEAD_KEYWORDS.some(k => lower.includes(k))) return { label: 'lead', score: 5 };
  if (WARM_KEYWORDS.some(k => lower.includes(k))) return { label: 'warm', score: 3 };
  if (lower.length < 5 || /^(lol|ok|nice|cool|👍|❤️|🔥|😂)$/i.test(lower.trim())) return { label: 'ignore', score: 0 };
  return { label: 'cold', score: 1 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // ── Get all users who have content_posts ──────────────────────
    const { data: users } = await supabase
      .from('content_posts')
      .select('user_id')
      .limit(500);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uniqueUserIds = [...new Set(users.map(u => u.user_id))];
    let processed = 0;
    const interventionsCreated: string[] = [];

    for (const userId of uniqueUserIds) {
      try {
        // ── Fetch data in parallel ─────────────────────────────────
        const [scheduledRes, publishedRes, engagementRes, commentsRes] = await Promise.all([
          // Queue count
          supabase
            .from('content_posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'scheduled')
            .gte('scheduled_at', now.toISOString()),

          // Published last 7 days
          supabase
            .from('content_posts')
            .select('published_at, likes, comments, shares, saves')
            .eq('user_id', userId)
            .eq('status', 'published')
            .gte('published_at', weekAgo.toISOString())
            .order('published_at', { ascending: false }),

          // Engagement logs last 7 days
          supabase
            .from('engagement_logs')
            .select('type, intent, source_text, created_at')
            .eq('user_id', userId)
            .gte('created_at', weekAgo.toISOString()),

          // Social conversations last 7 days (for intent detection)
          supabase
            .from('social_conversations')
            .select('comment_text, created_at, ai_classification')
            .eq('user_id', userId)
            .gte('created_at', weekAgo.toISOString()),
        ]);

        const queueCount = scheduledRes.count ?? 0;
        const publishedPosts = publishedRes.data ?? [];
        const engagementLogs = engagementRes.data ?? [];
        const socialComments = commentsRes.data ?? [];

        // ── STEP 1: Visibility Signal ──────────────────────────────
        let daysSinceLastPost = 999;
        if (publishedPosts.length > 0 && publishedPosts[0].published_at) {
          daysSinceLastPost = Math.floor(
            (now.getTime() - new Date(publishedPosts[0].published_at).getTime()) / (1000 * 60 * 60 * 24)
          );
        }

        let visibilityState: string;
        if (queueCount === 0 && publishedPosts.length === 0) {
          visibilityState = 'empty';
        } else if (queueCount < 3 || daysSinceLastPost > 2) {
          visibilityState = 'low';
        } else {
          visibilityState = 'active';
        }

        // Visibility score (0-100 for momentum calc)
        let visibilityScore = 0;
        if (visibilityState === 'active') visibilityScore = 100;
        else if (visibilityState === 'low') visibilityScore = 40;

        // ── STEP 2: Engagement Signal ──────────────────────────────
        // Weighted scoring from published post metrics
        let engagementScore = 0;
        for (const post of publishedPosts) {
          engagementScore += (post.comments ?? 0) * 3;
          engagementScore += (post.shares ?? 0) * 4; // replies/shares weighted high
          engagementScore += (post.likes ?? 0) * 1;
          engagementScore += (post.saves ?? 0) * 2;  // saves = profile clicks proxy
        }

        // Also factor in engagement_logs
        for (const log of engagementLogs) {
          if (log.type === 'comment') engagementScore += 3;
          else if (log.type === 'reply' || log.type === 'share') engagementScore += 4;
          else if (log.type === 'like') engagementScore += 1;
          else engagementScore += 2;
        }

        // Check for 3+ days of zero engagement
        const hasRecentEngagement = engagementLogs.some(
          l => new Date(l.created_at) > threeDaysAgo
        ) || publishedPosts.some(
          p => p.published_at && new Date(p.published_at) > threeDaysAgo &&
            ((p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0) + (p.saves ?? 0)) > 0
        );

        let engagementState: string;
        if (engagementScore > ENGAGEMENT_HIGH_THRESHOLD) {
          engagementState = 'high';
        } else if (engagementScore > 0 && hasRecentEngagement) {
          engagementState = 'low';
        } else {
          engagementState = 'dead';
        }

        // ── STEP 3: Conversion Signal ──────────────────────────────
        let conversionScore = 0;
        let leadCount = 0;

        // Classify social conversations
        for (const comment of socialComments) {
          const classification = classifyIntent(comment.comment_text || '');
          conversionScore += classification.score;
          if (classification.label === 'lead') leadCount++;
        }

        // Also check engagement_logs for intent
        for (const log of engagementLogs) {
          if (log.intent === 'lead') { conversionScore += 5; leadCount++; }
          else if (log.source_text) {
            const classification = classifyIntent(log.source_text);
            conversionScore += classification.score;
            if (classification.label === 'lead') leadCount++;
          }
        }

        let conversionState: string;
        if (conversionScore >= CONVERSION_ACTIVE_THRESHOLD) {
          conversionState = 'active';
        } else if (conversionScore > 0) {
          conversionState = 'passive';
        } else {
          conversionState = 'none';
        }

        // ── STEP 4: Momentum Score ─────────────────────────────────
        // Normalize engagement & conversion to 0-100 scale
        const engNormalized = Math.min(100, Math.round((engagementScore / (ENGAGEMENT_HIGH_THRESHOLD * 2)) * 100));
        const convNormalized = Math.min(100, Math.round((conversionScore / (CONVERSION_ACTIVE_THRESHOLD * 2)) * 100));

        const momentumScore = Math.round(
          visibilityScore * 0.3 +
          engNormalized * 0.4 +
          convNormalized * 0.3
        );

        let momentumLabel: string;
        if (momentumScore >= 80) momentumLabel = 'Strong momentum';
        else if (momentumScore >= 50) momentumLabel = 'Stable';
        else momentumLabel = 'Losing traction';

        // ── STEP 5: Persist to user_state ──────────────────────────
        const lastPostDate = publishedPosts.length > 0 ? publishedPosts[0].published_at : null;
        const lastEngDate = engagementLogs.length > 0 ? engagementLogs[0].created_at : null;

        // Get previous state to detect changes
        const { data: prevState } = await supabase
          .from('user_state')
          .select('engagement_score, visibility_state, engagement_state, conversion_state')
          .eq('user_id', userId)
          .maybeSingle();

        await supabase
          .from('user_state')
          .upsert({
            user_id: userId,
            visibility_state: visibilityState,
            engagement_state: engagementState,
            conversion_state: conversionState,
            queue_count: queueCount,
            last_post_date: lastPostDate,
            last_engagement_date: lastEngDate,
            last_conversion_signal: leadCount > 0 ? now.toISOString() : null,
            engagement_score: engagementScore,
            conversion_score: conversionScore,
            momentum_score: momentumScore,
            momentum_label: momentumLabel,
            last_signal_update: now.toISOString(),
          }, { onConflict: 'user_id' });

        // ── STEP 6: Intervention Triggers ──────────────────────────
        const interventions: { type: string; message: string; action_label: string; action_path: string }[] = [];

        // Visibility Risk
        if (visibilityState === 'empty') {
          interventions.push({
            type: 'visibility_risk',
            message: 'You are currently invisible. Nothing is keeping you visible right now.',
            action_label: 'Fix visibility',
            action_path: '/dashboard/content-calendar',
          });
        }

        // Engagement Drop (>40% drop)
        if (prevState && prevState.engagement_score > 0) {
          const dropPercent = ((prevState.engagement_score - engagementScore) / prevState.engagement_score) * 100;
          if (dropPercent > 40) {
            interventions.push({
              type: 'engagement_drop',
              message: "Your audience is going quiet. Let's wake them up.",
              action_label: 'Boost engagement',
              action_path: '/dashboard/content-calendar',
            });
          }
        }

        // Conversion Opportunity
        if (leadCount > 0) {
          interventions.push({
            type: 'conversion_opportunity',
            message: 'People are asking questions. This is where deals start.',
            action_label: 'Respond now',
            action_path: '/dashboard/content-calendar',
          });
        }

        // Silent Failure: high engagement but no conversion
        if (engagementState === 'high' && conversionState === 'none') {
          interventions.push({
            type: 'silent_failure',
            message: "People are watching… but not taking action. Time for a conversion post.",
            action_label: 'Create offer post',
            action_path: '/dashboard/content-calendar',
          });
        }

        // Insert interventions (avoid duplicates — check for pending ones)
        for (const intervention of interventions) {
          const { data: existing } = await supabase
            .from('interventions')
            .select('id')
            .eq('user_id', userId)
            .eq('type', intervention.type)
            .eq('status', 'pending')
            .maybeSingle();

          if (!existing) {
            await supabase
              .from('interventions')
              .insert({
                user_id: userId,
                type: intervention.type,
                message: intervention.message,
                action_label: intervention.action_label,
                action_path: intervention.action_path,
                status: 'pending',
              });
            interventionsCreated.push(intervention.type);
          }
        }

        processed++;
      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
      }
    }

    console.log(`✅ Signal optimization complete: ${processed} users processed, ${interventionsCreated.length} interventions created`);

    return new Response(JSON.stringify({
      processed,
      total_users: uniqueUserIds.length,
      interventions_created: interventionsCreated,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Signal optimization error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

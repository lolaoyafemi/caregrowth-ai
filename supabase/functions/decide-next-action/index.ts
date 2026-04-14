import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // ── Try to read cached state first ──────────────────────────────
    const { data: cachedState } = await supabase
      .from('user_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Use cached state if updated within last 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (cachedState?.last_signal_update && new Date(cachedState.last_signal_update) > tenMinAgo) {
      const decision = deriveDecision(cachedState);
      return new Response(JSON.stringify({
        decision,
        state: {
          visibility_state: cachedState.visibility_state,
          engagement_state: cachedState.engagement_state,
          conversion_state: cachedState.conversion_state,
          queue_count: cachedState.queue_count,
          engagement_score: cachedState.engagement_score,
          conversion_score: cachedState.conversion_score,
          momentum_score: cachedState.momentum_score,
          momentum_label: cachedState.momentum_label,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Compute fresh if stale ──────────────────────────────────────
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [scheduledRes, publishedRes, engagementRes] = await Promise.all([
      supabase
        .from('content_posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', now.toISOString()),
      supabase
        .from('content_posts')
        .select('published_at, likes, comments, shares, saves')
        .eq('user_id', userId)
        .eq('status', 'published')
        .gte('published_at', weekAgo.toISOString())
        .order('published_at', { ascending: false }),
      supabase
        .from('engagement_logs')
        .select('id, intent, created_at', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', weekAgo.toISOString()),
    ]);

    const queueCount = scheduledRes.count ?? 0;
    const publishedPosts = publishedRes.data ?? [];
    const engagementCount = engagementRes.count ?? 0;

    // Derive states inline
    let visibilityState = 'active';
    if (queueCount === 0 && publishedPosts.length === 0) visibilityState = 'empty';
    else if (queueCount < 3) visibilityState = 'low';

    let engagementScore = 0;
    for (const p of publishedPosts) {
      engagementScore += (p.comments ?? 0) * 3 + (p.shares ?? 0) * 4 + (p.likes ?? 0) * 1 + (p.saves ?? 0) * 2;
    }

    let engagementState = 'dead';
    if (engagementScore > 20) engagementState = 'high';
    else if (engagementScore > 0) engagementState = 'low';

    const leadCount = (engagementRes.data ?? []).filter((l: any) => l.intent === 'lead').length;
    let conversionState = 'none';
    if (leadCount > 0) conversionState = 'active';
    else if (engagementCount > 0) conversionState = 'passive';

    const visScore = visibilityState === 'active' ? 100 : visibilityState === 'low' ? 40 : 0;
    const engNorm = Math.min(100, Math.round((engagementScore / 40) * 100));
    const convNorm = Math.min(100, Math.round((leadCount * 5 / 20) * 100));
    const momentumScore = Math.round(visScore * 0.3 + engNorm * 0.4 + convNorm * 0.3);
    const momentumLabel = momentumScore >= 80 ? 'Strong momentum' : momentumScore >= 50 ? 'Stable' : 'Losing traction';

    // Persist
    await supabase.from('user_state').upsert({
      user_id: userId,
      visibility_state: visibilityState,
      engagement_state: engagementState,
      conversion_state: conversionState,
      queue_count: queueCount,
      last_post_date: publishedPosts[0]?.published_at ?? null,
      engagement_score: engagementScore,
      conversion_score: leadCount * 5,
      momentum_score: momentumScore,
      momentum_label: momentumLabel,
      last_signal_update: now.toISOString(),
    }, { onConflict: 'user_id' });

    const stateObj = {
      visibility_state: visibilityState,
      engagement_state: engagementState,
      conversion_state: conversionState,
      queue_count: queueCount,
      engagement_score: engagementScore,
      conversion_score: leadCount * 5,
      momentum_score: momentumScore,
      momentum_label: momentumLabel,
    };

    const decision = deriveDecision(stateObj);

    return new Response(JSON.stringify({ decision, state: stateObj }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Decision engine error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function deriveDecision(state: any): { category: string; reason: string } {
  if (state.queue_count === 0 || state.visibility_state === 'empty') {
    return { category: 'visibility', reason: 'You are currently invisible — no posts scheduled.' };
  }
  if (state.engagement_state === 'dead') {
    return { category: 'engagement', reason: 'Your audience is inactive — time to spark connection.' };
  }
  if (state.engagement_state === 'low') {
    return { category: 'lead_activation', reason: 'Low interaction — start conversations.' };
  }
  if (state.engagement_state === 'high' && state.conversion_state === 'none') {
    return { category: 'lead_activation', reason: 'Good engagement but no inquiries — activate leads.' };
  }
  if (state.conversion_state === 'active') {
    return { category: 'conversion', reason: 'Leads detected — drive action now.' };
  }
  // Balanced rotation
  const dayRotation = ['visibility', 'engagement', 'authority', 'lead_activation', 'conversion', 'authority', 'engagement'];
  const dayIndex = new Date().getDay();
  return { category: dayRotation[dayIndex], reason: 'Maintaining balanced content strategy.' };
}

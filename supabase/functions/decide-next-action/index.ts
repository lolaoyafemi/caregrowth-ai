import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

interface DecisionResult {
  category: string;
  reason: string;
}

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

    // Verify JWT
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const now = new Date();

    // ── Compute live state from content_posts ──────────────────────
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [scheduledRes, publishedRes, engagementRes, leadRes] = await Promise.all([
      // Queue count: future scheduled posts
      supabase
        .from('content_posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', now.toISOString()),

      // Recent published posts (last 7 days)
      supabase
        .from('content_posts')
        .select('published_at, likes, comments, shares, saves')
        .eq('user_id', userId)
        .eq('status', 'published')
        .gte('published_at', weekAgo.toISOString())
        .order('published_at', { ascending: false }),

      // Engagement logs (last 7 days)
      supabase
        .from('engagement_logs')
        .select('id, intent, created_at', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', weekAgo.toISOString()),

      // Lead signals (last 30 days)
      supabase
        .from('engagement_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('intent', 'lead')
        .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const queueCount = scheduledRes.count ?? 0;
    const publishedPosts = publishedRes.data ?? [];
    const engagementCount = engagementRes.count ?? 0;
    const leadCount = leadRes.count ?? 0;

    // ── Derive states ──────────────────────────────────────────────
    // Visibility state
    let visibilityState: string;
    if (queueCount === 0 && publishedPosts.length === 0) {
      visibilityState = 'empty';
    } else if (queueCount < 3) {
      visibilityState = 'low';
    } else {
      visibilityState = 'active';
    }

    // Engagement state
    const totalEngagement = publishedPosts.reduce((sum, p) => {
      return sum + (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0) + (p.saves ?? 0);
    }, 0);

    let engagementState: string;
    if (publishedPosts.length === 0 || (totalEngagement === 0 && engagementCount === 0)) {
      engagementState = 'dead';
    } else if (totalEngagement < 5 && engagementCount < 3) {
      engagementState = 'low';
    } else {
      engagementState = 'high';
    }

    // Conversion state
    let conversionState: string;
    if (leadCount > 0) {
      conversionState = 'active';
    } else if (engagementCount > 0) {
      conversionState = 'passive';
    } else {
      conversionState = 'none';
    }

    // ── Persist state ──────────────────────────────────────────────
    const lastPostDate = publishedPosts.length > 0 ? publishedPosts[0].published_at : null;
    const lastEngDate = engagementCount > 0 ? (engagementRes.data?.[0]?.created_at ?? null) : null;

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
      }, { onConflict: 'user_id' });

    // ── Decision logic ─────────────────────────────────────────────
    let decision: DecisionResult;

    if (queueCount === 0) {
      decision = { category: 'visibility', reason: 'You are currently invisible — no posts scheduled.' };
    } else if (engagementState === 'dead') {
      decision = { category: 'engagement', reason: 'Your audience is inactive — time to spark connection.' };
    } else if (engagementState === 'low') {
      decision = { category: 'lead_activation', reason: 'Low interaction — start conversations.' };
    } else if (engagementState === 'high' && conversionState === 'none') {
      decision = { category: 'lead_activation', reason: 'Good engagement but no inquiries — activate leads.' };
    } else if (conversionState === 'active') {
      decision = { category: 'conversion', reason: 'Leads detected — drive action now.' };
    } else {
      // Balanced rotation based on day of week
      const dayRotation = ['visibility', 'engagement', 'authority', 'lead_activation', 'conversion', 'authority', 'engagement'];
      const dayIndex = now.getDay();
      decision = { category: dayRotation[dayIndex], reason: 'Maintaining balanced content strategy.' };
    }

    return new Response(JSON.stringify({
      decision,
      state: {
        visibility_state: visibilityState,
        engagement_state: engagementState,
        conversion_state: conversionState,
        queue_count: queueCount,
        published_this_week: publishedPosts.length,
        engagement_count: engagementCount,
        lead_count: leadCount,
      },
    }), {
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

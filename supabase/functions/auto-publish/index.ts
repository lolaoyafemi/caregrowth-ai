import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all scheduled posts that are due
    const { data: duePosts, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('*, connected_accounts!inner(is_connected, access_token, platform)')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching due posts:', fetchError);
      
      // Fallback: fetch without join if the join fails
      const { data: fallbackPosts, error: fallbackError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString());

      if (fallbackError) throw fallbackError;

      const results: any[] = [];

      for (const post of (fallbackPosts || [])) {
        try {
          // Check if the user has a connected account for this platform
          const { data: account } = await supabase
            .from('connected_accounts')
            .select('*')
            .eq('user_id', post.user_id)
            .eq('platform', post.platform)
            .eq('is_connected', true)
            .single();

          if (!account || !account.access_token) {
            // Mark as failed - no connected account
            await supabase
              .from('scheduled_posts')
              .update({
                status: 'failed',
                error_message: `No connected ${post.platform} account found. Please connect your account first.`,
              })
              .eq('id', post.id);

            results.push({ id: post.id, status: 'failed', reason: 'no_account' });
            continue;
          }

          // TODO: Implement actual platform API calls here
          // For now, simulate publishing
          console.log(`Publishing to ${post.platform}: ${post.content.substring(0, 50)}...`);

          // Mark as published
          await supabase
            .from('scheduled_posts')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
            })
            .eq('id', post.id);

          results.push({ id: post.id, status: 'published' });
        } catch (postError) {
          console.error(`Error publishing post ${post.id}:`, postError);
          
          await supabase
            .from('scheduled_posts')
            .update({
              status: 'failed',
              error_message: (postError as Error).message || 'Unknown publishing error',
            })
            .eq('id', post.id);

          results.push({ id: post.id, status: 'failed', error: (postError as Error).message });
        }
      }

      return new Response(JSON.stringify({
        processed: results.length,
        results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ processed: 0, message: 'No posts due for publishing' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Auto-publish error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

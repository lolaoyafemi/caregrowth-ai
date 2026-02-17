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

    // Find all scheduled posts that are due from content_posts (single source of truth)
    const { data: duePosts, error: fetchError } = await supabase
      .from('content_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (fetchError) throw fetchError;

    const results: any[] = [];

    for (const post of (duePosts || [])) {
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
          await supabase
            .from('content_posts')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', post.id);

          results.push({ id: post.id, status: 'failed', reason: 'no_account' });
          continue;
        }

        // TODO: Implement actual platform API calls here
        console.log(`Publishing to ${post.platform}: ${post.post_body.substring(0, 50)}...`);

        await supabase
          .from('content_posts')
          .update({
            status: 'published',
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        results.push({ id: post.id, status: 'published' });
      } catch (postError) {
        console.error(`Error publishing post ${post.id}:`, postError);
        
        await supabase
          .from('content_posts')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
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

  } catch (error) {
    console.error('Auto-publish error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

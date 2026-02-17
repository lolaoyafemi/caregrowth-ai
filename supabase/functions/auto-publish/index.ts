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

    const { data: duePosts, error: fetchError } = await supabase
      .from('content_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (fetchError) throw fetchError;

    const results: any[] = [];

    for (const post of (duePosts || [])) {
      try {
        const { data: account } = await supabase
          .from('connected_accounts')
          .select('*')
          .eq('user_id', post.user_id)
          .eq('platform', post.platform)
          .eq('is_connected', true)
          .maybeSingle();

        if (!account || !account.access_token) {
          await supabase
            .from('content_posts')
            .update({
              status: 'failed',
              error_message: 'No connected account with valid token',
              updated_at: new Date().toISOString(),
            })
            .eq('id', post.id);

          results.push({ id: post.id, status: 'failed', reason: 'no_account' });
          continue;
        }

        let platformPostId: string | null = null;

        switch (post.platform) {
          case 'linkedin': {
            platformPostId = await publishToLinkedIn(account, post);
            break;
          }
          default: {
            // Placeholder for other platforms
            console.log(`Publishing to ${post.platform}: ${post.post_body.substring(0, 50)}...`);
            break;
          }
        }

        await supabase
          .from('content_posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            platform_post_id: platformPostId,
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        results.push({ id: post.id, status: 'published', platform_post_id: platformPostId });
      } catch (postError) {
        console.error(`Error publishing post ${post.id}:`, postError);

        await supabase
          .from('content_posts')
          .update({
            status: 'failed',
            error_message: (postError as Error).message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        results.push({ id: post.id, status: 'failed', error: (postError as Error).message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
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

async function publishToLinkedIn(account: any, post: any): Promise<string | null> {
  const personUrn = `urn:li:person:${account.platform_account_id}`;

  // Build the share content
  const shareBody: any = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: post.post_body },
        shareMediaCategory: post.image_url ? 'IMAGE' : 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  // If there's an image, we need to upload it first
  if (post.image_url) {
    try {
      // Register upload
      const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: personUrn,
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            }],
          },
        }),
      });

      if (registerRes.ok) {
        const registerData = await registerRes.json();
        const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
        const asset = registerData.value?.asset;

        if (uploadUrl && asset) {
          // Download image
          const imageRes = await fetch(post.image_url);
          const imageBlob = await imageRes.blob();

          // Upload to LinkedIn
          await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              'Content-Type': 'image/png',
            },
            body: imageBlob,
          });

          shareBody.specificContent['com.linkedin.ugc.ShareContent'].media = [{
            status: 'READY',
            media: asset,
          }];
        }
      }
    } catch (imgErr) {
      console.error('Image upload to LinkedIn failed, posting text only:', imgErr);
      shareBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'NONE';
    }
  }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(shareBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LinkedIn API error (${res.status}): ${errText}`);
  }

  const postId = res.headers.get('x-restli-id') || res.headers.get('X-RestLi-Id');
  return postId;
}

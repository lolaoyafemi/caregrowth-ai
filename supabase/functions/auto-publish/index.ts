import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID')!;
const LINKEDIN_CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET')!;
const X_CLIENT_ID = Deno.env.get('X_CLIENT_ID') || '';
const X_CLIENT_SECRET = Deno.env.get('X_CLIENT_SECRET') || '';
const X_PUBLISHING_ENABLED = Deno.env.get('X_PUBLISHING_ENABLED') === 'true';

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
        // Check X publishing gate early
        if (post.platform === 'x' && !X_PUBLISHING_ENABLED) {
          await supabase
            .from('content_posts')
            .update({
              status: 'skipped',
              error_message: 'X publishing disabled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', post.id);
          results.push({ id: post.id, status: 'skipped', reason: 'X disabled' });
          continue;
        }

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

        const freshAccount = await ensureFreshToken(supabase, account);
        let platformPostId: string | null = null;

        switch (post.platform) {
          case 'linkedin':
            platformPostId = await publishToLinkedIn(freshAccount, post);
            break;
          case 'x':
            platformPostId = await publishToX(freshAccount, post);
            break;
          default:
            console.log(`Publishing to ${post.platform}: ${post.post_body.substring(0, 50)}...`);
            break;
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

async function ensureFreshToken(supabase: any, account: any): Promise<any> {
  if (!account.token_expires_at || !account.refresh_token) {
    return account;
  }

  const expiresAt = new Date(account.token_expires_at).getTime();
  const bufferMs = 5 * 60 * 1000;

  if (Date.now() < expiresAt - bufferMs) {
    return account;
  }

  console.log(`Token expired for account ${account.id} (${account.platform}), refreshing...`);

  let newAccessToken: string;
  let newRefreshToken: string;
  let newExpiresIn: number;

  if (account.platform === 'linkedin') {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('LinkedIn token refresh failed:', errText);
      throw new Error(`Token refresh failed: ${errText}`);
    }

    const tokenData = await tokenRes.json();
    newAccessToken = tokenData.access_token;
    newExpiresIn = tokenData.expires_in || 3600;
    newRefreshToken = tokenData.refresh_token || account.refresh_token;
  } else if (account.platform === 'x') {
    const basicAuth = btoa(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`);
    const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('X token refresh failed:', errText);
      throw new Error(`X token refresh failed: ${errText}`);
    }

    const tokenData = await tokenRes.json();
    newAccessToken = tokenData.access_token;
    newExpiresIn = tokenData.expires_in || 7200;
    newRefreshToken = tokenData.refresh_token || account.refresh_token;
  } else {
    return account;
  }

  const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000).toISOString();

  await supabase
    .from('connected_accounts')
    .update({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_expires_at: newExpiresAt,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id);

  console.log(`Token refreshed successfully for account ${account.id}`);

  return {
    ...account,
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token_expires_at: newExpiresAt,
  };
}

async function publishToX(account: any, post: any): Promise<string | null> {
  const res = await fetch('https://api.x.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: post.post_body }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`X API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.data?.id || null;
}

async function publishToLinkedIn(account: any, post: any): Promise<string | null> {
  const personUrn = `urn:li:person:${account.platform_account_id}`;

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

  if (post.image_url) {
    try {
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
          const imageRes = await fetch(post.image_url);
          const imageBlob = await imageRes.blob();

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

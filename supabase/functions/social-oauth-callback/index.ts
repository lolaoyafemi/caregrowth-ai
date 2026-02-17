import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID')!;
const LINKEDIN_CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PROJECT_URL = Deno.env.get('PROJECT_URL') || 'https://caregrowth.lovable.app';

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/social-oauth-callback`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error from provider:', error);
      return redirectToApp(`/content-calendar?oauth_error=${encodeURIComponent(error)}`);
    }

    if (!code || !stateParam) {
      return redirectToApp('/content-calendar?oauth_error=missing_code');
    }

    let state: { platform: string; user_id: string };
    try {
      state = JSON.parse(atob(decodeURIComponent(stateParam)));
    } catch {
      return redirectToApp('/content-calendar?oauth_error=invalid_state');
    }

    const { platform, user_id } = state;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (platform) {
      case 'linkedin': {
        // Exchange code for tokens
        const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: LINKEDIN_CLIENT_ID,
            client_secret: LINKEDIN_CLIENT_SECRET,
          }),
        });

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          console.error('LinkedIn token exchange failed:', errText);
          return redirectToApp('/content-calendar?oauth_error=token_exchange_failed');
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        const expiresIn = tokenData.expires_in || 3600;
        const refreshToken = tokenData.refresh_token || null;

        // Get user profile info
        const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        let accountName = 'LinkedIn Account';
        let platformAccountId = '';
        if (profileRes.ok) {
          const profile = await profileRes.json();
          accountName = profile.name || profile.given_name || 'LinkedIn Account';
          platformAccountId = profile.sub || '';
        }

        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        // Upsert connected account
        const { data: existing } = await supabase
          .from('connected_accounts')
          .select('id')
          .eq('user_id', user_id)
          .eq('platform', 'linkedin')
          .maybeSingle();

        if (existing) {
          await supabase
            .from('connected_accounts')
            .update({
              access_token: accessToken,
              refresh_token: refreshToken,
              token_expires_at: expiresAt,
              is_connected: true,
              connected_at: new Date().toISOString(),
              account_name: accountName,
              platform_account_id: platformAccountId,
              platform_account_name: accountName,
              error_message: null,
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('connected_accounts')
            .insert({
              user_id,
              platform: 'linkedin',
              access_token: accessToken,
              refresh_token: refreshToken,
              token_expires_at: expiresAt,
              is_connected: true,
              connected_at: new Date().toISOString(),
              account_name: accountName,
              platform_account_id: platformAccountId,
              platform_account_name: accountName,
            });
        }

        break;
      }
      default:
        return redirectToApp(`/content-calendar?oauth_error=unsupported_platform`);
    }

    return redirectToApp('/content-calendar?oauth_success=' + platform);
  } catch (error) {
    console.error('social-oauth-callback error:', error);
    return redirectToApp('/content-calendar?oauth_error=server_error');
  }
});

function redirectToApp(path: string): Response {
  const PROJECT_URL_RESOLVED = Deno.env.get('PROJECT_URL') || 'https://caregrowth.lovable.app';
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${PROJECT_URL_RESOLVED}${path}`,
      ...corsHeaders,
    },
  });
}

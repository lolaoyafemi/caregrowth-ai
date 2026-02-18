import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID')!;
const LINKEDIN_CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET')!;
const X_CLIENT_ID = Deno.env.get('X_CLIENT_ID')!;
const X_CLIENT_SECRET = Deno.env.get('X_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    let state: { platform: string; user_id: string; code_verifier?: string };
    try {
      state = JSON.parse(atob(decodeURIComponent(stateParam)));
    } catch {
      return redirectToApp('/content-calendar?oauth_error=invalid_state');
    }

    const { platform, user_id } = state;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (platform) {
      case 'linkedin': {
        await handleLinkedIn(supabase, code, user_id);
        break;
      }
      case 'x': {
        await handleX(supabase, code, user_id, state.code_verifier || '');
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

async function handleLinkedIn(supabase: any, code: string, user_id: string) {
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
    throw new Error('token_exchange_failed');
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in || 3600;
  const refreshToken = tokenData.refresh_token || null;

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

  await upsertAccount(supabase, user_id, 'linkedin', {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_at: expiresAt,
    account_name: accountName,
    platform_account_id: platformAccountId,
    platform_account_name: accountName,
  });
}

async function handleX(supabase: any, code: string, user_id: string, codeVerifier: string) {
  // X OAuth 2.0 token exchange with PKCE
  const basicAuth = btoa(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`);

  const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error('X token exchange failed:', errText);
    throw new Error('token_exchange_failed');
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || null;
  const expiresIn = tokenData.expires_in || 7200;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Fetch user info
  const userRes = await fetch('https://api.x.com/2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let accountName = 'X Account';
  let platformAccountId = '';
  if (userRes.ok) {
    const userData = await userRes.json();
    accountName = userData.data?.name || userData.data?.username || 'X Account';
    platformAccountId = userData.data?.id || '';
  }

  await upsertAccount(supabase, user_id, 'x', {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_at: expiresAt,
    account_name: `@${accountName}`,
    platform_account_id: platformAccountId,
    platform_account_name: accountName,
  });
}

async function upsertAccount(supabase: any, userId: string, platform: string, data: any) {
  const { data: existing } = await supabase
    .from('connected_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('platform', platform)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('connected_accounts')
      .update({
        ...data,
        is_connected: true,
        connected_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('connected_accounts')
      .insert({
        user_id: userId,
        platform,
        ...data,
        is_connected: true,
        connected_at: new Date().toISOString(),
      });
  }
}

function redirectToApp(path: string): Response {
  const PROJECT_URL = Deno.env.get('PROJECT_URL') || 'https://caregrowth.lovable.app';
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${PROJECT_URL}${path}`,
      ...corsHeaders,
    },
  });
}

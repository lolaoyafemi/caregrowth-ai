import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID')!;
const LINKEDIN_CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET')!;
const X_CLIENT_ID = Deno.env.get('X_CLIENT_ID')!;
const X_CLIENT_SECRET = Deno.env.get('X_CLIENT_SECRET')!;
const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID')!;
const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET')!;
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

    // Verify subscription status before saving connection
    const isPaidOrAdmin = await checkPaidOrAdmin(supabase, user_id);
    if (!isPaidOrAdmin) {
      return redirectToApp('/content-calendar?oauth_error=subscription_required');
    }

    switch (platform) {
      case 'linkedin': {
        await handleLinkedIn(supabase, code, user_id);
        break;
      }
      case 'x': {
        await handleX(supabase, code, user_id, state.code_verifier || '');
        break;
      }
      case 'facebook': {
        await handleFacebook(supabase, code, user_id);
        return redirectToApp('/content-calendar?facebook_select_page=1');
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

async function handleFacebook(supabase: any, code: string, user_id: string) {
  // 1) Exchange code for short-lived user token
  const shortTokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
  shortTokenUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  shortTokenUrl.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
  shortTokenUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  shortTokenUrl.searchParams.set('code', code);

  const shortRes = await fetch(shortTokenUrl);
  if (!shortRes.ok) {
    console.error('FB short token exchange failed:', await shortRes.text());
    throw new Error('fb_token_exchange_failed');
  }
  const shortData = await shortRes.json();
  const shortToken = shortData.access_token;

  // 2) Exchange short-lived for long-lived user token (~60 days)
  const longTokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
  longTokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
  longTokenUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  longTokenUrl.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
  longTokenUrl.searchParams.set('fb_exchange_token', shortToken);

  const longRes = await fetch(longTokenUrl);
  if (!longRes.ok) {
    console.error('FB long token exchange failed:', await longRes.text());
    throw new Error('fb_long_token_failed');
  }
  const longData = await longRes.json();
  const longToken = longData.access_token;
  const expiresIn = longData.expires_in || 60 * 24 * 60 * 60;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Store user-token-only record (page selection happens after).
  // refresh_token holds the long-lived USER token; access_token will hold the PAGE token after selection.
  await upsertAccount(supabase, user_id, 'facebook', {
    access_token: null,
    refresh_token: longToken,
    token_expires_at: expiresAt,
    account_name: 'Facebook (select a page)',
    platform_account_id: null,
    platform_account_name: null,
    is_connected_override: false,
  });
}

async function upsertAccount(supabase: any, userId: string, platform: string, data: any) {
  const { is_connected_override, ...rest } = data;
  const isConnected = is_connected_override === false ? false : true;

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
        ...rest,
        is_connected: isConnected,
        connected_at: isConnected ? new Date().toISOString() : null,
        error_message: null,
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('connected_accounts')
      .insert({
        user_id: userId,
        platform,
        ...rest,
        is_connected: isConnected,
        connected_at: isConnected ? new Date().toISOString() : null,
      });
  }
}

async function checkPaidOrAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'agency_admin') {
    return true;
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  return !!subscription;
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

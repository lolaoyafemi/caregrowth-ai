import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    
    if (error) {
      console.error('OAuth error:', error);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': '/?google_error=' + encodeURIComponent(error),
        },
      });
    }

    if (!code) {
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': '/?error=no_code',
        },
      });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${url.origin}/oauth/google/callback`,
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Token exchange error:', tokens);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': '/?error=token_exchange_failed',
        },
      });
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();
    
    if (!userInfoResponse.ok) {
      console.error('User info error:', userInfo);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': '/?error=user_info_failed',
        },
      });
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store connection in Supabase (we'll need to handle auth context)
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // For now, redirect back with success and let the frontend handle storage
    const redirectUrl = new URL('/');
    redirectUrl.searchParams.set('google_success', 'true');
    redirectUrl.searchParams.set('access_token', tokens.access_token);
    redirectUrl.searchParams.set('refresh_token', tokens.refresh_token || '');
    redirectUrl.searchParams.set('expires_at', expiresAt.toISOString());
    redirectUrl.searchParams.set('google_user_id', userInfo.id);
    redirectUrl.searchParams.set('google_email', userInfo.email);
    redirectUrl.searchParams.set('scope', tokens.scope || '');

    console.log('OAuth successful, redirecting with tokens');

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl.toString(),
      },
    });

  } catch (error) {
    console.error('Error in oauth callback:', error);
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': '/?error=callback_failed',
      },
    });
  }
});
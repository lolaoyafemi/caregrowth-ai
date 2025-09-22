import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.6';

// Load environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const stateEncoded = searchParams.get('state');

    if (!code || !stateEncoded) {
      throw new Error('Missing code or state');
    }

    // Decode the state to get returnTo URL
    const state = JSON.parse(atob(stateEncoded));
    const returnTo = state.returnTo || '/';

    // Exchange code for access_token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: 'https://ljtikbkilyeyuexzhaqd.supabase.co/functions/v1/oauth_google_callback',
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      throw new Error('Failed to exchange code for token');
    }

    // Get user info from access token
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userInfo = await userInfoRes.json();

    if (!userInfo.email) {
      throw new Error('Failed to retrieve user info');
    }

    // Look up the user in Supabase Auth using their email
    const { data: user, error: userError } = await supabase
      .from('users') // Replace with your user table if custom
      .select('*')
      .eq('email', userInfo.email)
      .single();

    if (userError || !user) {
      throw new Error('User not found in Supabase');
    }

    // Store token in drive_tokens table
    await supabase.from('drive_tokens').upsert({
      user_id: user.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
    });

    // Redirect back to original page
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: returnTo,
      },
    });
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
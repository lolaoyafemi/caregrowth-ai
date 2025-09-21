import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    // Validate authenticated user
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Fetch user's Google connection
    const { data: connection, error: connErr } = await supabase
      .from('google_connections')
      .select('id, refresh_token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (connErr || !connection) {
      return json({ success: false, error: 'No Google Drive connection found' }, 404);
    }

    const refresh_token = connection.refresh_token;
    if (!refresh_token) {
      return json({ success: false, error: 'Missing refresh token. Please reconnect Google Drive.' }, 400);
    }

    // Exchange refresh token for new access token
    const client_id = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const client_secret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
    if (!client_id || !client_secret) {
      return json({ success: false, error: 'Google OAuth secrets not configured' }, 500);
    }

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id,
        client_secret,
        refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      const msg = tokenJson?.error_description || tokenJson?.error || 'Failed to refresh access token';
      return json({ success: false, error: msg }, 401);
    }

    const access_token: string = tokenJson.access_token;
    const expires_in: number = tokenJson.expires_in;
    const new_refresh_token: string | undefined = tokenJson.refresh_token;

    // Persist updated tokens
    const updates: Record<string, any> = {
      access_token,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    };
    if (new_refresh_token) updates.refresh_token = new_refresh_token;

    const { error: updateErr } = await supabase
      .from('google_connections')
      .update(updates)
      .eq('id', connection.id);

    if (updateErr) {
      console.warn('Token refreshed but failed to persist:', updateErr);
    }

    return json({ success: true, access_token, expires_in });
  } catch (e) {
    console.error('google-drive-refresh-token error', e);
    return json({ success: false, error: 'Internal server error' }, 500);
  }
});

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
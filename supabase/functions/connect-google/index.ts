import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID not configured');
    }

    const url = new URL(req.url);
    const redirectUri = `https://ljtikbkilyeyuexzhaqd.supabase.co/functions/v1/oauth-google-callback`;
    
    // Normalize client id to avoid leading/trailing spaces that break OAuth
    const clientId = GOOGLE_CLIENT_ID.trim();

    // Derive return URL (prefer the page the user clicked from)
    const referer = req.headers.get('referer') || '';
    const origin = req.headers.get('origin') || '';
    const returnTo = referer || origin || '';
    const state = btoa(JSON.stringify({ returnTo, ts: Date.now() }));

    // Construct Google OAuth URL
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly profile email');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');
    googleAuthUrl.searchParams.set('include_granted_scopes', 'true');
    googleAuthUrl.searchParams.set('state', state);

    console.log('Redirecting to Google OAuth:', googleAuthUrl.toString());

    // Redirect to Google OAuth
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': googleAuthUrl.toString(),
      },
    });

  } catch (error) {
    console.error('Error in connect-google:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
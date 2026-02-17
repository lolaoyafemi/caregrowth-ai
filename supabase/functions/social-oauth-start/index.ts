import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/social-oauth-callback`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform, user_id } = await req.json();

    if (!platform || !user_id) {
      return new Response(JSON.stringify({ error: 'platform and user_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let authUrl: string;
    // state encodes platform + user_id so callback knows who initiated
    const state = btoa(JSON.stringify({ platform, user_id }));

    switch (platform) {
      case 'linkedin': {
        const scopes = 'openid profile w_member_social';
        authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}`;
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Platform "${platform}" not yet supported` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ auth_url: authUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('social-oauth-start error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

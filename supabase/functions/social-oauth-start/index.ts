import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID')!;
const X_CLIENT_ID = Deno.env.get('X_CLIENT_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/social-oauth-callback`;

// Simple base64url encoding for PKCE
function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generatePKCE() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64url(digest);
  return { verifier, challenge };
}

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

    switch (platform) {
      case 'linkedin': {
        const state = btoa(JSON.stringify({ platform, user_id }));
        const scopes = 'openid profile email w_member_social';
        authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}`;
        break;
      }
      case 'x': {
        const { verifier, challenge } = await generatePKCE();
        // Encode verifier in state so callback can use it
        const state = btoa(JSON.stringify({ platform, user_id, code_verifier: verifier }));
        const scopes = 'tweet.write users.read offline.access';
        authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(X_CLIENT_ID)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`;
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

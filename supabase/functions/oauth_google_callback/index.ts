import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
        client_id: GOOGLE_CLIENT_ID?.trim() || '',
        client_secret: GOOGLE_CLIENT_SECRET?.trim() || '',
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://ljtikbkilyeyuexzhaqd.supabase.co/functions/v1/oauth_google_callback',
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

    // Store connection in Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Try to link tokens to an existing app user by email
    let linkedUserId: string | null = null;
    let agencyId: string | null = null;

    try {
      // Look for user by email in user_profiles
      const { data: profileByEmail } = await supabase
        .from('user_profiles')
        .select('user_id, email')
        .eq('email', userInfo.email)
        .maybeSingle();

      if (profileByEmail?.user_id) {
        linkedUserId = profileByEmail.user_id as string;
      } else {
        // Fallback to users table
        const { data: userByEmail } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', userInfo.email)
          .maybeSingle();
        if (userByEmail?.id) {
          linkedUserId = userByEmail.id as string;
        }
      }

      if (linkedUserId) {
        // Ensure agency exists for this user
        const { data: existingAgency } = await supabase
          .from('agencies')
          .select('id')
          .eq('admin_user_id', linkedUserId)
          .maybeSingle();

        if (existingAgency?.id) {
          agencyId = existingAgency.id as string;
        } else {
          const agencyName = (userInfo.email || 'agency').split('@')[0] + ' Agency';
          const { data: createdAgency, error: agencyCreateError } = await supabase
            .from('agencies')
            .insert({ name: agencyName, admin_user_id: linkedUserId })
            .select('id')
            .maybeSingle();
          if (agencyCreateError) {
            console.error('Failed creating agency:', agencyCreateError.message);
          } else if (createdAgency?.id) {
            agencyId = createdAgency.id as string;
          }
        }

        // Upsert google connection
        if (agencyId) {
          const { data: existingConn } = await supabase
            .from('google_connections')
            .select('id')
            .eq('user_id', linkedUserId)
            .maybeSingle();

          if (existingConn?.id) {
            const { error: updateErr } = await supabase
              .from('google_connections')
              .update({
                agency_id: agencyId,
                google_user_id: userInfo.id,
                google_email: userInfo.email,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || '',
                expires_at: expiresAt.toISOString(),
                scope: tokens.scope || '',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingConn.id);
            if (updateErr) console.error('Failed updating connection:', updateErr.message);
          } else {
            const { error: insertErr } = await supabase
              .from('google_connections')
              .insert({
                agency_id: agencyId,
                user_id: linkedUserId,
                google_user_id: userInfo.id,
                google_email: userInfo.email,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || '',
                expires_at: expiresAt.toISOString(),
                scope: tokens.scope || '',
              });
            if (insertErr) console.error('Failed inserting connection:', insertErr.message);
          }
        }
      } else {
        console.warn('No matching user found for Google email:', userInfo.email);
      }
    } catch (persistErr) {
      console.error('Error persisting Google connection:', persistErr);
    }

    // Handle state parameter for return URL
    const state = url.searchParams.get('state');
    let returnTo = '';
    if (state) {
      try {
        const decoded = JSON.parse(atob(state));
        if (decoded?.returnTo && typeof decoded.returnTo === 'string') {
          returnTo = decoded.returnTo;
        }
      } catch (_) {
        // ignore state parse errors
      }
    }

    const fallback = 'https://ljtikbkilyeyuexzhaqd.supabase.co/';
    const target = returnTo && /^https?:\/\//i.test(returnTo) ? returnTo : fallback;
    const redirectUrl = new URL(target);

    redirectUrl.searchParams.set('google_success', 'true');
    redirectUrl.searchParams.set('access_token', tokens.access_token);
    redirectUrl.searchParams.set('refresh_token', tokens.refresh_token || '');
    redirectUrl.searchParams.set('expires_at', expiresAt.toISOString());
    redirectUrl.searchParams.set('google_user_id', userInfo.id);
    redirectUrl.searchParams.set('google_email', userInfo.email);
    redirectUrl.searchParams.set('scope', tokens.scope || '');

    console.log('OAuth successful, redirecting to', redirectUrl.origin);

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
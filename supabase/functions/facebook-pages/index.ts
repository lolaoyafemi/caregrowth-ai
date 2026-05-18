import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID')!;
const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET')!;

const GRAPH = 'https://graph.facebook.com/v18.0';

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims.sub as string;
}

async function getFbRecord(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'facebook')
    .maybeSingle();
  if (error) throw error;
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = await getUserId(req);
    if (!userId) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    const record = await getFbRecord(supabase, userId);
    if (!record) return json({ error: 'No Facebook connection found. Please connect first.' }, 404);

    switch (action) {
      case 'list_pages': {
        const userToken = record.refresh_token;
        if (!userToken) return json({ error: 'Missing user token, reconnect required' }, 400);
        const res = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token,picture{url}&access_token=${userToken}`);
        const data = await res.json();
        if (!res.ok) {
          console.error('FB list_pages error:', data);
          return json({ error: data.error?.message || 'Failed to fetch pages' }, 400);
        }
        const pages = (data.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          access_token: p.access_token,
          picture: p.picture?.data?.url || null,
        }));
        return json({ pages });
      }

      case 'select_page': {
        const { page_id, page_name, page_access_token, picture } = body;
        if (!page_id || !page_access_token) return json({ error: 'page_id and page_access_token required' }, 400);

        // Page tokens derived from a long-lived user token are typically long-lived (no expiry).
        await supabase
          .from('connected_accounts')
          .update({
            access_token: page_access_token,
            platform_account_id: page_id,
            platform_account_name: page_name,
            account_name: page_name,
            is_connected: true,
            connected_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', record.id);

        return json({ success: true, page_id, page_name, picture });
      }

      case 'test_post': {
        if (!record.access_token || !record.platform_account_id) {
          return json({ error: 'No page selected' }, 400);
        }
        const message = body.message || 'Test post from CareGrowth Assistant';
        const res = await fetch(`${GRAPH}/${record.platform_account_id}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ message, access_token: record.access_token }),
        });
        const data = await res.json();
        if (!res.ok) {
          await handleApiError(supabase, record.id, data);
          return json({ error: data.error?.message || 'Post failed' }, 400);
        }
        return json({ success: true, post_id: data.id });
      }

      case 'read_comments': {
        const post_id = body.post_id;
        if (!post_id) return json({ error: 'post_id required' }, 400);
        const res = await fetch(`${GRAPH}/${post_id}/comments?access_token=${record.access_token}`);
        const data = await res.json();
        if (!res.ok) return json({ error: data.error?.message || 'Failed to read comments' }, 400);
        return json({ comments: data.data || [] });
      }

      case 'reply_comment': {
        const { comment_id, message } = body;
        if (!comment_id || !message) return json({ error: 'comment_id and message required' }, 400);
        const res = await fetch(`${GRAPH}/${comment_id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ message, access_token: record.access_token! }),
        });
        const data = await res.json();
        if (!res.ok) return json({ error: data.error?.message || 'Reply failed' }, 400);
        return json({ success: true, reply_id: data.id });
      }

      case 'refresh_token': {
        // Refresh the long-lived user token if near expiry
        if (!record.refresh_token) return json({ error: 'No user token' }, 400);
        const url = new URL(`${GRAPH}/oauth/access_token`);
        url.searchParams.set('grant_type', 'fb_exchange_token');
        url.searchParams.set('client_id', FACEBOOK_APP_ID);
        url.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
        url.searchParams.set('fb_exchange_token', record.refresh_token);
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          await supabase.from('connected_accounts').update({
            is_connected: false,
            error_message: 'Token expired — please reconnect',
          }).eq('id', record.id);
          return json({ error: 'Token refresh failed, reconnect required' }, 400);
        }
        const expiresAt = new Date(Date.now() + (data.expires_in || 60 * 24 * 60 * 60) * 1000).toISOString();
        await supabase.from('connected_accounts').update({
          refresh_token: data.access_token,
          token_expires_at: expiresAt,
        }).eq('id', record.id);
        return json({ success: true, token_expires_at: expiresAt });
      }

      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    console.error('facebook-pages error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});

async function handleApiError(supabase: any, recordId: string, data: any) {
  const code = data?.error?.code;
  // 190 = invalid token, 200 = permissions error
  if (code === 190 || code === 102) {
    await supabase.from('connected_accounts').update({
      is_connected: false,
      error_message: 'Token invalid — please reconnect',
    }).eq('id', recordId);
  } else if (code === 200 || code === 10) {
    await supabase.from('connected_accounts').update({
      error_message: 'Permission error — please reconnect with required permissions',
    }).eq('id', recordId);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

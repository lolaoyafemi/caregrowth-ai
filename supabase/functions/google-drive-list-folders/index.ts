import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

interface GoogleDriveFile { id: string; name: string; }

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('No Authorization header');
      return json({ error: 'Unauthorized' }, 401);
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      console.warn('Invalid session');
      return json({ error: 'Invalid session' }, 401);
    }

    const body = await safeJson(req);
    console.log(`google-drive-list-folders: user=${user.id} scope=${body?.scope || 'root'}`);

    // Fetch connection (tokens) for user
    const { data: connection, error: connErr } = await supabase
      .from('google_connections')
      .select('id, access_token, refresh_token, expires_at, google_email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (connErr || !connection) {
      console.error('No Google connection for user', user.id);
      return json({ error: 'No Google Drive connection found. Please connect first.' }, 404);
    }

    let accessToken = connection.access_token;
    const expiresAt = new Date(connection.expires_at);

    if (!accessToken || expiresAt <= new Date()) {
      console.log('Access token expired, refreshing... [token=***masked***]');
      try {
        const refreshed = await refreshAccessToken(connection.refresh_token);
        accessToken = refreshed.access_token;

        await supabase
          .from('google_connections')
          .update({
            access_token: refreshed.access_token,
            expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id);
      } catch (e) {
        console.error('Token refresh failed');
        return json({ error: 'Failed to refresh Google Drive access. Please reconnect.' }, 401);
      }
    }

    // List top-level folders under My Drive root with Shared Drives support
    const baseParams = {
      fields: "files(id,name)",
      pageSize: '100',
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
      spaces: 'drive',
    } as const;

    // First attempt: only top-level folders under My Drive (root)
    const rootParams = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false",
      ...baseParams,
    } as any);

    let driveRes = await fetch(`${GOOGLE_DRIVE_FILES_URL}?${rootParams}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // If the root query fails with auth/config issues, surface the right message
    if (!driveRes.ok) {
      const status = driveRes.status;
      const text = await driveRes.text();
      console.error(`Drive list folders error on root query (${status}) body=${text?.slice(0,200)}`);
      if (status === 401) return json({ error: 'Google session expired. Please reconnect.' }, 401);
      if (status === 403) return json({ error: 'Google Drive API disabled or insufficient permissions. Enable drive.googleapis.com and ensure drive.readonly scope.' }, 403);
      // For other errors, attempt a broader fallback query below
    }

    let files: GoogleDriveFile[] = [];
    if (driveRes.ok) {
      const rootJson = await driveRes.json();
      files = rootJson?.files || [];
    }

    // Fallback: if no folders found at My Drive root, try listing all visible folders
    if (!files || files.length === 0) {
      console.log('No folders at My Drive root. Trying fallback: all visible folders.');
      const fallbackParams = new URLSearchParams({
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
        ...baseParams,
      } as any);
      const fallbackRes = await fetch(`${GOOGLE_DRIVE_FILES_URL}?${fallbackParams}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!fallbackRes.ok) {
        const status = fallbackRes.status;
        const text = await fallbackRes.text();
        console.error(`Drive list folders error on fallback (${status}) body=${text?.slice(0,200)}`);
        if (status === 401) return json({ error: 'Google session expired. Please reconnect.' }, 401);
        if (status === 403) return json({ error: 'Google Drive API disabled or insufficient permissions. Enable drive.googleapis.com and ensure drive.readonly scope.' }, 403);
        return json({ error: 'Failed to fetch Google Drive folders' }, 500);
      }

      const fbJson = await fallbackRes.json();
      files = fbJson?.files || [];
    }

    console.log(`Returning ${files.length} folders`);
    return json({ success: true, folders: files }, 200);
  } catch (e) {
    console.error('Unhandled error in google-drive-list-folders', e);
    return json({ error: 'Internal server error' }, 500);
  }
});

async function refreshAccessToken(refresh_token: string): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token,
      grant_type: 'refresh_token'
    }),
  });
  if (!res.ok) throw new Error('Failed token refresh');
  return await res.json();
}

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function safeJson(req: Request) {
  try { return await req.json(); } catch { return {}; }
}
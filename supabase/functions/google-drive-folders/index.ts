import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, folderId, selectedFolderId } = await req.json();

    // Get user's Google connection
    const { data: connection, error: connectionError } = await supabase
      .from('google_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      return new Response(JSON.stringify({ error: 'No Google Drive connection found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if token is expired and refresh if needed
    let accessToken = connection.access_token;
    if (new Date(connection.expires_at) <= new Date()) {
      // Refresh token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshResponse.json();
      if (!refreshResponse.ok) {
        return new Response(JSON.stringify({ error: 'Token refresh failed', reconnect_required: true }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      accessToken = refreshData.access_token;
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

      // Update connection with new token
      await supabase
        .from('google_connections')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', connection.id);
    }

    if (action === 'listFolders') {
      // List folders from Google Drive
      const query = folderId 
        ? `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
        : `mimeType='application/vnd.google-apps.folder' and trashed=false`;

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,parents)&pageSize=100`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        return new Response(JSON.stringify({ error: 'Failed to fetch folders', details: data }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ folders: data.files }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'selectFolder') {
      // Update selected folder in connection
      const { error: updateError } = await supabase
        .from('google_connections')
        .update({
          selected_folder_id: selectedFolderId,
          selected_folder_name: (req.body as any)?.folderName || 'Selected Folder',
        })
        .eq('id', connection.id);

      if (updateError) {
        return new Response(JSON.stringify({ error: 'Failed to update selected folder' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in google-drive-folders:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
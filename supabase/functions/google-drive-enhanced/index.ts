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

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  parents?: string[];
  webViewLink?: string;
  modifiedTime?: string;
  createdTime?: string;
}

interface GoogleDriveResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    const { action, folder_id, file_id, page_token, export_format = 'text/plain' } = await req.json();

    console.log(`Processing Google Drive request: ${action} for user ${user.id}`);

    // 1. Get stored Google connection
    const { data: connection, error: connectionError } = await supabase
      .from("google_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connectionError || !connection) {
      console.error('No Google connection found:', connectionError);
      return new Response(
        JSON.stringify({ error: "No Google Drive connection found. Please connect your Google Drive first." }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let { access_token, refresh_token, expires_at } = connection;

    // 2. Refresh token if expired
    if (!access_token || new Date(expires_at) <= new Date()) {
      console.log('Access token expired, refreshing...');
      
      try {
        const refreshed = await refreshAccessToken(refresh_token);
        access_token = refreshed.access_token;

        // Update Supabase with new token + expiry
        await supabase
          .from("google_connections")
          .update({
            access_token: refreshed.access_token,
            expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        console.log('Token refreshed successfully');
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to refresh Google Drive access. Please reconnect your Google Drive.",
            reconnect_required: true 
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // 3. Handle different actions
    switch (action) {
      case 'listFiles': {
        return await handleListFiles(access_token, folder_id, page_token);
      }

      case 'listFolders': {
        return await handleListFolders(access_token, folder_id, page_token);
      }

      case 'getFileContent': {
        if (!file_id) {
          return new Response(
            JSON.stringify({ error: 'File ID is required for getFileContent action' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        return await handleGetFileContent(access_token, file_id, export_format);
      }

      case 'selectFolder': {
        if (!folder_id) {
          return new Response(
            JSON.stringify({ error: 'Folder ID is required for selectFolder action' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        return await handleSelectFolder(supabase, user.id, folder_id, connection.id);
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

  } catch (err) {
    console.error('Google Drive function error:', err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function refreshAccessToken(refresh_token: string): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Token refresh error:', errorText);
    throw new Error("Failed to refresh Google access token");
  }

  return (await res.json()) as TokenResponse;
}

async function handleListFiles(accessToken: string, folderId?: string, pageToken?: string): Promise<Response> {
  try {
    let query = "trashed=false";
    
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const params = new URLSearchParams({
      q: query,
      fields: "files(id,name,mimeType,size,parents,webViewLink,modifiedTime,createdTime),nextPageToken",
      pageSize: "50"
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const driveRes = await fetch(`${GOOGLE_DRIVE_FILES_URL}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!driveRes.ok) {
      const errorText = await driveRes.text();
      console.error('Drive API error:', errorText);
      throw new Error("Failed to fetch Drive files");
    }

    const files: GoogleDriveResponse = await driveRes.json();
    
    console.log(`Retrieved ${files.files.length} files`);
    
    return new Response(JSON.stringify({ 
      success: true,
      files: files.files,
      nextPageToken: files.nextPageToken
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error listing files:', error);
    return new Response(
      JSON.stringify({ error: `Failed to list files: ${error.message}` }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleListFolders(accessToken: string, parentFolderId?: string, pageToken?: string): Promise<Response> {
  try {
    let query = "mimeType='application/vnd.google-apps.folder' and trashed=false";
    
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`;
    }

    const params = new URLSearchParams({
      q: query,
      fields: "files(id,name,parents,modifiedTime),nextPageToken",
      pageSize: "100"
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const driveRes = await fetch(`${GOOGLE_DRIVE_FILES_URL}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!driveRes.ok) {
      const errorText = await driveRes.text();
      console.error('Drive API error:', errorText);
      throw new Error("Failed to fetch Drive folders");
    }

    const folders: GoogleDriveResponse = await driveRes.json();
    
    console.log(`Retrieved ${folders.files.length} folders`);
    
    return new Response(JSON.stringify({ 
      success: true,
      folders: folders.files,
      nextPageToken: folders.nextPageToken
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error listing folders:', error);
    return new Response(
      JSON.stringify({ error: `Failed to list folders: ${error.message}` }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleGetFileContent(accessToken: string, fileId: string, exportFormat: string = 'text/plain'): Promise<Response> {
  try {
    // Get file metadata first
    const metadataRes = await fetch(`${GOOGLE_DRIVE_FILES_URL}/${fileId}?fields=mimeType,name,size`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metadataRes.ok) {
      throw new Error("Failed to get file metadata");
    }

    const metadata = await metadataRes.json();
    let contentUrl = '';

    // Determine how to get the content based on mime type
    if (metadata.mimeType === 'application/vnd.google-apps.document') {
      contentUrl = `${GOOGLE_DRIVE_FILES_URL}/${fileId}/export?mimeType=${encodeURIComponent(exportFormat)}`;
    } else if (metadata.mimeType === 'application/vnd.google-apps.spreadsheet') {
      contentUrl = `${GOOGLE_DRIVE_FILES_URL}/${fileId}/export?mimeType=text/csv`;
    } else if (metadata.mimeType === 'application/vnd.google-apps.presentation') {
      contentUrl = `${GOOGLE_DRIVE_FILES_URL}/${fileId}/export?mimeType=${encodeURIComponent(exportFormat)}`;
    } else {
      // For regular files (PDF, DOCX, TXT, etc.)
      contentUrl = `${GOOGLE_DRIVE_FILES_URL}/${fileId}?alt=media`;
    }

    // Download the content
    const contentRes = await fetch(contentUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!contentRes.ok) {
      const errorText = await contentRes.text();
      console.error('Content download error:', errorText);
      throw new Error("Failed to download file content");
    }

    const content = await contentRes.text();
    
    console.log(`Retrieved content for file: ${metadata.name} (${content.length} chars)`);

    return new Response(JSON.stringify({ 
      success: true,
      content,
      fileName: metadata.name,
      mimeType: metadata.mimeType,
      size: content.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting file content:', error);
    return new Response(
      JSON.stringify({ error: `Failed to get file content: ${error.message}` }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleSelectFolder(supabase: any, userId: string, folderId: string, connectionId: string): Promise<Response> {
  try {
    // Update the selected folder in the connection
    const { error: updateError } = await supabase
      .from('google_connections')
      .update({
        selected_folder_id: folderId,
        selected_folder_name: `Folder ${folderId}`, // You might want to fetch the actual folder name
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (updateError) {
      console.error('Error updating selected folder:', updateError);
      throw new Error('Failed to update selected folder');
    }

    console.log(`Updated selected folder to ${folderId} for user ${userId}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Folder selected successfully',
      selected_folder_id: folderId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error selecting folder:', error);
    return new Response(
      JSON.stringify({ error: `Failed to select folder: ${error.message}` }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
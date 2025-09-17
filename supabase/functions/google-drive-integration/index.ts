import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  parents?: string[];
  webViewLink?: string;
}

interface GoogleDriveResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, fileId, folderId, pageToken, query } = await req.json();
    
    // Get Google credentials from secrets
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');
    
    if (!clientId || !clientSecret || !refreshToken) {
      console.error('Missing Google Drive credentials');
      return new Response(
        JSON.stringify({ error: 'Google Drive API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token using refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to get access token:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Google Drive' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    switch (action) {
      case 'listFiles': {
        // List files in Google Drive
        let url = 'https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,size,parents,webViewLink)&pageSize=50';
        
        // Add query filter if provided
        if (query) {
          url += `&q=${encodeURIComponent(query)}`;
        }
        
        // Add folder filter if provided
        if (folderId) {
          const folderQuery = `'${folderId}' in parents`;
          url += query ? ` and ${folderQuery}` : `&q=${encodeURIComponent(folderQuery)}`;
        }
        
        // Add page token if provided
        if (pageToken) {
          url += `&pageToken=${pageToken}`;
        }

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to list files:', errorText);
          return new Response(
            JSON.stringify({ error: 'Failed to list files from Google Drive' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data: GoogleDriveResponse = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'getFileContent': {
        if (!fileId) {
          return new Response(
            JSON.stringify({ error: 'File ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get file metadata first
        const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,name`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!metadataResponse.ok) {
          const errorText = await metadataResponse.text();
          console.error('Failed to get file metadata:', errorText);
          return new Response(
            JSON.stringify({ error: 'Failed to get file information' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const metadata = await metadataResponse.json();
        let exportUrl = '';

        // Determine export format based on mime type
        if (metadata.mimeType === 'application/vnd.google-apps.document') {
          exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
        } else if (metadata.mimeType === 'application/vnd.google-apps.spreadsheet') {
          exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
        } else if (metadata.mimeType === 'application/vnd.google-apps.presentation') {
          exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
        } else if (metadata.mimeType === 'application/pdf' || 
                   metadata.mimeType === 'text/plain' ||
                   metadata.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // For PDFs and other documents, download the original file
          exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        } else {
          return new Response(
            JSON.stringify({ error: 'Unsupported file type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Download the file content
        const contentResponse = await fetch(exportUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!contentResponse.ok) {
          const errorText = await contentResponse.text();
          console.error('Failed to download file content:', errorText);
          return new Response(
            JSON.stringify({ error: 'Failed to download file content' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const content = await contentResponse.text();
        return new Response(JSON.stringify({ 
          content, 
          fileName: metadata.name,
          mimeType: metadata.mimeType
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'listFolders': {
        // List only folders in Google Drive
        let url = 'https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType)&pageSize=50';
        const folderQuery = "mimeType='application/vnd.google-apps.folder'";
        
        if (folderId) {
          url += `&q=${encodeURIComponent(`'${folderId}' in parents and ${folderQuery}`)}`;
        } else {
          url += `&q=${encodeURIComponent(folderQuery)}`;
        }
        
        if (pageToken) {
          url += `&pageToken=${pageToken}`;
        }

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to list folders:', errorText);
          return new Response(
            JSON.stringify({ error: 'Failed to list folders from Google Drive' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in Google Drive integration:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})